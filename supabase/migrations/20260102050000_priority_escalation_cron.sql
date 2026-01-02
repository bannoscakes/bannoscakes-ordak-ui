-- Priority Escalation Cron Job
-- Runs daily at 5am Sydney time (AEST) to recalculate order priorities
-- based on how many days remain until due_date
--
-- This ensures orders automatically escalate in priority as their due date approaches,
-- even if no manual edits are made to the order.
--
-- Schedule: 0 19 * * * (19:00 UTC = 5am AEST, 6am during AEDT daylight saving)

-- Ensure pg_cron extension is available (already enabled, but safe to include)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the priority escalation function
CREATE OR REPLACE FUNCTION escalate_order_priorities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_bannos integer := 0;
  v_updated_flourlane integer := 0;
BEGIN
  -- Update orders_bannos where priority needs to change
  -- Only update orders NOT in 'Complete' stage and where priority actually differs
  WITH priority_calc AS (
    SELECT
      id,
      CASE
        WHEN due_date - CURRENT_DATE <= 1 THEN 'High'::priority_level
        WHEN due_date - CURRENT_DATE <= 3 THEN 'Medium'::priority_level
        ELSE 'Low'::priority_level
      END AS new_priority
    FROM orders_bannos
    WHERE stage != 'Complete'
      AND due_date IS NOT NULL
      AND deleted_at IS NULL
  )
  UPDATE orders_bannos o
  SET
    priority = pc.new_priority,
    updated_at = NOW()
  FROM priority_calc pc
  WHERE o.id = pc.id
    AND o.priority IS DISTINCT FROM pc.new_priority;

  GET DIAGNOSTICS v_updated_bannos = ROW_COUNT;

  -- Update orders_flourlane where priority needs to change
  WITH priority_calc AS (
    SELECT
      id,
      CASE
        WHEN due_date - CURRENT_DATE <= 1 THEN 'High'::priority_level
        WHEN due_date - CURRENT_DATE <= 3 THEN 'Medium'::priority_level
        ELSE 'Low'::priority_level
      END AS new_priority
    FROM orders_flourlane
    WHERE stage != 'Complete'
      AND due_date IS NOT NULL
      AND deleted_at IS NULL
  )
  UPDATE orders_flourlane o
  SET
    priority = pc.new_priority,
    updated_at = NOW()
  FROM priority_calc pc
  WHERE o.id = pc.id
    AND o.priority IS DISTINCT FROM pc.new_priority;

  GET DIAGNOSTICS v_updated_flourlane = ROW_COUNT;

  -- Log the results (viewable in Supabase logs)
  RAISE LOG 'Priority escalation complete: % bannos orders updated, % flourlane orders updated',
    v_updated_bannos, v_updated_flourlane;
END;
$$;

COMMENT ON FUNCTION escalate_order_priorities() IS
  'Daily job to recalculate order priorities based on days until due_date. High: <=1 day, Medium: <=3 days, Low: >3 days';

-- Schedule the cron job to run daily at 5am Sydney time (19:00 UTC)
-- Note: pg_cron uses UTC. 19:00 UTC = 5am AEST (6am during AEDT daylight saving)
-- Wrapped in DO block for idempotency - safe to re-run
DO $$
BEGIN
  -- Unschedule existing job if it exists (idempotent)
  BEGIN
    PERFORM cron.unschedule('priority-escalation');
  EXCEPTION
    WHEN OTHERS THEN NULL;  -- job doesn't exist, that's fine
  END;

  -- Schedule the job
  PERFORM cron.schedule(
    'priority-escalation',
    '0 19 * * *',
    'SELECT escalate_order_priorities()'
  );
END;
$$;
