# Independent foundation review — follow-up

Verdict at review time: **REQUEST CHANGES — callback regression**. Read-only fresh-agent source/log review; reviewer did not mutate files or run tests.

Prior findings were addressed: bounded owner-locked batch expiry/reclamation with new opaque lease fencing and native pending-worker restart coverage; service-only atomic per-owner/global model admission before upstream work.

New P2 finding: `SameSite=Strict` Guest cookie is omitted on the cross-site OAuth return. Applying a newly minted admission-only Guest principal to the callback response replaces the browser's existing persistent capability and loses access to Guest server work. Required fix: callback must not issue/replace the persistent Guest capability. Keep Strict protection; do not weaken SameSite merely to mask the issue. Test production admission with only the Lax PKCE verifier present.

Resolution is tracked in `red-20-strict-guest-callback.txt` and the final regression logs: callback admission remains checked but its Guest cookies are not applied. This report records the actual independent finding, not a claim of final independent approval. Full application/release approval remains downstream.

Visual self-review also found the login dialog primary label rendered white-on-white due to conflicting Tailwind background classes. Use a single explicit primary variant; final browser runner checks primary foreground/background differ and recaptures screenshots.
