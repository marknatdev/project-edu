"""Aggregate actual command/browser/bundle/preservation evidence. No credential reads."""
from pathlib import Path
import hashlib,json,re,subprocess
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'docs/verification/production-release'
clean=lambda s:re.sub(r'\x1b\[[0-9;]*m','',s)
logs={name:clean((OUT/name).read_text(errors='replace')) for name in ['tests-final.txt','lint-final.txt','typecheck-final.txt','build-final.txt','browser-final.txt']}
test=re.search(r'Test Files\s+(\d+) passed.*?Tests\s+(\d+) passed',logs['tests-final.txt'],re.S)
assert test,'Tests not green'
assert 'Compiled successfully' in logs['build-final.txt'] and 'Generating static pages (17/17)' in logs['build-final.txt']
assert 'error TS' not in logs['typecheck-final.txt']
browser=json.loads((OUT/'browser/summary.json').read_text());assert browser['failed']==0
base=json.loads((OUT/'foundation-baseline.json').read_text())
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
assert head==base['head'];assert not subprocess.check_output(['git','diff','--cached','--name-only'],cwd=ROOT).strip()
pinned=['REVIEW.md','CONTEXT.md','docs/adr/0002-socratic-advisor-first-ai-pedagogy.md','docs/specs/production-release.md','docs/specs/personalized-discovery-and-def01.md','docs/mockups/personalized-discovery.html','docs/mockups/interactive-prototype.html']
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==base['hashes'][p] for p in pinned)
chunks=list((ROOT/'.next/static').rglob('*.js'))
assert any('sb_publishable_foundation_bundle_probe' in f.read_text(errors='ignore') for f in chunks)
assert not any(any(x in f.read_text(errors='ignore') for x in ['FOUNDATION_SERVER_ONLY_SENTINEL_FOR_BUNDLE_AUDIT','FOUNDATION_GUEST_SECRET_SENTINEL_NOT_PRODUCTION']) for f in chunks)
audit={n:json.loads((OUT/n).read_text())['metadata']['vulnerabilities'] for n in ['audit-initial.json','audit-runtime.json']}
summary={'tests':int(test[2]),'test_files':int(test[1]),'browser':browser,'head':head,'index_empty':True,'pinned_files_unchanged':pinned,'public_env_inlined':True,'server_sentinel_bundle_leaks':0,'audit':audit}
(OUT/'foundation-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
report=f'''# Production foundation — implementation and verification

## Result / scope
Code, three additive migrations, server-owned persistence/identity, Google OAuth SSR PKCE and optional account offers are implemented and locally exercised. **Not deployed, not committed/staged/pushed, no remote migration apply. No live OAuth/cloud persistence/AI success claim.** Original REJECTED REVIEW.md remains unchanged. Detached HEAD remains `{head}`; pre-existing mockup, approved specs/ADR/CONTEXT and unrelated DEF01 client work are preserved.

## Actual final command results
| Command | Result | Raw output |
|---|---|---|
| `npm test` | exit0; **{test[2]} tests / {test[1]} files passed** | tests-final.txt |
| `npm run lint` | exit0 | lint-final.txt |
| `npm run typecheck` | exit0 | typecheck-final.txt |
| `npm run build` with synthetic public/server bundle markers | exit0; Next15.5.29; 17/17 static pages | build-final.txt |
| `python docs/verification/production-release/run-browser.py` | exit0; **{browser['passed']}/{browser['checks']} checks** | browser-final.txt, browser/checks.json |
| `git diff --check` | required final driver exits on failure | final-driver.txt |
| Native `npm audit --json` / `npm audit --omit=dev --json` | advisories remain, NOT an audit pass | audit-initial.json, audit-runtime.json |

Build has nonfatal webpack large-string cache warnings. Existing mocked AI failure tests intentionally print gateway warnings. Tests never use real provider credentials. Dependency installs used --ignore-scripts; only pinned SSR/server-only runtime packages and native PostgreSQL/pg test tooling were added; no forced upgrades or blanket lifecycle-script approval.

## Actual vs simulated evidence
- **Actual PostgreSQL17.11** disposable local cluster: migration execution; authenticated/anonymous/service roles; RLS script with rollback; cross-owner isolation; denied client writes/RPC; independent concurrent DB connections and owner-row locks; CAS winner/replays; partial/duplicate/malformed cards; 35-card reservation cap; reset/wipe fences; generic quota5/2; persisted DB process restart; abandoned pending lease recovery/reclaim and rejection of the stale worker; shared rate ceilings across40 owners. Local auth.uid shim is ONLY test setup, not an edit to hosted Auth.
- **Actual SQLite** local development adapter: durable snapshots; legacy conversation compatibility path; owner/generation/wipe behavior; quota survives topic changes; server-clock-injected Bangkok midnight boundary; duplicate claim suppression. Production/serverless tests verify missing cloud config and explicit SQLite overrides fail closed, not fallback.
- **Actual Next handlers and Supabase SSR SDK, simulated provider/REST network:** PKCE S256 and verifier cookie; exchange then verified getUser; callback bad/missing code, cancellation/errors, open redirect refusal; logout/status; expired-token refresh to request AND response; signed guest tamper refusal; verified account ownership; production Strict Guest callback preservation. Full cloud coaching route uses real local Postgres through simulated REST transport. This is NOT hosted PostgREST/JWT or real Google evidence.
- **Actual Chromium {browser['browser']} + production Next, widths360/1280:** optional offers at Save/Export; opt-in identity/Drive disclosure; native Escape/cancel preserves local work; Guest save; truthful unavailable login without data loss; no page overflow/JS exceptions; sanitized same-origin callback cancellation. Screenshots `browser/optional-login-360.png` and `optional-login-1280.png`. Backend deliberately unconfigured; expected503 quota/auth-unavailable is not hidden. No real provider login or export-file delivery claim.
- **Actual bundle/preservation checks:** synthetic public key marker is in built browser JS; synthetic server-role and Guest-secret markers are absent. No existing credential/env files or real keys were read/printed. {len(pinned)} pinned source/doc files match initial hashes; HEAD/index unchanged. See foundation-results.json and preservation-bundle-audit.json.

## Architecture / successor contract
Read **foundation-contracts.md** before integration. `resolvePrincipal(req)` binds verified getUser UUID or HMAC random Guest capability; `foundationForOwner` chooses cloud or local adapter. Production requires cloud and a stable dedicated Guest secret. `FoundationStore` owns snapshots, CAS/reset/receipts, batch reservations/accepted-card ledger, quota/list APIs, atomic wipe/generation and shared admission. No identity names/emails in app rows/prompts; only opaque owner reference.

Three migrations: `202611060001_foundation.sql`, `202611060002_card_quota.sql`, `202611060003_rate_admission.sql`. All tables RLS-enabled, mutations service-role-only, no auth schema edits. Expired pending work releases unused capacity and reclaims with a NEW lease; completed idempotent intents never regenerate. SQL database time controls Bangkok quota and expiry. Conservative coach12/owner/min+60global/min, auth6/Guest-capability/10min+30global/min; global ceiling also bounds capability rotation without IP PII. Successor card model calls must use admission and only generate for claimed:true.

Legacy cards/evaluate/proposal/pivot production endpoints intentionally return503 until their serial successor integrates this authority. This is a protective gate, NOT DEF02–04 repair. Local behavior remains available. Optional Save/Export login offering exists; no automatic Guest import or cloud project sync. **Do not close DEF05 solely from this report**: broader repair acceptance and actual configured login remain downstream.

## Review and corrections
Independent read-only reviews are preserved in foundation-review-initial.md and foundation-review-followup.md. Findings led to bounded/fenced abandoned-lease recovery, shared rate admission, and preservation of Strict Guest capability across cross-site OAuth callbacks. Red regressions and subsequent actual final tests back the fixes. Visual inspection found a primary-button class collision; corrected to a single visible primary variant and checked in the browser.

**Final fresh-context re-review (foundation-review-final.md): APPROVE (foundation scope).** All prior findings confirmed resolved. Two P3s: (1) FIXED — callback rate-limit/backend-failure path now clears the PKCE verifier (red: red-21-callback-verifier-cleanup.txt; green in tests-final.txt), and its tightened test exposed that per-flow/flow-index PKCE verifier cookies written by the installed @supabase/ssr were never cleared on any callback failure path — fixed (red: red-22-flow-verifier-cookies.txt; this self-found fix was not independently re-reviewed); (2) DOCUMENTED for the release owner — a cookieless Guest binds an owner/rate row before the admission check, so model work is globally capped but rows can grow; add edge/WAF limiting plus an empty-Guest-owner sweep (or global check before fresh Guest binding) before public exposure. These scoped reviews are not the final whole-app APPROVED release gate.

## Remaining operator/release gates
Remote MCP read-back for exact project `ppctndzkerwiokjfaklw` showed **empty public tables and migration list**, including after local implementation; no apply was attempted. Final publication owner must re-read, review/apply all three SQL files and verify real two-identity hosted isolation/advisors. `APP_ORIGIN`, server-only service-role key and stable Guest secret require secure Vercel setup. Public publishable-key/ANON compatibility is implemented; actual public keys are not reproduced here.

Google Web client/provider configuration and actual user sign-in/callback/refresh/signout remain PENDING. Exact Google project, redirect and console fields are in foundation-contracts.md. MCP lacks direct provider setup; no auth-internals SQL workaround. No Drive/Calendar scopes. Missing live secrets/providers do not prevent independently tested code delivery, but block a live release claim. App records wipe does not delete/revoke Google/Supabase Auth identity; minimal revocation metadata and provider-managed backups are disclosed.

Native audit counts: full **{audit['audit-initial.json']['total']}** ({audit['audit-initial.json']['moderate']} moderate, {audit['audit-initial.json']['high']} high, {audit['audit-initial.json']['critical']} critical); runtime **{audit['audit-runtime.json']['total']}** ({audit['audit-runtime.json']['moderate']} moderate, {audit['audit-runtime.json']['high']} high). PostCSS dependency advisories affect Next build/runtime dependency tree; current app does not process user-supplied CSS/source maps, but this is not blanket clearance. Vitest/tinypool advisories are test-tool paths (no public test server). **Final release must triage/remediate with minimal tested upgrades**; no automatic major/force fix here. CSP currently permits Next inline scripts/styles and is not a nonce-strict policy; deployed header/cookie/HTTPS verification remains required. No production-readiness or full-app approval is asserted.
'''
(OUT/'foundation.md').write_text(report,encoding='utf8')
print(json.dumps(summary,ensure_ascii=False))
