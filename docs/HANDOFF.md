# Project Edu — Handoff for agents

Snapshot: **2026-11-09**. Read this before working on the mobile app, the Supabase backend or the mobile CI.
Read `CLAUDE.md` (web app rules), `CONTEXT.md` (glossary) and `docs/adr/` (decisions) too. This file wins over
`docs/MOBILE_PROGRESS_REPORT.md`, which is an earlier, partly inaccurate report kept for history.

## 1. What the product is now

Project Edu helps Thai lower/upper secondary students (ม.ต้น/ม.ปลาย) start a science/computing/math project.
There are two clients on one Supabase backend:

| Part | Where | Status |
|---|---|---|
| **Flutter app** (the main product now) | `mobile/` | Android + iOS, updated over the air with Shorebird |
| Next.js web app | `src/`, `tests/` | Still builds and tests in CI; **no longer auto-deployed** to Vercel (manual `workflow_dispatch` only) |
| Supabase (Postgres, Auth, Edge Functions) | `supabase/migrations/`, `supabase/functions/` | Project ref `ppctndzkerwiokjfaklw` |

Sign-in with Google is required on both clients (ADR 0003 web, ADR 0007 mobile). There is no Guest mode on mobile anymore.

## 2. Mobile app map (`mobile/lib`)

| Path | Role |
|---|---|
| `main.dart` | Boot: Supabase init, Shorebird check, loads `LearnerState` + `DiscoveryStore` into a `MultiProvider`. `MainShell` shows `PreLoginView` until signed in, then scopes local data to the account and starts discovery sync. Tabs: 0 Dashboard, 1 Sessions, 2 Lab Log Book, 3 Profile; center dock button opens the AI Coach. |
| `models/learner_state.dart` | Device-local state in `SharedPreferences`: chat sessions (persisted), lab stopwatch (wall-clock based), lab observations, BOM, project settings (`fitConstraints`, `gradeCode`), theme. `clearAllAccountData()` resets everything except theme. |
| `discovery/catalog.dart` | `DiscoverySubject`, `DiscoverySubfield`, `DiscoveryCard` models. |
| `discovery/catalog.g.dart` | **Generated** 90-card catalog from `src/data` (ADR 0006). Never edit by hand. |
| `discovery/fit_score.dart` | Port of the web `computeFitScore` + reason texts. Keep identical to `src/lib/rubrics/engine.ts`. |
| `discovery/rewrite_gate.dart` | Port of the web own-words check (`isRewriteAcceptable`). The composer checks against each card field separately. |
| `discovery/discovery_store.dart` | Discovery Track state as `SyncItem`s (kinds `swipe`, `shortlist`, `idea`, `active_idea`, `ai_card`): deck per subfield + grade, swipe/undo, Shortlist limit 5, Ideas, Active Idea, merge + background sync (ADR 0008). |
| `discovery/supabase_sync_remote.dart` | Real sync adapter (`edu_discovery_push` / `edu_discovery_pull` RPCs). Tests use an in-memory fake. |
| `discovery/ai_card_service.dart` | Calls the `ai-topic-cards` Edge Function. |
| `services/ai_coach_service.dart` | Calls the `ai-coach` Edge Function. `client` and `accessToken` are the HTTP/token seams for tests. |
| `services/supabase_service.dart` | Supabase config (URL + publishable key are public by design), `authVersion` notifier, `userIdOverride` test seam. |
| `services/account_scope.dart` | ADR 0007: wipes device-local data on the first sign-in and on an account switch. |
| `services/code_push_service.dart` | Shorebird update check; `getCurrentPatchNumber()` is shown at the bottom of the Profile tab. |
| `views/topic_discovery_view.dart` | Subject → Subfield → flip flash cards (tap to flip, swipe left skip / right like, undo), empty-deck options, AI cards sheet. |
| `views/shortlist_compare_view.dart` | Shortlist ranked by Fit Score with reasons; remove / choose. |
| `views/idea_composer.dart` | Own-words Idea → optional Active Idea (names the lab experiment, opens the AI Coach). |
| `services/project_repository.dart` | Legacy: writes `coaching_sessions` straight into `edu_records`, which clients cannot write. It fails silently. Remove it or route it through an RPC. |

## 3. Backend (Supabase)

**Migrations** (`supabase/migrations/`, applied by CI on every push to `main` via `supabase db push`):
- `202611060001…0006`: web foundation (owners, records, card quota, rate admission, semantic acceptance). Server-side only, through the service role.
- `202611090001_discovery_sync.sql`: table `edu_discovery_items` with RPCs `edu_discovery_push(jsonb)`, `edu_discovery_pull(bigint,int)` and `edu_discovery_wipe()`.
  - **Access:** callable by `authenticated` only, scoped to `auth.uid()`; anonymous users are rejected. No direct table access.
  - **Merge rule:** newest `updatedAt` wins and removals win ties. `seq` is the pull cursor.
  - **Wipe:** rows are deleted when the web PDPA wipe bumps `edu_owners.generation`.

**Edge Functions** (`supabase/functions/<name>/`): `handler.ts` is pure and unit/integration-tested under Vitest; `index.ts` is the Deno entry and is excluded from `tsc`.
- `ai-coach`: chat proxy. Requires login, applies the `coach` rate limit (12/min per user), keeps the system prompts server-side, and never returns upstream errors.
- `ai-topic-cards`: fresh AI Topic Cards.
  - Shares the web's daily card quota (5 free + 30 extra per day, Bangkok day) and the generated-card ledger through `edu_foundation` with owner `u:<uuid>`.
  - Uses the same semantic-repeat screen and card fingerprint as the web.
  - Drops candidates that carry references or claims of novelty or safety.
  - Never charges for model failures or repeats.
- Secrets (already set): `OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL` (`agy/gemini-3.8-flash-high`). Never put an AI key in the app (ADR 0005).
- Deploy from a checkout that contains the function:

  ```bash
  npx supabase functions deploy <name> --project-ref ppctndzkerwiokjfaklw --use-api --yes
  ```

**AI gateway**: OmniRoute runs on the owner's Windows PC and is exposed with **Tailscale Funnel** at the stable URL `https://win-mc1lo20oj0g.tailc8aaa6.ts.net:8443/v1`. Do not rely on Cloudflare quick tunnels: their URLs change on every restart. The old key `sk-c89b…` leaked publicly (it is in git history, and the repo is public) and has been replaced in Supabase secrets.

## 4. Releases and CI

- **Shorebird** app id `fb59b69d-72a4-4d2d-926e-8cc82ae756f2`. Current base release is **`1.0.4+5`** (Android + iOS, Flutter `3.47.9`, built with `--no-tree-shake-icons`).
  - Older releases `1.0.0+1 … 1.0.3+4` exist. Patches #1–#23 on `1.0.3+4` shipped with `--allow-asset-diffs`, so 26 Material icons render blank on those devices.
- **GitHub Release** `mobile-v1.0.4+5` holds:
  - `project-edu-1.0.4+5.apk`: re-signed with the owner's local debug keystore so it installs over 1.0.3 without data loss.
  - `project-edu-1.0.4+5-unsigned.ipa`: unsigned; it must be signed before it can be installed.
- **`.github/workflows/build-mobile.yml`**: manual only.
  - **Inputs:** `action` (`patch` | `release`), `release_version`, `track` (`staging` | `stable`), `platforms`.
  - **Build rules:** always builds with `--no-tree-shake-icons`; never uses `--allow-asset-diffs` or `--allow-native-diffs` (a patch that cannot carry its changes must fail). Releases pin Flutter `3.47.9` and Android releases build an APK.
- **`.github/workflows/deploy.yml`**: on push to `main` it runs lint, typecheck, `npm test` (including Postgres integration tests) and the Next build, then pushes Supabase migrations. Vercel deploys only on manual dispatch.
- The repo is **public**, so GitHub Actions minutes are free; billing earlier blocked CI while the repo was private.
- **Staging patch for 1.0.4+5:** published on 2026-11-09 by run `42636947445` (Android and iOS jobs both succeeded). Patch **#1** and **#2** are on track `staging` (one per platform job), so the profile footer shows `Patch #1` or `Patch #2` depending on the platform.
  - A staging patch reaches only devices running the following command over USB; installed apps check `stable`:

    ```bash
    shorebird preview --release-version 1.0.4+5 --track staging
    ```

  - Promote to `stable` only after a device test passes.

### Local build gotchas (Windows dev machine)
- **Java:** the system `java` is 26, which Gradle 8.14 rejects. Use JDK 21 (`JAVA_HOME=C:/Program Files/Java/jdk-21.0.11`) and `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:/Temp/jdkuds` (fixes "Unable to establish loopback connection").
- **Flutter versions:** the system `flutter` is 3.41.7; Shorebird uses its own 3.47.9. Running the system flutter rewrites `mobile/pubspec.lock` and the generated plugin registrants (line endings only). Revert those files before committing:

  ```bash
  git checkout -- mobile/pubspec.lock mobile/linux mobile/macos mobile/windows
  ```

- **iOS:** builds only on macOS. Use the GitHub workflow (`macos-latest`).
- **Android signing:** CI signs with a random debug key. A release APK must be re-signed with `~/.android/debug.keystore` (`apksigner`, alias `androiddebugkey`, password `android`) to keep upgrades working. Better fix: add a release keystore to GitHub secrets (open item).

## 5. Commands

```bash
# mobile
cd mobile && flutter analyze && flutter test
# web + backend (includes embedded Postgres integration tests)
npm run typecheck && npm run lint && npm test
# regenerate the mobile card catalog after editing src/data/cards or src/data/subfields.ts
UPDATE_DART_CATALOG=1 npx vitest run tests/unit/mobile-dart-catalog.test.ts
# dry-run a patch locally (no upload)
cd mobile && shorebird patch android --release-version 1.0.4+5 --dry-run -- --no-tree-shake-icons
```

Test seams: `AiCoachService.client` / `accessToken`, `SupabaseService.userIdOverride`, `LearnerState.clock`,
`DiscoveryStore.clock`, `DiscoverySyncRemote` (fake in `test/discovery_core_test.dart`), `CountdownBanner(now:)`.

## 6. Decisions in force (see `docs/adr/`)

- **0005:** mobile AI only through Supabase Edge Functions; login required; quota shared with the web.
- **0006:** the mobile Topic Card catalog is generated Dart from `src/data` (Shorebird cannot patch assets).
- **0007:** mobile requires Google sign-in; there is no Guest mode. Device data is wiped on the first sign-in and on an account switch, and kept for the same account.
- **0008:** discovery sync merges additions from all devices; removals sync as tombstones; newest action wins, and removals win ties.
- **Glossary** (`CONTEXT.md`):
  - **Topic Card:** a starting idea, never "verified" or "new".
  - **Shortlist:** at most 5 cards, per account.
  - **Idea:** written in the learner's own words.
  - **Active Idea:** the one Idea being worked on. It is not a Project until it is evaluated and has a Proposal and Plan.

## 7. Open work (highest value first)

1. **Device test of 1.0.4+5 + staging patch.** Check that Google sign-in works on a real phone; the Supabase Auth redirect URL `com.marknatdev.projectedumobile://login-callback` must be allowed. With login now required, a broken login locks everyone out. Then promote the patch to `stable`.
2. **Web side of discovery sync (decided, not built).** The web keeps swipes as `swipeHistory` and rich `Idea` records in the local store (`src/lib/storage/store.ts`). It needs a mapping to and from the `edu_discovery_items` kinds and a browser call to the RPCs with the user's session. It also needs an Active Idea concept on the web.
3. **Release keystore in CI** so CI-built APKs install over earlier ones.
4. **iOS distribution:** IPAs are unsigned; TestFlight needs an Apple Developer account. Sign in with Apple is required if the app ever goes to the App Store.
5. **Sync the rest:** chats, lab notes, BOM and project settings are still device-local (by decision: a separate task).
6. **Smaller items:**
   - `project_repository.dart` is broken (see §2).
   - The dashboard countdown targets YSC 2027, which closed on 10 Sep 2026; the next competition target is undecided.
   - The coach is branded "Claude Socratic Coach" but runs Gemini via OmniRoute.
   - Topic Cards carry no variables, so the card back shows equipment and skills only.
   - The Fit Score equipment factor rarely matches, because mobile resources are broad categories.
   - There is no automated phone-width overflow test, because the Flutter test font mis-measures Thai; check layouts in Chrome at 360px (`flutter run -d web-server`) instead.
   - Two duplicate cloudflared quick-tunnel processes run on the PC; they are no longer needed.

## 8. Ground rules

- No `shorebird patch` / `release` to `stable`, no push to `main` and no Supabase deploys without the owner's go-ahead. Pushing to `main` runs migrations against production.
- Never ship secrets in the app, never log prompts, model output or keys, and never rewrite git history.
- UI copy is Thai. Use the glossary terms, and never present AI or seed content as verified, novel or safe.
- Every new mobile feature gets a test; keep `flutter analyze` clean.
