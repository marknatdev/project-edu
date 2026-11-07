-- CAS the complete accepted-card ledger, not the pre-model prompt snapshot.
-- Semantic screening runs in the trusted server adapter, then this owner-lock
-- guard proves its ledger is still current at acceptance. The ledger is append-
-- only within an owner generation; wipe increments generation (or revokes Guest).
-- Preserve the existing function OID, ACL, all quota/idempotency/lease branches.
BEGIN;
DO $migration$
DECLARE
  definition text;
  needle constant text := '    IF v_batch.state=''pending'' THEN';
BEGIN
  SELECT pg_get_functiondef('public.edu_card_operation(text,integer,text,jsonb)'::regprocedure) INTO definition;
  IF position('LEDGER_CHANGED' in definition)>0 THEN RAISE EXCEPTION 'semantic migration already applied'; END IF;
  IF (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 THEN
    RAISE EXCEPTION 'unexpected card operation definition; refusing partial upgrade';
  END IF;
  definition := replace(definition, needle,
$guard$    -- This executes after SELECT edu_owners FOR UPDATE and epoch/lease checks.
    -- A concurrent accepted batch changes the count, so the adapter must reread
    -- ALL pages and screen again before retrying. No model call in a transaction.
    IF p_op='completeBatch' AND v_batch.state='pending' AND
      ((p_input->>'ledgerCount') IS NULL OR (p_input->>'ledgerCount')::bigint <>
       (SELECT count(*) FROM public.edu_generated_cards WHERE owner_key=p_owner)) THEN
      RAISE EXCEPTION 'LEDGER_CHANGED' USING ERRCODE='P0409';
    END IF;
    IF v_batch.state='pending' THEN$guard$);
  EXECUTE definition;
END $migration$;
COMMIT;
