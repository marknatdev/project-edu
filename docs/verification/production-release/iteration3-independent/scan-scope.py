"""Read-only bounded secret-pattern scan of intended publishable text, no matched values logged.
Does not read .env/credential/runtime/browser files. Not an entropy or full-history scanner.
"""
from pathlib import Path
import hashlib,json,re,subprocess
ROOT=Path(__file__).resolve().parents[4]
E=Path(__file__).resolve().parent
scope=json.loads((E/'scope-start.json').read_text())
patterns={
 'private_key':r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
 'google_oauth_secret':r'GOCSPX-[A-Za-z0-9_-]{15,}',
 'google_api_key':r'AIza[A-Za-z0-9_-]{30,}',
 'github_token':r'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})',
 'provider_key':r'\bsk-[A-Za-z0-9_-]{24,}',
 'supabase_secret':r'\bsb_secret_[A-Za-z0-9_-]{20,}',
 'aws_access_id':r'\bAKIA[A-Z0-9]{16}\b',
 'credential_url':r'\b(?:https?|postgres(?:ql)?)://[^\s:/]+:[^\s/@]+@',
 'jwt':r'\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}',
}
findings=[];scanned=[];excluded=[]
rows=scope['files']
# Include selected human-readable evidence only, never runtime logs/diagnostics/browser data.
docs=[ROOT/'docs/verification/production-release/iteration3-remediation.md',ROOT/'docs/verification/production-release/CLOUD-PREFLIGHT.md',ROOT/'docs/verification/production-release/REVIEW.md',ROOT/'docs/verification/personalized-discovery/REPORT.md',ROOT/'docs/verification/personalized-discovery/DEF01-REPORT.md']
paths=[ROOT/r['path'] for r in rows]+[p for p in docs if p.exists()]
for p in paths:
 rel=p.relative_to(ROOT).as_posix()
 if p.name.startswith('.env') or any(s in rel.lower() for s in ['credential','browser-profile']) or p.suffix.lower() in ['.png','.jpg','.zip','.docx','.pdf','.db','.sqlite']:
  excluded.append(rel);continue
 try: text=p.read_text(encoding='utf-8')
 except (UnicodeError,OSError):continue
 scanned.append(rel)
 for name,pattern in patterns.items():
  for match in re.finditer(pattern,text):
   line=text.count('\n',0,match.start())+1
   findings.append({'path':rel,'line':line,'rule':name})
result={'method':'bounded named-key/token/private-key/credential-URL regexes; never prints matches','files_scanned':len(scanned),'findings':findings,'excluded':excluded,'limitations':['No .env/credential/runtime file contents accessed','No entropy detection or exhaustive assurance','Fixtures may legitimately contain synthetic tokens; each match requires classification']}
(E/'secret-scan.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
# Hash original rejected report and historical evidence; no overwrites.
historical=ROOT/'docs/verification/production-release/independent-review'
preserved=[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(historical.rglob('*')) if p.is_file()]
(E/'iteration2-evidence-hashes.json').write_text(json.dumps(preserved,indent=2))
print('preserved iteration2 evidence files:',len(preserved))
