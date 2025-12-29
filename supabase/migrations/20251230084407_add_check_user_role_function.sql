-- Migration: Add missing check_user_role function
-- This function was defined in 040_core_auth_helpers.sql but is missing from production
-- It's required by update_order_core (EditOrderDrawer) and other RPCs

CREATE OR REPLACE FUNCTION public.check_user_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.app_role() = p_role;
$function$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_role(text) TO authenticated;

COMMENT ON FUNCTION public.check_user_role(text) IS 'Check if current user has a specific role (Admin, Supervisor, Staff)';
