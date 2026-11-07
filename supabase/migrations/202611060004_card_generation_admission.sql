-- Fresh starter-card generation admission. Additive: replaces only the
-- admission function to accept kind 'cards' (6/owner/min + 60 global/min),
-- checked BEFORE any upstream model call so failed generations (which are never
-- charged against the daily card allowance) cannot be retried unboundedly.
-- Auth/coach limits are unchanged. Apply after 0001–0003, same review gate.
BEGIN;
CREATE OR REPLACE FUNCTION public.edu_rate_admission(p_owner text,p_kind text) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('auth','coach','cards') THEN RAISE EXCEPTION 'INVALID_RATE_KIND' USING ERRCODE='P0400'; END IF;
  DELETE FROM public.edu_rate_windows WHERE expires_at<now()-interval '1 day';
  IF NOT public.edu_rate_take(p_kind||':'||p_owner,CASE p_kind WHEN 'coach' THEN 12 ELSE 6 END,CASE p_kind WHEN 'auth' THEN 600 ELSE 60 END) THEN RETURN false; END IF;
  RETURN public.edu_rate_take(p_kind||':global',CASE p_kind WHEN 'auth' THEN 30 ELSE 60 END,60);
END $$;
REVOKE ALL ON FUNCTION public.edu_rate_admission(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.edu_rate_admission(text,text) TO service_role;
COMMIT;
