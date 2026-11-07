# Independent foundation review — initial

Verdict: **REQUEST CHANGES (foundation scope only)**. Read-only fresh-agent review of current uncommitted source; no tests rerun by reviewer, no credential reads or remote writes.

## Blocking findings

1. **P2: abandoned reservations cannot recover after worker termination.** `supabase/migrations/202611060002_card_quota.sql` pending batches have no expiry or fenced reclamation. A dead worker retains reserved allowance until the day changes; the same intent returns pending indefinitely. Required: bounded recovery under the owner lock, new lease fencing old workers, tests covering pending work and restart.
2. **Release security gate: unbounded coaching/model starts.** No shared request limiter precedes upstream model execution or topic creation. Per-conversation history limits do not cap new-topic floods or overlapping requests. Add shared limits or verify external mitigation before exposure. This is separate from DEF02–04.

## Controls reviewed as sound

Verified `getUser` account ownership, signed production Guest capabilities, production fail-closed storage selection, own-account RLS/read grants and service-only mutation RPCs, owner locking/generation/CAS/wipe, PKCE/redirect allowlist/cookie flags and optional-login disclosures.

No approval of live OAuth, hosted PostgREST/RLS, deployment, external throttling, dependency remediation or whole-app release is implied. Follow-up review required after fixes.
