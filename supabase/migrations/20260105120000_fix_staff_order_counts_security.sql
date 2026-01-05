-- Fix: Change get_staff_order_counts to SECURITY DEFINER
-- With SECURITY INVOKER, Staff users only see their own order counts (RLS on orders tables)
-- SECURITY DEFINER bypasses RLS so all users see accurate counts for all staff

CREATE OR REPLACE FUNCTION public.get_staff_order_counts()
RETURNS TABLE (staff_id uuid, order_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assignee_id as staff_id, COUNT(*)::bigint as order_count
  FROM (
    SELECT assignee_id FROM orders_bannos
    WHERE assignee_id IS NOT NULL AND stage != 'Complete'
    UNION ALL
    SELECT assignee_id FROM orders_flourlane
    WHERE assignee_id IS NOT NULL AND stage != 'Complete'
  ) all_orders
  GROUP BY assignee_id;
$$;

-- Keep existing grant
GRANT EXECUTE ON FUNCTION public.get_staff_order_counts() TO authenticated;
