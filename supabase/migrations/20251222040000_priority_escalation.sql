-- ============================================================================
-- Migration: Add automatic priority escalation based on due date
-- Date: 2025-12-22
--
-- PURPOSE:
-- Orders should automatically escalate priority as due date approaches:
-- - due_date > CURRENT_DATE → Medium (default)
-- - due_date = CURRENT_DATE → High
-- - due_date < CURRENT_DATE → Urgent (overdue)
--
-- COMPONENTS:
-- 1. Add 'Urgent' to priority_level enum
-- 2. Create escalate_order_priorities() function
-- 3. Create pg_cron job for daily execution at midnight Sydney time
-- ============================================================================

-- ============================================================================
-- 1. Add 'Urgent' to priority_level enum
-- ============================================================================
DO $$
BEGIN
  -- Add 'Urgent' value if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'Urgent'
    AND enumtypid = 'priority_level'::regtype
  ) THEN
    ALTER TYPE priority_level ADD VALUE 'Urgent';
  END IF;
END $$;

-- ============================================================================
-- 2. Create escalate_order_priorities() function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.escalate_order_priorities()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $function$
DECLARE
  v_bannos_high integer := 0;
  v_bannos_urgent integer := 0;
  v_flourlane_high integer := 0;
  v_flourlane_urgent integer := 0;
BEGIN
  -- Escalate orders_bannos: due today → High
  UPDATE public.orders_bannos
  SET priority = 'High', updated_at = now()
  WHERE due_date = CURRENT_DATE
    AND stage != 'Complete'
    AND priority != 'High'
    AND priority != 'Urgent';
  GET DIAGNOSTICS v_bannos_high = ROW_COUNT;

  -- Escalate orders_bannos: overdue → Urgent
  UPDATE public.orders_bannos
  SET priority = 'Urgent', updated_at = now()
  WHERE due_date < CURRENT_DATE
    AND stage != 'Complete'
    AND priority != 'Urgent';
  GET DIAGNOSTICS v_bannos_urgent = ROW_COUNT;

  -- Escalate orders_flourlane: due today → High
  UPDATE public.orders_flourlane
  SET priority = 'High', updated_at = now()
  WHERE due_date = CURRENT_DATE
    AND stage != 'Complete'
    AND priority != 'High'
    AND priority != 'Urgent';
  GET DIAGNOSTICS v_flourlane_high = ROW_COUNT;

  -- Escalate orders_flourlane: overdue → Urgent
  UPDATE public.orders_flourlane
  SET priority = 'Urgent', updated_at = now()
  WHERE due_date < CURRENT_DATE
    AND stage != 'Complete'
    AND priority != 'Urgent';
  GET DIAGNOSTICS v_flourlane_urgent = ROW_COUNT;

  RETURN jsonb_build_object(
    'bannos_high', v_bannos_high,
    'bannos_urgent', v_bannos_urgent,
    'flourlane_high', v_flourlane_high,
    'flourlane_urgent', v_flourlane_urgent,
    'total', v_bannos_high + v_bannos_urgent + v_flourlane_high + v_flourlane_urgent,
    'executed_at', now()
  );
END;
$function$;

COMMENT ON FUNCTION public.escalate_order_priorities IS
'Escalates order priorities based on due date:
- due_date = CURRENT_DATE → High
- due_date < CURRENT_DATE → Urgent (overdue)
Run daily via pg_cron at midnight Sydney time.';

-- ============================================================================
-- 3. Create helper function to set priority on single order
--    (called during order import/processing)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_order_priority(p_due_date date)
RETURNS priority_level
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  IF p_due_date IS NULL THEN
    RETURN 'Medium';
  ELSIF p_due_date < CURRENT_DATE THEN
    RETURN 'Urgent';
  ELSIF p_due_date = CURRENT_DATE THEN
    RETURN 'High';
  ELSE
    RETURN 'Medium';
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.calculate_order_priority IS
'Calculate priority based on due date. Use during order import to set correct initial priority.';

-- ============================================================================
-- 4. Create pg_cron job for daily execution
--    Runs at 00:05 Sydney time (14:05 UTC during AEDT, 13:05 UTC during AEST)
-- ============================================================================
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job (Sydney is UTC+10/+11 depending on DST)
-- Using 14:05 UTC which is approximately midnight AEDT (summer)
-- The 5-minute offset avoids exact midnight conflicts
SELECT cron.schedule(
  'escalate-order-priorities',
  '5 14 * * *',  -- 14:05 UTC = 00:05 AEDT (Sydney summer time)
  $$SELECT public.escalate_order_priorities()$$
);

-- ============================================================================
-- 5. Grant execute permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.escalate_order_priorities() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_order_priority(date) TO authenticated;

-- ============================================================================
-- 6. Run initial escalation to fix existing orders
-- ============================================================================
SELECT public.escalate_order_priorities();
