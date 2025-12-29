-- Fix check_user_role to support role hierarchy
-- Admin > Supervisor > Staff
-- An Admin should pass check_user_role('Supervisor') since Admin has more permissions

CREATE OR REPLACE FUNCTION public.check_user_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT CASE
    -- Admin can do anything
    WHEN public.app_role() = 'Admin' THEN true
    -- Supervisor can do Supervisor and Staff tasks
    WHEN public.app_role() = 'Supervisor' AND p_role IN ('Supervisor', 'Staff') THEN true
    -- Staff can only do Staff tasks
    WHEN public.app_role() = 'Staff' AND p_role = 'Staff' THEN true
    -- Exact match fallback
    WHEN public.app_role() = p_role THEN true
    ELSE false
  END;
$function$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_role(text) TO authenticated;

COMMENT ON FUNCTION public.check_user_role(text) IS 'Check if current user has at least the specified role level (Admin > Supervisor > Staff)';
