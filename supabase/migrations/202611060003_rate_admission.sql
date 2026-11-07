-- Shared admission limits bound fresh-owner/model floods across instances.
BEGIN;
CREATE TABLE public.edu_rate_windows(bucket text PRIMARY KEY,used integer NOT NULL CHECK(used>0),expires_at timestamptz NOT NULL);
CREATE INDEX edu_rate_expiry ON public.edu_rate_windows(expires_at);
ALTER TABLE public.edu_rate_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edu_rate_windows FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.edu_rate_windows TO service_role;
CREATE FUNCTION public.edu_rate_take(p_bucket text,p_limit integer,p_seconds integer) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_count integer;
BEGIN
  INSERT INTO public.edu_rate_windows VALUES(p_bucket,1,now()+make_interval(secs=>p_seconds))
    ON CONFLICT(bucket) DO UPDATE SET used=CASE WHEN public.edu_rate_windows.expires_at<=now() THEN 1 ELSE public.edu_rate_windows.used+1 END,
      expires_at=CASE WHEN public.edu_rate_windows.expires_at<=now() THEN excluded.expires_at ELSE public.edu_rate_windows.expires_at END
    WHERE public.edu_rate_windows.expires_at<=now() OR public.edu_rate_windows.used<p_limit RETURNING used INTO v_count;
  RETURN FOUND;
END $$;
CREATE FUNCTION public.edu_rate_admission(p_owner text,p_kind text) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF p_kind NOT IN ('auth','coach') OR p_kind IS NULL THEN RAISE EXCEPTION 'INVALID_RATE_KIND' USING ERRCODE='P0400'; END IF;
  DELETE FROM public.edu_rate_windows WHERE expires_at<now()-interval '1 day';
  IF NOT public.edu_rate_take(p_kind||':'||p_owner,CASE p_kind WHEN 'auth' THEN 6 ELSE 12 END,CASE p_kind WHEN 'auth' THEN 600 ELSE 60 END) THEN RETURN false; END IF;
  RETURN public.edu_rate_take(p_kind||':global',CASE p_kind WHEN 'auth' THEN 30 ELSE 60 END,60);
END $$;
REVOKE ALL ON FUNCTION public.edu_rate_take(text,integer,integer),public.edu_rate_admission(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.edu_rate_take(text,integer,integer),public.edu_rate_admission(text,text) TO service_role;
COMMIT;
