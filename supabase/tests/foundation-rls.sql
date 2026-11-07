-- Run against a disposable LOCAL Supabase/Postgres test DB or, only after
-- release approval, the exact target using synthetic fixture IDs. Always ROLLBACK.
-- Requires a DB operator able to SET ROLE; never uses/modifies auth.users.
BEGIN;
CREATE TEMP TABLE edu_rls_fixture AS SELECT gen_random_uuid() AS a,gen_random_uuid() AS b,gen_random_uuid() AS record_id;
GRANT SELECT ON edu_rls_fixture TO authenticated, service_role;
SET LOCAL ROLE service_role;
SELECT public.edu_bind_owner('u:'||a::text) FROM edu_rls_fixture;
SELECT public.edu_foundation('u:'||a::text,1,'write',jsonb_build_object('collection','coaching','key','rls-script-synthetic','expected',null,
  'next',jsonb_build_object('id',record_id,'revision',1,'data',jsonb_build_object('synthetic',true)))) FROM edu_rls_fixture;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',a::text,true) FROM edu_rls_fixture;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.edu_records WHERE record_key='rls-script-synthetic')<>1 THEN RAISE EXCEPTION 'RLS owner read failed'; END IF;
  BEGIN
    DELETE FROM public.edu_records WHERE record_key='rls-script-synthetic';
    RAISE EXCEPTION 'RLS client write was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF has_function_privilege('authenticated','public.edu_bind_owner(text)','EXECUTE') THEN RAISE EXCEPTION 'RPC is public'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',b::text,true) FROM edu_rls_fixture;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.edu_records WHERE record_key='rls-script-synthetic')<>0 THEN RAISE EXCEPTION 'RLS cross-owner leak'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM public.edu_records;
    RAISE EXCEPTION 'Anonymous read was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
ROLLBACK;
