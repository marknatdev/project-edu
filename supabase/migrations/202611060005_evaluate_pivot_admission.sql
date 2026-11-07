-- DEF-02/03 release repair: independent admission for evaluation and Pivot.
-- Additive: replaces only edu_rate_admission to accept 'evaluate' (6/owner/min)
-- and 'pivot' (12/owner/min), each with a 60/min global ceiling, checked BEFORE
-- any upstream model call. Pivot no longer touches the daily proposal allowance;
-- evaluation keeps its 5/day allowance in edu_daily_quota. Auth/coach/cards
-- limits are unchanged. Apply after 0001-0004, same review gate.
BEGIN;
CREATE OR REPLACE FUNCTION public.edu_rate_admission(p_owner text,p_kind text) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('auth','coach','cards','evaluate','pivot') THEN RAISE EXCEPTION 'INVALID_RATE_KIND' USING ERRCODE='P0400'; END IF;
  DELETE FROM public.edu_rate_windows WHERE expires_at<now()-interval '1 day';
  IF NOT public.edu_rate_take(p_kind||':'||p_owner,CASE WHEN p_kind IN ('coach','pivot') THEN 12 ELSE 6 END,CASE p_kind WHEN 'auth' THEN 600 ELSE 60 END) THEN RETURN false; END IF;
  RETURN public.edu_rate_take(p_kind||':global',CASE p_kind WHEN 'auth' THEN 30 ELSE 60 END,60);
END $$;
REVOKE ALL ON FUNCTION public.edu_rate_admission(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.edu_rate_admission(text,text) TO service_role;
COMMIT;
