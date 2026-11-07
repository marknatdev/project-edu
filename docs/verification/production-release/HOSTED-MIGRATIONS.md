# Hosted Supabase migration apply — 2026-11-07

Target: `ppctndzkerwiokjfaklw` (Project Edu, ap-southeast-1, Postgres 17). Source commit `0ce1795` (main). Pre-apply readback: zero migrations, zero public tables.

## Applied
| Remote version | Name | Local file (sha256) | Result |
|---|---|---|---|
| 20261107040501 | foundation | 202611060001 (`177d847b…25a4`) | applied |
| 20261107040555 | card_quota | 202611060002 (`fb248ea0…4479`) | applied |
| 20261107040630 | rate_admission | 202611060003 (`9936b872…e823`) | applied |
| 20261107040631 | evaluate_pivot_admission | 202611060005 (`edd655d9…be17`) | applied |
| 20261107040700 | card_generation_admission | 202611060004 (`9f01b756…717d`) | tracking reconciled |
| 20261107040701 | semantic_acceptance | 202611060006 (`8d7a8dde…ebfd7`) | tracking reconciled |

0003–0006 were submitted concurrently; 0004 and 0006 collided on the tracking version (`schema_migrations_pkey`) after their DDL ran. Live state was verified rather than re-executed:
- `edu_rate_admission` body is 0005's (kinds `auth,coach,cards,evaluate,pivot`; coach/pivot 12/min) — 0004 is fully superseded by 0005.
- `edu_card_operation` contains exactly one `LEDGER_CHANGED` guard (0006 applied once; it refuses re-apply).
Tracking rows for 0004/0006 were inserted with an explanatory statement (`created_by = hermes-reconcile`).

## Post-apply verification
- 8 app tables, all RLS enabled. Policies: read-own SELECT for `authenticated` on `edu_records`, `edu_daily_quota`, `edu_generated_cards` only.
- Table grants to anon/authenticated/PUBLIC: only those three SELECTs.
- All 7 app functions: SECURITY INVOKER, `search_path=""`, EXECUTE service_role only (anon/authenticated false).
- RLS probe (single DO block, rolled back by design via exception; residue check 0 rows): user A sees 1/1 own record, 0 of B's records/quota; `edu_owners` denied; direct INSERT denied; `edu_foundation` RPC denied; user B sees 0 of A's; anon denied on `edu_records`. This is DB-level RLS with simulated JWT claims, not a PostgREST/Auth end-to-end test.
- Security advisor: INFO `rls_enabled_no_policy` ×5 (intended: service-only tables). WARN 0028/0029 on pre-existing `public.rls_auto_enable()` (event-trigger function, not created by these migrations) — unchanged, pending owner decision.

## Vercel configuration set (non-secret, Production)
`APP_ORIGIN=https://project-edu-orcin.vercel.app`, `PERSISTENCE_BACKEND=supabase`.
Still absent (user enters in Vercel UI): `SUPABASE_SERVICE_ROLE_KEY`, `APP_GUEST_SECRET`, `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`.
