CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT au.email INTO v_email
  FROM auth.users au
  JOIN public.profiles p ON p.id = au.id
  WHERE p.cod_username = p_username
  LIMIT 1;
  
  RETURN v_email;
END;
$$;
