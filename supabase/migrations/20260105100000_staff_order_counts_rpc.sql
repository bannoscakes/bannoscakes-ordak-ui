-- Migration: Staff Order Counts RPC
-- Returns count of active (non-Complete) orders per staff member from both stores

CREATE OR REPLACE FUNCTION public.get_staff_order_counts()
RETURNS TABLE (staff_id uuid, order_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
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

GRANT EXECUTE ON FUNCTION public.get_staff_order_counts() TO authenticated;

COMMENT ON FUNCTION public.get_staff_order_counts IS
  'Returns count of active orders (stage != Complete) per staff from both stores';
