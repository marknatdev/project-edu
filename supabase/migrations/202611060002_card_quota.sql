-- Owner-serialized reservations; service-role-only mutation. Apply with 0001.
BEGIN;
CREATE TABLE public.edu_daily_quota (
  owner_key text NOT NULL REFERENCES public.edu_owners(owner_key),
  quota_day date NOT NULL, kind text NOT NULL CHECK (kind IN ('cards','evaluate','proposal')),
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  CHECK (used + reserved <= CASE kind WHEN 'cards' THEN 35 WHEN 'evaluate' THEN 5 ELSE 2 END),
  PRIMARY KEY(owner_key,quota_day,kind)
);
CREATE TABLE public.edu_card_batches (
  owner_key text NOT NULL REFERENCES public.edu_owners(owner_key), request_id uuid NOT NULL,
  fingerprint text NOT NULL CHECK (length(fingerprint) BETWEEN 1 AND 200),
  lease_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), quota_day date NOT NULL,
  lease_expires_at timestamptz NOT NULL DEFAULT now()+interval '120 seconds', expired boolean NOT NULL DEFAULT false,
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 5),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','complete','failed')),
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY(owner_key,request_id)
);
CREATE TABLE public.edu_generated_cards (
  owner_key text NOT NULL REFERENCES public.edu_owners(owner_key),
  fingerprint text NOT NULL, card_id text NOT NULL, data jsonb NOT NULL,
  PRIMARY KEY(owner_key,fingerprint), UNIQUE(owner_key,card_id)
);
CREATE TABLE public.edu_quota_receipts (
  owner_key text NOT NULL REFERENCES public.edu_owners(owner_key), kind text NOT NULL,
  request_id uuid NOT NULL, fingerprint text NOT NULL, count integer NOT NULL CHECK(count>0), result jsonb NOT NULL,
  PRIMARY KEY(owner_key,kind,request_id)
);
ALTER TABLE public.edu_daily_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_generated_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_quota_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edu_daily_quota, public.edu_card_batches, public.edu_generated_cards, public.edu_quota_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.edu_daily_quota, public.edu_card_batches, public.edu_generated_cards, public.edu_quota_receipts TO service_role;
GRANT SELECT ON public.edu_daily_quota, public.edu_generated_cards TO authenticated;
CREATE POLICY edu_quota_read_own ON public.edu_daily_quota FOR SELECT TO authenticated USING (owner_key='u:'||(SELECT auth.uid())::text);
CREATE POLICY edu_cards_read_own ON public.edu_generated_cards FOR SELECT TO authenticated USING (owner_key='u:'||(SELECT auth.uid())::text);
-- Batches contain private lease handles: NOT directly selectable by browser roles.

CREATE FUNCTION public.edu_bangkok_day(p_time timestamptz DEFAULT now()) RETURNS date
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT (p_time AT TIME ZONE 'Asia/Bangkok')::date $$;
CREATE FUNCTION public.edu_card_quota(p_owner text,p_day date) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT jsonb_build_object('day',p_day,'used',coalesce(q.used,0),'reserved',coalesce(q.reserved,0),
    'remaining',35-coalesce(q.used,0)-coalesce(q.reserved,0),'freeRemaining',greatest(0,5-coalesce(q.used,0)),
    'extraRemaining',30-greatest(0,coalesce(q.used,0)-5),
    'resetAt',to_char(((p_day+1)::timestamp AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'))
  FROM (VALUES(1)) AS x(n) LEFT JOIN public.edu_daily_quota q ON q.owner_key=p_owner AND q.quota_day=p_day AND q.kind='cards'
$$;
CREATE FUNCTION public.edu_card_operation(p_owner text,p_epoch integer,p_op text,p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_owner public.edu_owners; v_batch public.edu_card_batches; v_quota public.edu_daily_quota;
  v_day date := public.edu_bangkok_day(); v_count integer; v_claimed boolean := false;
  v_item jsonb; v_cards jsonb := '[]'::jsonb; v_inserted integer; v_kind text;
  v_receipt public.edu_quota_receipts; v_result jsonb; v_limit integer; v_allowed boolean; v_ttl integer;
BEGIN
  SELECT * INTO v_owner FROM public.edu_owners WHERE owner_key=p_owner FOR UPDATE;
  IF NOT FOUND OR v_owner.revoked OR v_owner.generation<>p_epoch THEN RAISE EXCEPTION 'OWNER_REVOKED' USING ERRCODE='P0410'; END IF;
  -- Expire only reservations, never charge unsuccessful work. Reclamation gets
  -- a new opaque lease so a resumed/zombie worker cannot commit after expiry.
  UPDATE public.edu_daily_quota q SET reserved=q.reserved-expired.capacity FROM
    (SELECT quota_day,sum(capacity)::int AS capacity FROM public.edu_card_batches WHERE owner_key=p_owner AND state='pending' AND lease_expires_at<=now() GROUP BY quota_day) expired
    WHERE q.owner_key=p_owner AND q.kind='cards' AND q.quota_day=expired.quota_day;
  UPDATE public.edu_card_batches SET state='failed',expired=true WHERE owner_key=p_owner AND state='pending' AND lease_expires_at<=now();
  IF p_op='wipe' THEN
    DELETE FROM public.edu_quota_receipts WHERE owner_key=p_owner;
    DELETE FROM public.edu_card_batches WHERE owner_key=p_owner;
    DELETE FROM public.edu_generated_cards WHERE owner_key=p_owner;
    -- Erase content, but keep the same account's today counters (numbers only)
    -- so a wipe cannot renew daily AI allowances. Abandoned reservations are
    -- released (their batches are erased); a revoked Guest keeps nothing.
    DELETE FROM public.edu_daily_quota WHERE owner_key=p_owner AND (left(p_owner,2)='g:' OR quota_day<>v_day);
    UPDATE public.edu_daily_quota SET reserved=0 WHERE owner_key=p_owner;
    RETURN 'null'::jsonb;
  ELSIF p_op='cardQuota' THEN RETURN public.edu_card_quota(p_owner,v_day);
  ELSIF p_op='quotaStatus' THEN
    v_kind:=p_input->>'kind';
    IF v_kind IS NULL OR v_kind NOT IN ('evaluate','proposal') THEN RAISE EXCEPTION 'INVALID_QUOTA' USING ERRCODE='P0400'; END IF;
    v_limit:=CASE v_kind WHEN 'evaluate' THEN 5 ELSE 2 END;
    SELECT * INTO v_quota FROM public.edu_daily_quota WHERE owner_key=p_owner AND quota_day=v_day AND kind=v_kind;
    RETURN jsonb_build_object('used',coalesce(v_quota.used,0),'remaining',v_limit-coalesce(v_quota.used,0),'limit',v_limit,
      'resetAt',to_char(((v_day+1)::timestamp AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  ELSIF p_op='listCards' THEN
    v_limit:=(p_input->>'limit')::int;
    IF v_limit IS NULL OR v_limit<1 OR v_limit>100 THEN RAISE EXCEPTION 'INVALID_LIMIT' USING ERRCODE='P0400'; END IF;
    SELECT coalesce(jsonb_agg(data ORDER BY fingerprint),'[]'::jsonb) INTO v_cards FROM
      (SELECT data,fingerprint FROM public.edu_generated_cards WHERE owner_key=p_owner AND fingerprint>coalesce(p_input->>'cursor','') ORDER BY fingerprint LIMIT v_limit) AS page;
    SELECT jsonb_build_object('cards',v_cards,'nextCursor',CASE WHEN count(*)>v_limit THEN min(fingerprint) FILTER(WHERE n=v_limit) ELSE NULL END) INTO v_result FROM
      (SELECT fingerprint,row_number() OVER(ORDER BY fingerprint) AS n FROM public.edu_generated_cards WHERE owner_key=p_owner AND fingerprint>coalesce(p_input->>'cursor','') ORDER BY fingerprint LIMIT v_limit+1) AS page;
    RETURN v_result;
  ELSIF p_op='beginBatch' THEN
    v_ttl:=coalesce((p_input->>'leaseSeconds')::int,120);
    IF v_ttl<1 OR v_ttl>600 THEN RAISE EXCEPTION 'INVALID_LEASE' USING ERRCODE='P0400'; END IF;
    SELECT * INTO v_batch FROM public.edu_card_batches WHERE owner_key=p_owner AND request_id=(p_input->>'requestId')::uuid;
    IF FOUND THEN
      IF v_batch.fingerprint<>p_input->>'fingerprint' OR v_batch.capacity<>(p_input->>'count')::int THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='P0409'; END IF;
    END IF;
    IF v_batch.lease_id IS NULL OR v_batch.expired THEN
      v_count := (p_input->>'count')::int;
      IF v_count IS NULL OR v_count NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'INVALID_COUNT' USING ERRCODE='P0400'; END IF;
      INSERT INTO public.edu_daily_quota(owner_key,quota_day,kind) VALUES(p_owner,v_day,'cards') ON CONFLICT DO NOTHING;
      SELECT * INTO v_quota FROM public.edu_daily_quota WHERE owner_key=p_owner AND quota_day=v_day AND kind='cards';
      IF v_quota.used+v_quota.reserved+v_count>35 THEN RAISE EXCEPTION 'QUOTA_EXCEEDED' USING ERRCODE='P0429'; END IF;
      INSERT INTO public.edu_card_batches(owner_key,request_id,fingerprint,quota_day,capacity,lease_expires_at)
        VALUES(p_owner,(p_input->>'requestId')::uuid,p_input->>'fingerprint',v_day,v_count,now()+make_interval(secs=>v_ttl))
        ON CONFLICT(owner_key,request_id) DO UPDATE SET lease_id=gen_random_uuid(),lease_expires_at=excluded.lease_expires_at,quota_day=excluded.quota_day,state='pending',expired=false,cards='[]'::jsonb
        RETURNING * INTO v_batch;
      UPDATE public.edu_daily_quota SET reserved=reserved+v_count WHERE owner_key=p_owner AND quota_day=v_day AND kind='cards';
      v_claimed := true;
    END IF;
  ELSIF p_op IN ('completeBatch','failBatch') THEN
    SELECT * INTO v_batch FROM public.edu_card_batches WHERE owner_key=p_owner AND lease_id=(p_input->>'leaseId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'BATCH_NOT_FOUND' USING ERRCODE='P0404'; END IF;
    IF v_batch.expired THEN RAISE EXCEPTION 'LEASE_EXPIRED' USING ERRCODE='P0409'; END IF;
    IF v_batch.state='pending' THEN
      IF p_op='completeBatch' THEN
        IF jsonb_typeof(p_input->'cards') IS DISTINCT FROM 'array' OR jsonb_array_length(p_input->'cards')>5 THEN RAISE EXCEPTION 'INVALID_CARDS' USING ERRCODE='P0400'; END IF;
        FOR v_item IN SELECT value FROM jsonb_array_elements(p_input->'cards') LOOP
          EXIT WHEN jsonb_array_length(v_cards)>=v_batch.capacity;
          INSERT INTO public.edu_generated_cards(owner_key,fingerprint,card_id,data)
            VALUES(p_owner,v_item->>'fingerprint',v_item->'card'->>'id',v_item->'card') ON CONFLICT DO NOTHING;
          GET DIAGNOSTICS v_inserted=ROW_COUNT;
          IF v_inserted=1 THEN v_cards := v_cards || jsonb_build_array(v_item->'card'); END IF;
        END LOOP;
      END IF;
      UPDATE public.edu_daily_quota SET reserved=reserved-v_batch.capacity,used=used+jsonb_array_length(v_cards)
        WHERE owner_key=p_owner AND quota_day=v_batch.quota_day AND kind='cards';
      UPDATE public.edu_card_batches SET cards=v_cards,state=CASE WHEN jsonb_array_length(v_cards)>0 THEN 'complete' ELSE 'failed' END
        WHERE owner_key=p_owner AND request_id=v_batch.request_id RETURNING * INTO v_batch;
    END IF;
  ELSIF p_op='consumeQuota' THEN
    v_kind:=p_input->>'kind'; v_count:=coalesce((p_input->>'count')::int,1);
    IF v_kind IS NULL OR v_kind NOT IN ('evaluate','proposal') OR v_count<1 THEN RAISE EXCEPTION 'INVALID_QUOTA' USING ERRCODE='P0400'; END IF;
    SELECT * INTO v_receipt FROM public.edu_quota_receipts WHERE owner_key=p_owner AND kind=v_kind AND request_id=(p_input->>'requestId')::uuid;
    IF FOUND THEN
      IF v_receipt.fingerprint<>p_input->>'fingerprint' OR v_receipt.count<>v_count THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='P0409'; END IF;
      RETURN v_receipt.result;
    END IF;
    v_limit:=CASE v_kind WHEN 'evaluate' THEN 5 ELSE 2 END;
    INSERT INTO public.edu_daily_quota(owner_key,quota_day,kind) VALUES(p_owner,v_day,v_kind) ON CONFLICT DO NOTHING;
    SELECT * INTO v_quota FROM public.edu_daily_quota WHERE owner_key=p_owner AND quota_day=v_day AND kind=v_kind;
    v_allowed := v_quota.used+v_count<=v_limit;
    IF v_allowed THEN
      UPDATE public.edu_daily_quota SET used=used+v_count WHERE owner_key=p_owner AND quota_day=v_day AND kind=v_kind RETURNING * INTO v_quota;
    END IF;
    v_result:=jsonb_build_object('allowed',v_allowed,'used',v_quota.used,'remaining',v_limit-v_quota.used,
      'resetAt',to_char(((v_day+1)::timestamp AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'));
    INSERT INTO public.edu_quota_receipts VALUES(p_owner,v_kind,(p_input->>'requestId')::uuid,p_input->>'fingerprint',v_count,v_result);
    RETURN v_result;
  ELSE RAISE EXCEPTION 'UNKNOWN_OPERATION' USING ERRCODE='P0400';
  END IF;
  RETURN jsonb_build_object('requestId',v_batch.request_id,'leaseId',v_batch.lease_id,'leaseExpiresAt',to_char(v_batch.lease_expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'claimed',v_claimed,'state',v_batch.state,
    'reserved',CASE WHEN v_batch.state='pending' THEN v_batch.capacity ELSE 0 END,'cards',v_batch.cards,'quota',public.edu_card_quota(p_owner,v_batch.quota_day));
END $$;
REVOKE ALL ON FUNCTION public.edu_bangkok_day(timestamptz), public.edu_card_quota(text,date), public.edu_card_operation(text,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edu_bangkok_day(timestamptz), public.edu_card_quota(text,date), public.edu_card_operation(text,integer,text,jsonb) TO service_role;
COMMIT;
