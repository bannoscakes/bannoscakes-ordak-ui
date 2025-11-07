-- =====================================================
-- Migration: STAFF MANAGEMENT
-- Date: 2025-11-07
-- Description: Extract production RPCs for staff management
-- =====================================================
-- 
-- Functions in this migration:
--   - get_staff
--   - get_staff_list
--   - get_staff_me
--   - get_staff_member
--   - get_staff_stats
--   - assign_staff
--
-- =====================================================

-- Function: get_staff
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

-- Function: get_staff_list
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

-- Function: get_staff_me
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

-- Function: get_staff_member
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

-- Function: get_staff_stats
CREATE OR REPLACE FUNCTION public.get_staff_stats()
 RETURNS TABLE(user_id uuid, assigned_orders bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  with all_orders as (
    select assignee_id from public.orders_bannos
    union all
    select assignee_id from public.orders_flourlane
  )
  select s.user_id,
         count(a.assignee_id)::bigint as assigned_orders
  from public.staff_shared s
  left join all_orders a on a.assignee_id = s.user_id
  group by s.user_id
  order by assigned_orders desc nulls last;
$function$
;

-- Function: assign_staff
CREATE OR REPLACE FUNCTION public.assign_staff(p_order_id text, p_store text, p_staff_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
BEGIN
  v_table_name := 'orders_' || p_store;
  
  EXECUTE format('UPDATE public.%I SET assignee_id = $1, updated_at = now() WHERE id = $2', v_table_name)
  USING p_staff_id, p_order_id;
  
  RETURN true;
END;
$function$
;

