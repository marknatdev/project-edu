# Read-only cloud release preflight

Task: `t_612d32f5`. Live preflight started 2026-11-06 at approximately 13:22 UTC (20:22 Asia/Bangkok); local inventory timestamp `2026-11-06T13:22:46.010226+00:00`. This is inspection evidence, **not release approval**. All cloud requests were reads. No deployment, Git connection, configuration change, migration application, credential creation, password/2FA interaction, staging, commit or push occurred.

## 1. Verified target map

| Resource | Exact target | Evidence / current state |
|---|---|---|
| Repository | `https://github.com/marknatdev/project-edu.git` | Required by release spec; remote graph/SHA not fetched in this preflight. Publisher must verify it. |
| Workspace / local baseline | `D:/millmaker/EdTech`; `880e3a30a62e5fd61791bb3e7bab4025afdc2a30` | Local Git read; substantial existing tracked/untracked work preserved. This HEAD is not an approved release SHA. |
| Vercel team | `team_glmawLQlxzaWRFiNoQ16yY9G` / `marks-projects-11c1273e` | MCP Git deployment context; Hobby plan. |
| Vercel project | `prj_a4MuPE3N1J68C3eoQOtBssOkxkFd` / `project-edu` | Scoped get-project and list-projects both match; `accountId` is the exact team above. Framework `nextjs`, Node `24.x`, `live:false`, latest deployment null. |
| Registered Vercel production-domain candidate | `project-edu-orcin.vercel.app` | Dedicated domain-list API returns it, verified=true, exact project ID, gitBranch=null, customEnvironmentId=null. **Registered domain only; no deployment/live-origin verification.** |
| Supabase | `ppctndzkerwiokjfaklw` / `Project Edu` | MCP get-project: ACTIVE_HEALTHY, `ap-southeast-1`, Postgres engine 17, version `17.11.0.018`. |
| Supabase organization | `uavovztehpanlexwhxen` | Current project membership readback; organization name is from release spec, not re-read separately. |
| Supabase public URL | `https://ppctndzkerwiokjfaklw.supabase.co` | Exact project target; public Auth settings endpoint responds HTTP 200. |
| Google Cloud | `project-edu-marknatdev` / project number `923873649391` / `Project-Edu` | Native `gcloud.cmd projects describe` with explicit project, restricted output: ACTIVE. No CLI default change or OAuth-client/credential retrieval. |
| Google redirect URI | `https://ppctndzkerwiokjfaklw.supabase.co/auth/v1/callback` | Required Google Web-client callback; distinct from application `/auth/callback`. |

### Vercel configuration and evidence limits

- **Current Node24 is verified.** The current MCP project summary omits `resourceConfig`, `serverlessFunctionRegion`, `functionDefaultRegions`, `previewDeploymentsDisabled` and `link`. List-projects is also a summary. Thus **Singapore `sin1` and the explicit preview-auto-deploy-disabled flag are prior verified spec configuration, NOT freshly verified fields in this run**. Publisher must inspect the full settings/console before deployment; do not infer them from Node24 or the request-routing region.
- Git deployment context lists the team's linked projects and does **not** include `project-edu`; consistent with the spec's intentionally unlinked state. No linkage was established. With no observed Git connection there is no observed automatic Git-triggered release path; that does not prove the omitted preview-disable flag's value.
- `list_deployments` returned an empty deployment list and pagination count 0. There is no deployment ID, deployed SHA, working app origin or previous application deployment available for rollback from this inspection.
- Protection readback: Vercel Authentication/SSO enabled, `deploymentType: all_except_custom_domains`; password protection disabled; Trusted IPs disabled. Preview protection is configured. Actual URL access has not been exercised because there is no deployment.
- **Do not assume the registered `vercel.app` domain is public under that protection scope.** Before public release, use the project's Deployment Protection settings to select an appropriate Standard Protection scope that preserves previews while allowing the intended production domain, then verify anonymously. The API supports `ssoProtection.deploymentType=prod_deployment_urls_and_all_previews` (Standard Protection), and `preview` (legacy preview-only). Do not set SSO null or remove unrelated protections broadly. Hobby supports Standard Protection; no paid upgrade is authorized.
- Firewall read `get_firewall_config(configVersion=active)` on the exact project/team returned **404 `not_found`, “Seawall Config not found.”** No active custom firewall policy was verified. This is not proof that Vercel platform-wide DDoS protection is absent. The earlier foundation recommendation for edge protection against cookieless Guest-owner churn remains a release assessment item.
- **Spec drift / summary discrepancy:** spec says no domain; dedicated domain API now exposes the registered domain above even though get-project's summary contains `domains: []`. Prefer dedicated domain-list evidence; do not use the contradictory summary to assert absence. No deployment is still corroborated by both project summary and deployment history.

## 2. Environment presence — no AI/server-secret values requested

Used MCP `filter_project_envs` with `decrypt:"false"`; never called get-environment-by-ID. It returned only these names, each targeting **production + preview**, type `plain`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (compatibility publishable-key entry)

`hiddenProductionEnvCount: 0`. The list endpoint includes plain public values even with decrypt disabled; none are reproduced in this handoff or saved as raw output. No AI or server-secret entry was returned, so no such value was retrieved.

| Name | Current presence | Required action after review gate |
|---|---|---|
| `AI_BASE_URL` | Absent | Operator selects public HTTPS OpenAI-compatible API base; app appends `/chat/completions`. Include provider's required base path (often `/v1`). No localhost, literal IP, URL credentials/query/fragment, or development OmniRoute address. |
| `AI_MODEL` | Absent | Set the real provider model supporting the app's JSON-mode requests. |
| `AI_API_KEY` | Absent | **User enters it directly in Vercel**, Production environment, server-only/sensitive. Never request it in chat or retrieve/decrypt it through MCP. |
| `SUPABASE_SERVICE_ROLE_KEY` | Absent | Operator transfers the exact project's service-role/server secret through secure platform UI only. Never prefix with NEXT_PUBLIC or expose it to a client. |
| `APP_GUEST_SECRET` | Absent | Dedicated CSPRNG secret of at least 32 random bytes, stable across instances/restarts; secure UI, never logs/chat. Rotation invalidates Guest capabilities. |
| `APP_ORIGIN` | Absent | Set only to the actual verified canonical HTTPS deployment origin, no path/query. Registered domain candidate is not yet a successful deployment. |
| `PERSISTENCE_BACKEND` | Absent | Optional explicit `supabase`; production already mandates cloud backend. Missing service configuration fails closed, not SQLite. |
| `CARD_BATCH_LEASE_SECONDS` | Absent | Optional default 120 seconds; production validation 60–600; keep longer than model timeout. |

Production/Preview scopes must remain deliberate. Do not indiscriminately copy production server secrets into previews. Public Supabase configuration already spans both; preview runtime secrets need a separate least-privilege/test-data decision before authenticated preview testing. Setting envs does not retrofit an already-built deployment; publisher must account for a new build/deployment when configuration changes.

## 3. Supabase database / RLS / migration drift

Read-only public-schema catalog transaction (`BEGIN READ ONLY`), plus MCP list-tables/list-migrations:

- Public tables/partitioned tables/views/materialized views/foreign tables: **none**.
- Hosted application migration records: **none**.
- Public RLS policies: **none** (no application tables exist); this is **not** evidence of hosted application isolation.
- Public schema ACL gives CREATE to `pg_database_owner`, not anon/authenticated; public usage exists.
- One existing function, **`public.rls_auto_enable()`**, SECURITY DEFINER, `search_path=pg_catalog`, return type **event_trigger**, EXECUTE granted to PUBLIC/anon/authenticated/service_role/postgres.
- Existing enabled event trigger **`ensure_rls`** invokes that function on `ddl_command_end`, tags CREATE TABLE / CREATE TABLE AS / SELECT INTO. Definition enables RLS on public tables using identifier quoting. It was read, not invoked or modified. Its provenance is not established by the empty migration history; preserve it.

The application objects from the five local SQL files are all absent. There is no application-name collision currently, but the schema is not literally object-free: preserve the pre-existing RLS event trigger/function. Re-read immediately before any eventual apply.

### Current local migration inventory (not authorized to apply now)

Exact SHA-256 hashes and object inventory are in `cloud-preflight-migrations.json`, generated from current bytes, not copied from old handoffs.

| Order / filename | Proposed objects / effect |
|---|---|
| `202611060001_foundation.sql` | `edu_owners`, `edu_records`, `edu_record_receipts`; owner binding and foundation RPC; CAS/idempotency/generation/wipe authority. |
| `202611060002_card_quota.sql` | `edu_daily_quota`, `edu_card_batches`, `edu_generated_cards`, `edu_quota_receipts`; Bangkok day, card quota and owner-serialized card-operation helpers/RPC. |
| `202611060003_rate_admission.sql` | `edu_rate_windows`, expiry index, `edu_rate_take`, `edu_rate_admission`. |
| `202611060004_card_generation_admission.sql` | Replaces admission function, adds cards kind; no new tables. |
| `202611060005_evaluate_pivot_admission.sql` | Replaces admission function, adds evaluation/Pivot kinds; no new tables. |

All proposed app tables explicitly enable RLS. PUBLIC/anon/authenticated mutations are revoked; service_role has server privileges. Own-account SELECT is granted only on records, daily quota and generated cards via `auth.uid()`-bound policies; private leases/receipts/owner/rate tables have no client SELECT grant. Application mutation functions are SECURITY INVOKER with empty search_path and service-only EXECUTE grants. No Auth schema mutation is proposed. Foundation RPC references helpers installed by subsequent files: apply the complete approved sequence before traffic, not file 0001 in isolation. Files 0001–0003 use CREATE rather than idempotent CREATE IF NOT EXISTS; do not replay blindly.

**Approval caveat:** these files were inspected in the previous review, but current whole-app review is REJECTED. In particular `0002`'s acceptance step only rejects exact collisions; the reviewer reproduced concurrent semantic-duplicate charging. The repair lane may change SQL or add migration(s). This inventory is a point-in-time comparison, **not final approval of these bytes**. The older foundation-contracts document mentions four migrations and is stale relative to this five-file inventory. Require final independently reviewed filenames/hashes and fresh migration history before apply.

### Current security advisor findings

The current security advisor returns two WARN groups, both about the existing `rls_auto_enable()` SECURITY DEFINER EXECUTE grants:

- anon/PUBLIC: [0028 remediation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- authenticated: [0029 remediation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)

These are **unresolved triage**, not a demonstrated exploitable RPC: catalog confirms this is an event-trigger-returning function rather than an ordinary callable app RPC. Do not invoke it to test the warning, remove the trigger, or blindly change it to SECURITY INVOKER. Publisher/security reviewer should assess supported least-privilege EXECUTE revocation preserving the event trigger, obtain approval for any corrective SQL, and rerun advisors. The proposed app migrations do not address these pre-existing grants. No grants were changed in this preflight.

After eventual approved apply: read back migration records, all table/RLS/policy/function grants, and advisors; then exercise real hosted PostgREST with two synthetic identities and negative cross-owner reads/writes. Local PostgreSQL/Auth shims in old evidence do not satisfy hosted JWT/RLS acceptance. Clean up only owned synthetic fixtures; never SQL-query Auth user/token internals. Roll back app/deployment first; preserve data and use reviewed additive corrections, not DROP/reset.

## 4. Google provider and Site URL

A read-only request to the exact project's **public** `/auth/v1/settings`, authenticated only with the existing browser-safe publishable key, returned HTTP 200 with **`external.google:false`**. Output was allowlisted to this boolean/status only. No provider client ID/secret was requested. No `/authorize` or sign-in flow was started.

**Google sign-in is currently disabled at the public Auth configuration.** The endpoint does not expose `site_url` or `uri_allow_list`; their current values are **UNKNOWN**, not presumed localhost or correct. The available default-profile Supabase MCP has no Auth-provider/configuration verb. Database access is not Auth administration.

A supported external Management API exists: GET/PATCH `https://api.supabase.com/v1/projects/ppctndzkerwiokjfaklw/config/auth`. Official GET requires `auth:read` / `auth_config_read`; PATCH requires `auth:write` and token permissions `auth_config_write` + `project_admin_write`. No separately authorized management credential/transport was established here. Do not extract MCP transport tokens or fetch a full Auth config that may contain secrets. Prefer the console for this task; future approved automation must use a secure authorized path and emit only allowlisted non-secret fields. **No SQL workaround against Auth internals.**

### Precise operator console steps (not performed)

1. **Google Branding:** https://console.cloud.google.com/auth/branding?project=project-edu-marknatdev — verify Project-Edu selection, app display/support/contact information and consent disclosure. Do not copy personal identity details into release evidence.
2. **Google Audience:** https://console.cloud.google.com/auth/audience?project=project-edu-marknatdev — configure External audience as appropriate; in Testing add intended tester accounts securely. Public production sign-in may require publishing/verification according to Google policy. No paid upgrade or extra scopes is authorized.
3. **Google Data Access:** https://console.cloud.google.com/auth/data-access?project=project-edu-marknatdev — limit to sign-in identity scopes (`openid`, `email`, `profile` as required); no Drive/Calendar/offline integration.
4. **Google Web client:** https://console.cloud.google.com/auth/clients?project=project-edu-marknatdev — inspect/create the ordinary **Web application** client after authorization, not IAP/Workforce. Authorized JavaScript origin = actual verified canonical app HTTPS origin. Authorized redirect URI = **`https://ppctndzkerwiokjfaklw.supabase.co/auth/v1/callback`**. The user handles client ID/secret directly through secure consoles; this preflight neither obtains nor creates them.
5. **Supabase Google provider:** https://supabase.com/dashboard/project/ppctndzkerwiokjfaklw/auth/providers?provider=Google — user enters Web client ID/secret, enables Google. Do not relax nonce checks or request unrelated scopes. Preserve privacy disclosures.
6. **Supabase URL configuration:** https://supabase.com/dashboard/project/ppctndzkerwiokjfaklw/auth/url-configuration — inspect current values; after a real successful deployment set Site URL to its canonical origin; add **that origin plus `/auth/callback`** to Redirect URLs. Avoid broad preview wildcards. Do not confuse the Google→Supabase callback with the Supabase→app callback.
7. **Vercel `APP_ORIGIN`:** set the same canonical app origin in Production through the environment UI below; ensure protection allows intended testers on that origin.
8. **Interactive acceptance:** with renewed explicitly authorized browser access, user signs in and enters password/2FA privately; verify actual app callback, boolean `/auth/session`, secure cookie behavior, refresh, logout and cancellation. Do not record codes/tokens/identity PII in evidence. An opening consent page or local test is not successful OAuth.

Do not repeat previously denied/timed-out native browser input or route around its refusal. No interactive browser access was attempted here.

## 5. Supported Vercel release/provenance paths

Only tool schemas/documentation were inspected for writes; none of these writes was invoked.

- `mcp__vercel__create_deployment` supports exact `teamId`, `requestBody.project`, explicit `target:"production"`, and **either** `files` **or** `gitSource`. First deployment settings support `nodeVersion:"24.x"` and `serverlessFunctionRegion:"sin1"` explicitly; project-update settings support `resourceConfig.functionDefaultRegions:["sin1"]`. Verify full current settings before making a future authorized write.
- **No-Git-link route:** upload exactly the reviewed, published SHA's clean allowlisted source snapshot using the files route. Never upload the dirty workspace, `.env`, browser profiles, runtime DBs, credentials or private evidence. Include `gitMetadata.commitSha` and appropriate repository/ref plus a per-file hash manifest derived from that actual SHA. `gitMetadata` is caller-supplied labeling, **not proof by itself**; verify uploaded bytes against the published commit/manifest and read back deployment metadata/status. This route does not need automatic Git linkage.
- **Git route:** schema supports GitHub org/repo/ref/**sha**. The project is currently unlinked; usable server-side Git authorization for this repository has **not** been tested. A schema does not prove permission. Do not connect Git merely to probe it, use branch-only latest-source deployment, or enable auto-deployment. Stop for the publisher's explicit reviewed decision if the chosen Git route requires linking/access.
- After deployment, use scoped `get_deployment(idOrUrl, withGitRepoInfo:"true")`; verify project/team, production target, READY, URL/aliases, effective runtime/regions, and provider-reported Git SHA where applicable. Cross-check list-deployments with `sha` plus source manifest. Record source SHA separately from later evidence-only commits. No deployment exists to read back today.
- Do not use expired Vercel CLI credentials or token files. Do not use `web_fetch_vercel_url` for a strictly read-only preflight: its schema says it can create a temporary share link.

### Exact Vercel console links

Base: https://vercel.com/marks-projects-11c1273e/project-edu

- Environment Variables: https://vercel.com/marks-projects-11c1273e/project-edu/settings/environment-variables — user adds Production AI key directly, plus approved server configuration; sensitive/server-only fields, no NEXT_PUBLIC prefix. Do not click Reveal/export values for verification.
- Build and Deployment: https://vercel.com/marks-projects-11c1273e/project-edu/settings/build-and-deployment — inspect Node24 and preview deployment controls where presented; do not save in this preflight.
- Functions: https://vercel.com/marks-projects-11c1273e/project-edu/settings/functions — inspect function region = Singapore `sin1`; exact live region was omitted by MCP summary.
- Git: https://vercel.com/marks-projects-11c1273e/project-edu/settings/git — confirm unconnected; **do not connect** before independent approval/source decision.
- Deployment Protection: https://vercel.com/marks-projects-11c1273e/project-edu/settings/deployment-protection — preserve preview protection, choose approved public-production scope, verify actual URL without team auth after deployment.
- Domains: https://vercel.com/marks-projects-11c1273e/project-edu/settings/domains — inspect registered domain and eventual deployment assignment; domain verification is not app availability.
- Firewall: https://vercel.com/marks-projects-11c1273e/project-edu/firewall — assess rate protection within current plan; no paid changes authorized.
- Supabase server API key settings (user only): https://supabase.com/dashboard/project/ppctndzkerwiokjfaklw/settings/api-keys — transfer only through secure UI, never return key values to the agent/chat/evidence.

These are operator navigation links, not claims that authenticated console pages were opened. If a console route changes, use the named section within the exact verified project; never switch/create another target.

## 6. Publisher prerequisites / stop conditions

1. **Code approval missing:** `docs/verification/production-release/REVIEW.md` currently says CODE STATUS REJECTED (iteration 2). Repairs and later independent whole-app APPROVED review must precede any source publication, hosted migration or deployment. Six distinct defect areas remain in that report; passing old suites is insufficient. Current sibling repair/review work must supply new hashes/approval; this preflight cannot approve it.
2. **Fresh runtime settings evidence:** Node24 verified; current `sin1` and explicit preview-disable fields need full-settings/console readback. Avoid automatic Git deployment while resolving this.
3. **Hosted app schema missing:** all current proposed app migrations are unapplied. Final reviewed SQL may change, especially semantic acceptance. Apply only after approval, then hosted RLS/JWT/two-identity/advisor verification.
4. **Security triage pending:** pre-existing RLS event-trigger grant warnings, Guest-owner churn/edge controls, plus the earlier review's dependency findings (HIGH Zod, six MODERATE entries). This task did not rerun npm audit or resolve code/security findings.
5. **Secrets/configuration missing:** service-role key, stable Guest secret, APP_ORIGIN, all three AI env names. User inputs AI key directly in Vercel, never chat. No live AI call or credential validation performed.
6. **Google disabled / URLs unknown:** secure Web-client/provider setup, current Site URL/allowlist inspection and actual production origin required. No authorized Auth-management transport or renewed interactive session was available here.
7. **No live release:** no deployment ID/SHA/working origin; public production/protected preview behavior, mobile360/desktop, headers, persistence, OAuth and actual AI quality all remain unverified live.

Completion of this inspection supplies a target map and honest prerequisites to the publisher. It does **not** satisfy or waive any of those release gates. Rollback for this task: none required; no release state was mutated.

## 7. Evidence and references

- Live read sources: default-profile Supabase MCP get-project/list-tables/list-migrations/read-only public catalog/security advisors; default-profile Vercel MCP get-project/list-projects/list-deployments/list-project-domains/Git deployment context/env list/firewall read; public Supabase settings boolean; restricted native GCP project describe.
- Full prior documents read: production-release spec, RELEASE.md, whole-app REVIEW.md, foundation-contracts.md, repairs.md, all five current SQL files; foundation/repair Kanban handoffs. Original root REVIEW.md SHA-256 remains `387653b158f17b41aabffd33b5de4d7fef8e5663d71484b5b9a19a5ba49d3d9d` at inspection.
- Companion `cloud-preflight-migrations.json` is current local migration inventory/hashes only. No raw cloud environment/Auth response or credential file was saved.
- [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [Auth config GET](https://supabase.com/docs/reference/api/v1-get-auth-service-config), [Auth config PATCH](https://supabase.com/docs/reference/api/v1-update-auth-service-config).
- [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection), [Vercel Authentication API scopes/configuration](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication), [Deployment creation API](https://vercel.com/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment).
