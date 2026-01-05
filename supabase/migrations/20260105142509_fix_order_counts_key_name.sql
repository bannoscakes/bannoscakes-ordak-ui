-- Fix: Rename staff_id to user_id in get_staff_order_counts return type
-- This aligns with get_staff_with_shift_status which returns user_id
-- Frontend Map lookup uses member.user_id, so the key must match

DROP FUNCTION IF EXISTS public.get_staff_order_counts();

CREATE FUNCTION public.get_staff_order_counts()
RETURNS TABLE (user_id uuid, order_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assignee_id as user_id, COUNT(*)::bigint as order_count
  FROM (
    SELECT assignee_id FROM orders_bannos
    WHERE assignee_id IS NOT NULL AND stage != 'Complete'
    UNION ALL
    SELECT assignee_id FROM orders_flourlane
    WHERE assignee_id IS NOT NULL AND stage != 'Complete'
  ) all_orders
  GROUP BY assignee_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_order_counts() TO authenticated;
