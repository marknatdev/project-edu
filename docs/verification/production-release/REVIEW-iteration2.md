# Independent whole-app production-release review

STATUS: REJECTED
CODE STATUS: REJECTED

**Iteration:** 2 of the whole-app review loop (original M1–M5 review was iteration 1; this is the first review of the expanded production-release working tree).

| Verification lane | Status |
|---|---|
| Application release code | **REJECTED — reproducible privacy, deduplication and topic-routing defects** |
| LIVE DEPLOYMENT | **PENDING / NOT VERIFIED** — no deployment performed by this reviewer |
| GOOGLE OAUTH | **PENDING / NOT VERIFIED LIVE** — local PKCE/error/cookie tests are not interactive Google sign-in |
| AI upstream | **PENDING / NOT VERIFIED LIVE** — browser happy paths explicitly used a mocked upstream; unavailable paths used no AI |
| Hosted Supabase migrations/JWT/RLS | **PENDING / NOT VERIFIED HOSTED** — real disposable local PostgreSQL was tested instead |

**Publication decision:** Do not commit/push/deploy this tree as approved. The pre-created publication successor must stop and block on this REJECTED result. Missing external configuration is a separate live gate; the rejection here is for code defects, not missing credentials.

## Scope and independence

Reviewed `PLAN.md`, the original rejected root `REVIEW.md`, `CONTEXT.md`, design/ADR documents, `docs/specs/production-release.md`, and `docs/specs/personalized-discovery-and-def01.md`. The later specs supersede seed-first Discovery, the old phenomena-only restriction, and the old card allowance wording.

The fixed point is **`880e3a30a62e5fd61791bb3e7bab4025afdc2a30`**. Per the explicit task override, scope is **the current working tree**, not an empty committed three-dot diff: `git diff HEAD --` plus `git ls-files --others --exclude-standard` and reads of new files. There are **48 tracked modified files and 80 new source/test/SQL files**. `independent-review/scope-manifest.json` records reviewed source hashes. Two parallel read-only subreviews covered Standards and Spec; the parent reviewer independently ran the suite, browser flows, and additional reproductions.

No application source/test/SQL files were edited; no commit, push, hosted migration or deployment was performed. Only review evidence was written, alongside disposable local runtime/build outputs. The original root review was preserved: SHA-256 `387653b158f17b41aabffd33b5de4d7fef8e5663d71484b5b9a19a5ba49d3d9d`.

`docs/agents/issue-tracker.md` is absent. Specs were explicitly supplied, so this did not prevent review; run `/setup-matt-pocock-skills` if issue-tracker integration is wanted.

## Executed verification

Evidence is under `docs/verification/production-release/independent-review/`.

| Exact command / exercise | Exit / result | Evidence |
|---|---|---|
| `npm test` | **0; 61 files, 489 tests passed**; rerun after browser/probe work | `tests-final.txt` |
| `npm run lint` | **0; no errors/warnings** | `lint-final.txt` |
| `npm run build` | **0; Next 15.5.29; 17/17 static pages plus dynamic API/Auth routes** | `build-final.txt` |
| `npm run typecheck` | **0; no TypeScript diagnostics** | `typecheck-final.txt` |
| `git diff --check` | **0**; CRLF conversion notices are not failures | `diffcheck-final.txt` |
| `npm audit --json` | **1; 0 critical, 1 high, 6 moderate** | `audit.txt` |
| `npm audit --package-lock-only --json` | **1; 0 critical, 1 high, 6 moderate** | `audit-lockfile.json` |
| Repair browser suite, independently rerun | **48/48 assertions pass**, Chrome 156, 360px and 1280px | `browser-results.json`, `browser-summary.json` |
| Discovery browser suite, independently rerun | **129/129 assertions pass**, including 320/360/390/1280px | `discovery/browser-results.json`, `discovery/browser-summary.json` |
| Additional two-tab actual Wipe UI reproduction | **Defect reproduced**: successful deletion followed by restoration of 2 previous answers | `wipe-reproduction.json` |
| Concurrent semantic-repeat probe | **Defect reproduced on SQLite AND real PostgreSQL 17**: two repeat ideas accepted and charged | `dedupe-reproduction.json`, `dedupe-postgres-reproduction.json` |
| Own-idea/topic probes | **Defect reproduced in browser and both persistence paths** | `extra/idea-router-reproduction.json`, `idea-topic-postgres-reproduction.json` |
| Reset-time UI probe | **Defect reproduced with explicitly mocked quota-clock boundary** | `extra/quota-midnight-reproduction.json` |
| Streaming input-size probe | Entire **1,310,720-byte** body read before rejecting at **65,536 bytes** | `body-reproduction.json` |
| Client bundle marker scan | **55 JS files; 0 matches** for service-role env name, Guest secret env name, AI key env name, private-key header | `bundle-scan.json` |

The two existing browser suites total **177/177 passing assertions**. The added defect probes are separate; their failures are not hidden in that passing total. Existing tests do not cover the failing interleavings/routes described below.

`review-commands.txt` preserves the actual complete in-memory browser drivers and Node/Vite probe invocations; `size-probe-command.txt` preserves the production-sized streaming probe. They can be rerun from the workspace without adding or changing a source/test file. Browser runner transformations changed only evidence directories/ports and test transport. Test processes were stopped. The final ordinary `npm run build` removed the synthetic browser-build configuration.

### Real versus simulated evidence

**Real:** production `next start`, Chrome DOM/React/input/layout, downloaded DOCX containing the saved Thai draft, HttpOnly/Secure cookies, SSR PKCE creation and cancellation cleanup, app callback redirects, local PostgreSQL 17 running migrations 0001–0005, production persistence adapter/RPC SQL, transaction races, database restarts, and database role/RLS permission tests in the suite.

**Simulated:** the local PostgREST HTTP bridge and Auth fixtures; the Discovery model returned clearly labeled handwritten/synthetic data. To exercise the production HTTPS configuration without calling a real provider, a test-only Node fetch import redirected the configured `https://mock-upstream.invalid/v1` transport to the local mock. This did not change application source or weaken the shipped production URL check. Repair-browser AI was unconfigured, so evaluation/Pivot used their labeled fallback and fresh Discovery returned unavailable. The reset-time UI probe supplied a short-lived exhausted quota fixture; it did not alter the actual system clock.

Expected negative fixtures include unavailable/malformed/timeout model responses, rejected forged requests, quota/admission 429 responses, and intentional database restarts. These are not failing suite commands or evidence of live provider errors. **No real Google login, actual Google callback/session, hosted Supabase JWT check, or live AI success is claimed.**

## Standards

Findings remain separate from the Spec axis. Baseline smells are judgment calls, not tool-enforced violations.

### STD-1 — HIGH: Wiped Discovery answers are resurrected by another mounted tab

- **Locations:** `src/components/discovery/FreshDiscovery.tsx:266–275,279–297`; `src/lib/advisor/privacy-client.ts:6–9`.
- **Rule:** `PLAN.md:118` requires a working “ลบข้อมูลทั้งหมดของฉัน”; production-release spec line 30 requires preservation of erase behavior.
- **Defect:** Discovery loads state once, does not subscribe to the wipe invalidation used by the coaching page, and saves its retained state after every reducer change. Late responses are likewise not fenced against a wipe.
- **Exact browser reproduction:** (1) Complete two interest answers in `/discovery` and leave the summary tab open. (2) Open `/consent` in another tab of the same browser. (3) Click `Wipe All My Data`, then `ยืนยันการลบข้อมูล`; observe success. (4) Return to the original Discovery tab without reloading and edit the summary. (5) Inspect `localStorage['edtech:discovery-fresh:v1']`.
- **Observed:** key was initially absent after successful deletion, then reappeared with **the same 2 old answers**. `wipe-reproduction.json`: `deletedInitially=true`, `beforeAnswers=2`, `afterAnswers=2`, `retainedAnswers=true`.
- **Required repair:** invalidate/reset every mounted writer on wipe; fence outstanding generations/polls and prevent stale saves. Add a real two-tab regression, including a generation response arriving after erasure.

### STD-2 — MEDIUM: Existing Idea edit links ignore `ideaId` and reuse one conversation

- **Locations:** `src/app/idea/page.tsx:35–36,442–445`; `src/lib/advisor/coaching-local.ts:44–45`; `src/lib/advisor/coaching-store.server.ts:29–30`. Callers emit these URLs at `src/app/evaluation/page.tsx:204,240`.
- **Rule:** personalized-discovery spec line 23 requires stable per-learner/topic conversations, fresh gates for a new topic, and resuming the matching topic; PLAN AC-9 includes multiple Ideas/Projects.
- **Defect:** the router reads only `topicCardId`. `/idea?ideaId=A` and `/idea?ideaId=B` both map to `idea:own`; an existing server record wins and discards newly provided context. Returning from a generated Idea's evaluation also loses its card-specific routing.
- **Reproduction:** follow the evaluation “กลับไปแก้ไอเดีย” links for two different Ideas (or navigate directly with two different `ideaId` values). Observe both coach opens send `topicKey='idea:own'` and receive the same conversation ID. In the service probe, advance the first room to Tier 3, then open the second context under that key.
- **Observed:** browser returned the same conversation for `project-A` and `project-B`; PostgreSQL probe retained **Tier 3**, **4 history entries**, and old `m_ton` context when `m_plai` was requested.
- **Required repair:** resolve `ideaId`, restore the correct Idea/card context and stable conversation key, and distinguish new own Ideas without sacrificing resume. Regression-test evaluation→edit for both tracks and two saved Ideas.

### STD-3 — MEDIUM: Input ceilings are enforced after reading the complete stream

- **Locations:** `src/lib/persistence/owner-route.server.ts:15–20`; `src/app/api/ai/coach/route.ts:19–22`; `src/app/api/discovery/cards/route.ts:43–46`; similar pattern in `src/app/auth/login/route.ts:10–11`. Upstream response handling also reads all bytes first at `src/lib/ai/gateway.ts:126–128`.
- **Rule:** production-release spec line 32 requires input-size safeguards.
- **Reproduction:** use the Node invocation in `size-probe-command.txt`: give actual `readBody()` a stream of twenty 65,536-byte chunks with its 65,536-byte limit.
- **Observed:** all **1,310,720 bytes** were consumed before HTTP 413. Authentication/admission has not yet run. The boundary therefore does not bound the initial allocation to its advertised ceiling.
- **Required repair:** enforce a streaming byte budget and cancel reading promptly; reject a trustworthy oversized Content-Length early but do not rely on that header alone. Apply equivalent response-stream protection where appropriate.
- **Qualification:** this is an allocation-hardening defect, **not** a demonstrated out-of-memory exploit and **not** a bypass of the pre-Zod check. Hosting platforms may impose their own larger request ceilings.

### STD-4 — Non-blocking heuristic: possible Duplicated Code

Guest-cookie recovery/error plumbing repeats in `src/app/api/ai/coach/route.ts:35–43` and `src/app/api/discovery/cards/route.ts:26–37`, alongside `owner-route.server.ts:29–40`. Consider sharing this security-sensitive shape to avoid divergent fixes. This smell alone does not determine rejection.

**Standards summary:** 3 documented-contract findings plus 1 heuristic; worst within this axis is erased learner data being restored (STD-1).

## Spec

### SPEC-1 — HIGH: Concurrent semantic repeats are both accepted and charged

- **Requirement:** personalized-discovery spec line 16: “Only accepted successful unique cards count” and “duplicates must not be charged.”
- **Locations:** `src/lib/discovery/fresh-cards.server.ts:137–167`; `src/lib/persistence/sqlite-store.server.ts:60–69`; `src/lib/persistence/cards.server.ts:11–12`; `supabase/migrations/202611060002_card_quota.sql:117–125`.
- **Defect:** semantic screening uses a ledger read **before** the model call. Two independent requests can both screen against the same old ledger. The serialized commit only rejects exact fingerprints/IDs, not semantic repeats.
- **Exact reproduction:** run the PostgreSQL probe in `review-commands.txt`. For the same owner, start two `generateFreshCards()` calls with distinct request UUIDs and `count:1`. Synchronize the injected fixture provider so both ledger reads finish first. Return candidates with identical problems and titles `ตัวกรองน้ำตู้ปลาจากวัสดุเหลือใช้` and `ตัวกรองน้ำตู้ปลาจากวัสดุเหลือใช้แบบประหยัด`. Other valid candidate fields remain equal.
- **Observed on both adapters:** actual `isSemanticRepeat()` returns **true**; title similarity is **0.8648648648648649**, problem similarity **1**. Both results are `status:'ok', accepted:1`; quota becomes **used:2, remaining:33**. This uses injected fixtures, not live AI.
- **Required repair:** enforce repeat screening against the latest owner ledger in an atomic/serialized acceptance step, with safe retries/fencing; do not hold a database transaction across a model request. Add an adversarial two-request semantic-duplicate regression on the production PostgreSQL path, not just exact-text duplicate tests.

### SPEC-2 — HIGH: Erasure does not survive another active Discovery tab

- **Requirement:** production-release spec line 30: “Preserve erase/export behavior”; PLAN AC-2 requires working complete deletion.
- **Locations / reproduction:** independently confirmed STD-1 above. The browser showed deletion success, then a stale tab restored the same answers. This is also a Spec failure; it remains on this axis rather than being hidden by passing privacy helper tests.

### SPEC-3 — MEDIUM: A Guest-local card is automatically persisted into the account after sign-in

- **Requirement:** production-release spec line 29: “any guest-to-account import/sync must be explicit”.
- **Locations:** `src/app/idea/page.tsx:57–75`; `src/lib/auth/principal.server.ts:18–21`; `src/lib/advisor/coaching-store.server.ts:34–38`; disclosure at `src/components/auth/AccountAccess.tsx:44`.
- **Reproduction by code path:** select a fresh Guest card, open its `/idea?topicCardId=…` page, then sign in and return to that same URL with a verified account lacking this conversation. Mount automatically resolves the old local snapshot and sends an `open` command. Principal resolution selects `u:<verified user>`, and `request.context` is written into a new account-owned record. No explicit import decision intervenes. The same issue can arise when opening the selected Guest card after sign-in from Save/Export.
- **Observed evidence level:** source/ownership/persistence trace, supported by executed account-principal and store tests; **not** a real Google sign-in reproduction. It copies context into a new account conversation, not a demonstrated overwrite of an existing account conversation.
- **Required repair:** distinguish local Guest context from account-bound work and obtain an explicit import/continue-with-this-Guest-card choice before persistence; otherwise start/resume only the account's own context. Keep disclosure accurate.

### SPEC-4 — MEDIUM: An exhausted open Discovery page does not renew at the reset time

- **Requirement:** personalized-discovery spec line 16: allowance is “per Bangkok calendar day”.
- **Locations:** `src/components/discovery/FreshDiscovery.tsx:288,304–305,379–381`.
- **Defect:** quota is fetched on mount/results only. A zero remaining balance disables every generation entry point; no reset timer, focus or visibility refresh changes it when the next day begins.
- **Reproduction:** `extra` browser driver supplies an explicitly mocked exhausted quota whose `resetAt` is one second ahead. Keep the page open past the boundary, fire focus/visibility events, and compare the disabled generation button with a fresh real quota GET.
- **Observed:** **1 automatic quota read**, button still disabled after reset, while the actual server reports **35 remaining**. This is a **mocked UI time-boundary test**, not a claim that the machine clock or real midnight was changed. Reload is a workaround, not an automatic reset implementation.
- **Required repair:** revalidate at `resetAt` and on foreground recovery, while retaining server authority and preserving pending intent/idempotency handling. Test exhausted→next-day available without reload.

**Spec summary:** 4 findings; worst within this axis is charging concurrent semantic duplicates (SPEC-1), alongside the high-severity erase failure (SPEC-2).

## Original defects and acceptance coverage

| Item | Current code finding |
|---|---|
| DEF-01 original forged-state Tier-3 exploit | **Repaired:** strict DTO rejects client `state`; server-owned answer→hint→explicit examples; per-card resume/restart and offline non-authority tested. **Full topic requirement still incomplete** because of STD-2. |
| DEF-02 forged Pivot unlocks | **Repaired:** strict open/turn DTO, owner/content/axis binding, authoritative progression, 400 forged unlock, 409 early Tier 3, 404 foreign owner; CAS/restart tests pass. |
| DEF-03 Pivot steals proposal quota | **Repaired:** independent 12/owner/minute Pivot admission; browser and PostgreSQL tests show proposal allowance unchanged. |
| DEF-04 shared hardcoded Guest quota | **Repaired:** verified Auth user or signed Guest capability; forged body owner rejected; independent Guest/account quotas tested. Five evaluations/two proposals remain server-bound per Bangkok day. |
| DEF-05 missing Save/Export Google offer | **Repaired at code/UI level:** optional offering, Guest usable, PII/scope/no-sync disclosure, draft save before redirect and storage-failure veto. **Live OAuth remains pending.** |
| AC-1 terminology / AC-3 interview | Retained; adaptive Thai interest interview reuses known constraints and guides “ยังไม่รู้”. |
| AC-2 privacy / optional account | **Fails whole acceptance:** STD-1 and SPEC-3; optional sign-in implementation itself is present. |
| AC-4 / AC-5 Discovery | Later personalized spec supersedes seed-first/five-card-only comparison wording; seed catalog preserved. Happy path, snapshots, swipes/undo/refinement/partial batches pass. **SPEC-1 and SPEC-4 remain.** |
| AC-6 coaching | Gates/DTO repaired; generated-card isolation works. **Existing-Idea routing/resume fails STD-2.** |
| AC-7 evaluation | Suite and browser pass scoring/badges, database-only citation filtering and non-blocking safety behavior. Not a claim that all cited external URLs were revalidated live. |
| AC-8 Pivot | Repair regression checks pass, including own-words rewrite and fresh room after changed idea content. |
| AC-9 Proposal/Plan/export/multiple projects | Save/edit/quota exhaustion/manual fallback and real DOCX pass; existing-Idea edit/resume still fails STD-2. |
| AC-10 gateway/persistence/quota | Fail-closed cloud backend, ownership and numeric allowance ceilings pass. Fresh unavailable/duplicates-in-one-batch/no-charge tests pass. **Concurrent semantic repeats still fail SPEC-1; streaming safeguard needs STD-3.** |
| M5 variables/safety forms/BOM/calendar/judge/advisor/templates | Existing regression suite passes. No new source changes in those feature modules; not all native print or external competition/advisor interactions were exercised in this review. |

## Security / persistence audit and residual risk

- Production `requiresCloudPersistence()` and factory selection refuse SQLite/local fallback; missing Supabase service configuration returns unavailable instead of pretending durable success. Guest capability is server-issued, HMAC-verified in production, HttpOnly/Secure/Strict; account authorization calls `getUser()`, not unverified `getSession()`.
- Read all five additive migrations. All app tables enable RLS; client mutations and service RPC execution are revoked from PUBLIC/anon/authenticated. Own-record/card/quota SELECT policies bind to `auth.uid()`. Mutation RPCs are service-only SECURITY INVOKER with fixed empty search_path. Owner row locking, record CAS, idempotency receipts, lease fencing and generation checks cover restart/concurrency/wipe. No concrete cross-owner RLS bypass was identified in local code/tests. Hosted enforcement still needs its own release gate.
- SSR uses Next 15 middleware, refreshed cookies forwarded into the request and response, no-store auth responses, PKCE code exchange and verified user lookup. Exact local return-path allowlist rejects scheme/slash/backslash tricks. Browser verified local sanitized return path, cancellation cleanup, Guest preservation, and logout retaining local work. Integration tests cover synthetic refresh/callback success/error cases; this does not validate Google's production configuration.
- CSP/security headers are present; production AI requires configured public-host HTTPS, rejects local hostnames/literal IPs, disables redirects, and sends a token ceiling. Client bundle scan found no server-only markers. These are bounded checks, not a guarantee that any operator-provided hostname resolves publicly forever or that no possible secret string exists.
- **Audit is not clean.** Zod 3.25.76 has HIGH `GHSA-mrhx-c7xc-m3w5`; 6 MODERATE entries are minimatch `GHSA-g3hv-75wg-m249` and its lint-toolchain dependents. Pre-Zod body/content limits bound collection-validation exposure and the oversized collection regressions pass, but the advisory remains installed. STD-3 concerns allocation before that boundary; do not claim the mitigation is a universal network-memory bound. Lint-glob input is trusted build configuration, not request input. Reassess both before publishing the repaired tree; no forced major upgrade was attempted by the reviewer.

## Required handoff and live gates

Return the confirmed code defects for repair, add the missing adversarial regressions, then repeat independent whole-app review. Do not treat the 489 passing tests or 177 existing browser assertions as overriding the added failing cases. No new repair task was created and no parent task was closed.

After an eventual CODE APPROVED result, publication must still verify the exact pushed SHA, apply reviewed migrations to the specified hosted Supabase project, configure server secrets securely, read back the actual Vercel origin, configure the normal Google Web OAuth client/provider URLs, and obtain a real interactive Google sign-in/callback/session/refresh/logout check. The user must enter the AI key through Vercel; only then can live upstream generation be verified. Preview protection and rollback requirements remain in force.

**Reflection / handoff:** Not all acceptance criteria pass despite green existing suites. This is iteration 2, below the loop cap, so remediation belongs with the builder rather than Gate 3 sign-off. The publication successor must block until a later independent APPROVED review.

**Axis totals:** Standards — 3 contract findings + 1 heuristic (worst: erasure resurrection); Spec — 4 findings (worst: duplicate charging / failed erasure). These axes are intentionally not merged or globally reranked. @builder
