-- Additive application schema only. Do not run until independent release review.
-- No auth.users changes, no identity/email/profile copies. All writes are server-only.
BEGIN;
CREATE TABLE public.edu_owners (
  owner_key text PRIMARY KEY CHECK (owner_key ~ '^(g:[a-f0-9]{64}|u:[a-f0-9-]{36})$'),
  generation integer NOT NULL DEFAULT 1 CHECK (generation > 0),
  revoked boolean NOT NULL DEFAULT false
);
CREATE TABLE public.edu_records (
  owner_key text NOT NULL REFERENCES public.edu_owners(owner_key),
  collection text NOT NULL CHECK (collection IN ('coaching','discovery','pivot')),
  record_key text NOT NULL CHECK (length(record_key) BETWEEN 1 AND 200),
  id uuid NOT NULL UNIQUE,
  revision integer NOT NULL CHECK (revision > 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND octet_length(data::text) <= 524288),
  PRIMARY KEY(owner_key, collection, record_key)
);
CREATE TABLE public.edu_record_receipts (
  owner_key text NOT NULL REFERENCES public.edu_owners(owner_key),
  collection text NOT NULL, request_id uuid NOT NULL,
  record_key text NOT NULL, record_id uuid NOT NULL, fingerprint text NOT NULL,
  PRIMARY KEY(owner_key, collection, request_id)
);
ALTER TABLE public.edu_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_record_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edu_owners, public.edu_records, public.edu_record_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.edu_owners, public.edu_records, public.edu_record_receipts TO service_role;
-- Signed-in users may read only their own app snapshots. No direct client writes,
-- even to their own row: progression/quota is server authority, not editable JSON.
GRANT SELECT ON public.edu_records TO authenticated;
CREATE POLICY edu_records_read_own ON public.edu_records FOR SELECT TO authenticated
  USING (owner_key = 'u:' || (SELECT auth.uid())::text);

CREATE FUNCTION public.edu_bind_owner(p_owner text) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v public.edu_owners;
BEGIN
  INSERT INTO public.edu_owners(owner_key) VALUES(p_owner) ON CONFLICT DO NOTHING;
  SELECT * INTO v FROM public.edu_owners WHERE owner_key = p_owner FOR UPDATE;
  IF v.revoked THEN RAISE EXCEPTION 'OWNER_REVOKED' USING ERRCODE = 'P0410'; END IF;
  RETURN v.generation;
END $$;
REVOKE ALL ON FUNCTION public.edu_bind_owner(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edu_bind_owner(text) TO service_role;

CREATE FUNCTION public.edu_foundation(p_owner text, p_epoch integer, p_op text, p_input jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_owner public.edu_owners;
  v_row public.edu_records;
  v_receipt public.edu_record_receipts;
  v_next jsonb; v_expected jsonb;
  v_collection text := p_input->>'collection';
  v_key text := p_input->>'key';
BEGIN
  -- One owner row lock serializes transactions across ALL instances, including
  -- wipe/open/reset/commit. Never hold this lock during an upstream AI call.
  SELECT * INTO v_owner FROM public.edu_owners WHERE owner_key = p_owner FOR UPDATE;
  IF NOT FOUND OR v_owner.revoked OR v_owner.generation <> p_epoch THEN
    RAISE EXCEPTION 'OWNER_REVOKED' USING ERRCODE = 'P0410';
  END IF;
  IF p_op IN ('read','readById') THEN
    SELECT * INTO v_row FROM public.edu_records WHERE owner_key=p_owner AND collection=v_collection
      AND ((p_op='read' AND record_key=v_key) OR (p_op='readById' AND id=(p_input->>'id')::uuid));
    IF NOT FOUND THEN RETURN 'null'::jsonb; END IF;
    RETURN jsonb_build_object('id',v_row.id,'revision',v_row.revision,'data',v_row.data);
  ELSIF p_op = 'write' THEN
    SELECT * INTO v_row FROM public.edu_records WHERE owner_key=p_owner AND collection=v_collection AND record_key=v_key;
    IF p_input->'receipt' IS NOT NULL THEN
      SELECT * INTO v_receipt FROM public.edu_record_receipts WHERE owner_key=p_owner AND collection=v_collection AND request_id=(p_input->'receipt'->>'id')::uuid;
      IF FOUND THEN
        IF v_receipt.fingerprint <> p_input->'receipt'->>'fingerprint' OR v_receipt.record_key <> v_key OR v_receipt.record_id IS DISTINCT FROM v_row.id THEN
          RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = 'P0409';
        END IF;
        RETURN jsonb_build_object('id',v_row.id,'revision',v_row.revision,'data',v_row.data);
      END IF;
    END IF;
    v_next := p_input->'next'; v_expected := p_input->'expected';
    IF v_expected IS NULL OR v_expected = 'null'::jsonb THEN
      IF v_row.id IS NOT NULL THEN
        RETURN jsonb_build_object('id',v_row.id,'revision',v_row.revision,'data',v_row.data);
      END IF;
      IF (v_next->>'revision')::int <> 1 THEN RAISE EXCEPTION 'INVALID_REVISION' USING ERRCODE='P0400'; END IF;
      INSERT INTO public.edu_records VALUES(p_owner,v_collection,v_key,(v_next->>'id')::uuid,1,v_next->'data') RETURNING * INTO v_row;
    ELSE
      IF v_row.id IS NULL OR v_row.id <> (v_expected->>'id')::uuid OR
        (v_expected->>'revision' IS NOT NULL AND v_row.revision <> (v_expected->>'revision')::int) THEN
        RAISE EXCEPTION 'REVISION_CONFLICT' USING ERRCODE = 'P0409';
      END IF;
      IF v_expected->>'revision' IS NULL THEN
        IF (v_next->>'revision')::int <> 1 OR (v_next->>'id')::uuid = v_row.id THEN RAISE EXCEPTION 'INVALID_RESET' USING ERRCODE='P0400'; END IF;
      ELSIF (v_next->>'revision')::int <> v_row.revision + 1 OR (v_next->>'id')::uuid <> v_row.id THEN
        RAISE EXCEPTION 'INVALID_REVISION' USING ERRCODE='P0400';
      END IF;
      UPDATE public.edu_records SET id=(v_next->>'id')::uuid,revision=(v_next->>'revision')::int,data=v_next->'data'
        WHERE owner_key=p_owner AND collection=v_collection AND record_key=v_key RETURNING * INTO v_row;
    END IF;
    IF p_input->'receipt' IS NOT NULL THEN
      INSERT INTO public.edu_record_receipts VALUES(p_owner,v_collection,(p_input->'receipt'->>'id')::uuid,v_key,v_row.id,p_input->'receipt'->>'fingerprint');
    END IF;
    RETURN jsonb_build_object('id',v_row.id,'revision',v_row.revision,'data',v_row.data);
  ELSIF p_op = 'wipe' THEN
    PERFORM public.edu_card_operation(p_owner,p_epoch,'wipe','{}'::jsonb);
    DELETE FROM public.edu_record_receipts WHERE owner_key=p_owner;
    DELETE FROM public.edu_records WHERE owner_key=p_owner;
    UPDATE public.edu_owners SET generation=generation+1,revoked=(left(p_owner,2)='g:') WHERE owner_key=p_owner;
    RETURN 'null'::jsonb;
  END IF;
  IF p_op IN ('cardQuota','quotaStatus','listCards','beginBatch','completeBatch','failBatch','consumeQuota') THEN
    RETURN public.edu_card_operation(p_owner,p_epoch,p_op,p_input);
  END IF;
  IF p_op='allowRequest' THEN RETURN to_jsonb(public.edu_rate_admission(p_owner,p_input->>'kind')); END IF;
  RAISE EXCEPTION 'UNKNOWN_OPERATION' USING ERRCODE = 'P0400';
END $$;
REVOKE ALL ON FUNCTION public.edu_foundation(text,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edu_foundation(text,integer,text,jsonb) TO service_role;
COMMIT;
