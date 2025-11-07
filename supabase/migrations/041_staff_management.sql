-- Migration: Staff and user management RPCs
-- Generated: 2025-11-07T05:15:46.196Z
-- Functions: 4
-- Note: get_staff_stats moved to 042_queue_orders.sql due to orders table dependency

-- Function 1/5: get_staff
CREATE OR REPLACE FUNCTION public.get_staff()
 RETURNS TABLE(user_id uuid, full_name text, role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select s.user_id, s.full_name, s.role
  from public.staff_shared s
  order by s.full_name;
$function$
;

-- Function 2/5: get_staff_list
CREATE OR REPLACE FUNCTION public.get_staff_list(p_role text DEFAULT NULL::text, p_is_active boolean DEFAULT true)
 RETURNS TABLE(user_id uuid, full_name text, email text, role text, store text, is_active boolean, phone text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    s.full_name,
    s.email,
    s.role,
    s.store,
    s.is_active,
    s.phone,
    s.created_at,
    s.updated_at
  FROM public.staff_shared s
  WHERE (p_role IS NULL OR s.role = p_role)
    AND (p_is_active IS NULL OR s.is_active = p_is_active)
  ORDER BY s.full_name;
END;
$function$
;

-- Function 3/5: get_staff_me
CREATE OR REPLACE FUNCTION public.get_staff_me()
 RETURNS TABLE(user_id uuid, full_name text, role text, store text, is_active boolean, phone text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    s.user_id,
    s.full_name,
    s.role,
    s.store,
    s.is_active,
    s.phone,
    s.email
  FROM public.staff_shared s
  WHERE s.user_id = auth.uid();
END;
$function$
;

-- Function 4/5: get_staff_member
CREATE OR REPLACE FUNCTION public.get_staff_member(p_user_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, role text, store text, is_active boolean, phone text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if user_id is provided
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Return staff member data
  RETURN QUERY
  SELECT
    s.user_id,
    s.full_name,
    s.role,
    s.store,
    s.is_active,
    s.phone,
    s.email
  FROM public.staff_shared s
  WHERE s.user_id = p_user_id
    AND s.is_active = true;
END;
$function$
;
