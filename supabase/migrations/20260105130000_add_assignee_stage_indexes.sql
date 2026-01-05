-- Performance: Add indexes for get_staff_order_counts query
-- Query filters by assignee_id IS NOT NULL AND stage != 'Complete'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_bannos_assignee_stage
ON public.orders_bannos (assignee_id, stage)
WHERE assignee_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_flourlane_assignee_stage
ON public.orders_flourlane (assignee_id, stage)
WHERE assignee_id IS NOT NULL;
