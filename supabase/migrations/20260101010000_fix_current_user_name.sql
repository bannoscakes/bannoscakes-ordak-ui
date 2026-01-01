-- Migration: Fix current_user_name to use staff_shared.full_name
-- Issue: #580 - Messages show 'Unknown' sender name instead of actual user name
--
-- Problem: current_user_name() relies on JWT user_metadata.full_name which may be
-- missing or outdated. Falls back to email, causing "panos@bannos.com.au" instead
-- of "Panos Panayi".
--
-- Solution: Look up full_name from staff_shared table first, which is the
-- authoritative source for user display names.

CREATE OR REPLACE FUNCTION public.current_user_name()
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
AS $function$
  SELECT COALESCE(
    -- 1. First try staff_shared (authoritative source)
    (SELECT s.full_name FROM public.staff_shared s WHERE s.user_id = auth.uid()),
    -- 2. Fall back to JWT user_metadata
    (auth.jwt() -> 'user_metadata' ->> 'full_name'),
    -- 3. Fall back to email
    (auth.jwt() ->> 'email'),
    -- 4. Final fallback
    'Unknown'
  );
$function$;

-- Set search_path for security
ALTER FUNCTION public.current_user_name() SET search_path = 'public';

-- Restrict access: SECURITY DEFINER functions should not be callable by PUBLIC
REVOKE ALL ON FUNCTION public.current_user_name() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_name() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.current_user_name() IS
  'Returns display name for current user. Priority: staff_shared.full_name > JWT full_name > email > Unknown';
