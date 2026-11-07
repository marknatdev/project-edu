"""Independent review runner. Only evidence/runtime paths change; source is read-only.
Real Chrome/Next/PG17; synthetic Auth/AI; no live-provider verification.
Run: python <this file> wipe|wipe-queued|routing|import|import-save|quota [--skip-build]
Additional negative probes: quota-race, evaluation-wipe, notes-wipe, session-draft.
"""
from pathlib import Path
p = Path(__file__).resolve().parents[1] / 'review-remediation/run-browser.py'
s = p.read_text(encoding='utf-8')
s = s.replace("EVIDENCE=Path(__file__).resolve().parent/args.case", "EVIDENCE=Path(" + repr(str(Path(__file__).resolve().parent)) + ")/args.case")
s = s.replace('remediation-browser-profile', 'independent3-browser-profile').replace('remediation-browser-pg', 'independent3-browser-pg')
extra = (Path(__file__).resolve().parent / 'extra-cases.txt').read_text(encoding='utf-8')
s = s.replace("    else:raise RuntimeError('case not implemented: '+args.case)", extra + "\n    else:raise RuntimeError('case not implemented: '+args.case)")
exec(compile(s, str(p), 'exec'), {'__file__': str(p), '__name__': '__main__'})
