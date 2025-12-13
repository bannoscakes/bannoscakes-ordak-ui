-- Migration: Fix app_role() to use fully qualified references
-- Purpose: Ensure app_role() works correctly when called from SECURITY DEFINER functions
-- Issue: When called from get_staff_stage_performance (which has SET search_path = public),
--        the unqualified auth_email() call may not resolve correctly.

BEGIN;

-- =============================================================================
-- Fix app_role: Use fully qualified public.auth_email() and public.staff_shared
-- =============================================================================
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_email text;
  v_role text;
BEGIN
  -- Use fully qualified reference to auth_email
  v_email := public.auth_email();

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Authentication error: missing email claim in JWT token';
  END IF;

  -- Use fully qualified reference to staff_shared
  SELECT role INTO v_role
  FROM public.staff_shared
  WHERE email = v_email
  LIMIT 1;

  RETURN COALESCE(v_role, 'Staff');
END;
$function$;

-- =============================================================================
-- Fix auth_email: Ensure it has proper search_path and uses fully qualified refs
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'email';
$function$;

COMMIT;
