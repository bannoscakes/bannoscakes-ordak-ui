-- Migration: Test and debugging functions (optional)
-- Generated: 2025-11-07T05:15:46.199Z
-- Functions: 2

-- Function 1/2: test_auth
CREATE OR REPLACE FUNCTION public.test_auth()
 RETURNS TABLE(user_id uuid, user_email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    auth.email() as user_email;
END;
$function$
;

-- Function 2/2: test_rpc_call
CREATE OR REPLACE FUNCTION public.test_rpc_call()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN 'RPC function called successfully at ' || NOW()::text || ' by user ' || COALESCE(auth.uid()::text, 'NULL');
END;
$function$
;

