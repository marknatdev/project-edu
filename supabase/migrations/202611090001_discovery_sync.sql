-- Discovery Track sync (ADR 0008): swipes, Shortlist, Ideas, Active Idea and AI cards per account.
-- Signed-in apps call the RPCs below with their own JWT; rows are always scoped to auth.uid().
-- Newest action wins per item; on a tie the removal wins. seq is a server position used as the pull cursor.
BEGIN;

CREATE SEQUENCE public.edu_discovery_seq;

CREATE TABLE public.edu_discovery_items (
  owner_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('swipe','shortlist','idea','active_idea','ai_card')),
  item_id text NOT NULL CHECK (length(item_id) BETWEEN 1 AND 128),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 16384),
  deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL,
  seq bigint NOT NULL DEFAULT nextval('public.edu_discovery_seq'),
  PRIMARY KEY (owner_id, kind, item_id)
);
CREATE INDEX edu_discovery_items_owner_seq ON public.edu_discovery_items (owner_id, seq);

-- No table policies: clients never touch the table directly, only through the RPCs.
ALTER TABLE public.edu_discovery_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edu_discovery_items FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.edu_discovery_items TO service_role;
REVOKE ALL ON SEQUENCE public.edu_discovery_seq FROM PUBLIC, anon, authenticated;
GRANT ALL ON SEQUENCE public.edu_discovery_seq TO service_role;

CREATE FUNCTION public.edu_discovery_uid() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'is_anonymous', 'false') = 'true' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0401';
  END IF;
  RETURN v_uid;
END $$;

CREATE FUNCTION public.edu_discovery_push(p_items jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := public.edu_discovery_uid();
  v_item jsonb;
  v_at timestamptz;
  v_applied integer := 0;
  v_rows integer;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 500 THEN
    RAISE EXCEPTION 'INVALID_ITEMS' USING ERRCODE = 'P0400';
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_at := (v_item ->> 'updatedAt')::timestamptz;
    -- A device clock far in the future would win every later merge; refuse it.
    IF v_at IS NULL OR v_at > now() + interval '1 day' THEN
      RAISE EXCEPTION 'INVALID_TIMESTAMP' USING ERRCODE = 'P0400';
    END IF;
    INSERT INTO public.edu_discovery_items AS t (owner_id, kind, item_id, payload, deleted, updated_at)
    VALUES (v_uid, v_item ->> 'kind', v_item ->> 'itemId', coalesce(v_item -> 'payload', '{}'::jsonb),
            coalesce((v_item ->> 'deleted')::boolean, false), v_at)
    ON CONFLICT (owner_id, kind, item_id) DO UPDATE
      SET payload = EXCLUDED.payload, deleted = EXCLUDED.deleted, updated_at = EXCLUDED.updated_at,
          seq = nextval('public.edu_discovery_seq')
      WHERE EXCLUDED.updated_at > t.updated_at
         OR (EXCLUDED.updated_at = t.updated_at AND EXCLUDED.deleted AND NOT t.deleted);
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_applied := v_applied + v_rows;
  END LOOP;
  RETURN v_applied;
END $$;

-- shortcut: a cursor can skip a row whose seq was taken by a transaction that commits after a later one;
-- with one learner pushing from a few devices this is rare, and the next push of that item repairs it.
CREATE FUNCTION public.edu_discovery_pull(p_after bigint DEFAULT 0, p_limit integer DEFAULT 500) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := public.edu_discovery_uid();
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'items', coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'itemId', item_id, 'payload', payload,
                 'deleted', deleted, 'updatedAt', updated_at, 'seq', seq) ORDER BY seq), '[]'::jsonb),
      'cursor', max(seq))
    FROM (
      SELECT * FROM public.edu_discovery_items
      WHERE owner_id = v_uid AND seq > coalesce(p_after, 0)
      ORDER BY seq LIMIT least(greatest(coalesce(p_limit, 500), 1), 1000)
    ) page
  );
END $$;

CREATE FUNCTION public.edu_discovery_wipe() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.edu_discovery_items WHERE owner_id = public.edu_discovery_uid();
END $$;

REVOKE ALL ON FUNCTION public.edu_discovery_uid(), public.edu_discovery_push(jsonb),
  public.edu_discovery_pull(bigint, integer), public.edu_discovery_wipe() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edu_discovery_push(jsonb), public.edu_discovery_pull(bigint, integer),
  public.edu_discovery_wipe() TO authenticated;

-- PDPA wipe from the web bumps the owner generation; account discovery rows go with it.
CREATE FUNCTION public.edu_discovery_wipe_on_generation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.generation > OLD.generation AND left(NEW.owner_key, 2) = 'u:' THEN
    DELETE FROM public.edu_discovery_items WHERE owner_id = substr(NEW.owner_key, 3)::uuid;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.edu_discovery_wipe_on_generation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER edu_discovery_wipe_on_generation AFTER UPDATE OF generation ON public.edu_owners
  FOR EACH ROW EXECUTE FUNCTION public.edu_discovery_wipe_on_generation();

COMMIT;
