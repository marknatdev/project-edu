# Release repairs — confirmed seams

User continuation on task t_5c005460 confirms public HTTP evaluation, Pivot, proposal, coaching and fresh-card endpoints with verified Guest/account sessions; Save/Export and OAuth start/callback/logout browser flows; Supabase persistence exercised through those interfaces.

Existing partial repairs and red logs are retained, not treated as proof. Resumed baseline: `resume-baseline.txt` has 15 failures caused by incomplete migration of legacy callers/tests; new repair route and real-Postgres tests pass. Each further behavior change is preceded by a failing seam test/browser check. No production writes, commit, push or deployment in this implementation phase.
