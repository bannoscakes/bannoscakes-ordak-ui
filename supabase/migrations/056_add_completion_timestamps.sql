-- Migration: Add completion timestamp columns to orders tables
-- Generated: 2025-11-10
-- Purpose: Track when each production stage was completed for analytics and metrics
-- Related: Task 8 in Master_Task.md

-- =============================================================================
-- ADD TIMESTAMP COLUMNS TO ORDERS_BANNOS
-- =============================================================================

ALTER TABLE public.orders_bannos 
  ADD COLUMN IF NOT EXISTS filling_complete_ts timestamptz NULL,
  ADD COLUMN IF NOT EXISTS covering_complete_ts timestamptz NULL,
  ADD COLUMN IF NOT EXISTS decorating_complete_ts timestamptz NULL,
  ADD COLUMN IF NOT EXISTS packing_complete_ts timestamptz NULL;

-- =============================================================================
-- ADD TIMESTAMP COLUMNS TO ORDERS_FLOURLANE
-- =============================================================================

ALTER TABLE public.orders_flourlane
  ADD COLUMN IF NOT EXISTS filling_complete_ts timestamptz NULL,
  ADD COLUMN IF NOT EXISTS covering_complete_ts timestamptz NULL,
  ADD COLUMN IF NOT EXISTS decorating_complete_ts timestamptz NULL,
  ADD COLUMN IF NOT EXISTS packing_complete_ts timestamptz NULL;

-- =============================================================================
-- ADD COMMENTS FOR ORDERS_BANNOS
-- =============================================================================

COMMENT ON COLUMN public.orders_bannos.filling_complete_ts IS 'Timestamp when Filling stage completed';
COMMENT ON COLUMN public.orders_bannos.covering_complete_ts IS 'Timestamp when Covering stage completed';
COMMENT ON COLUMN public.orders_bannos.decorating_complete_ts IS 'Timestamp when Decorating stage completed';
COMMENT ON COLUMN public.orders_bannos.packing_complete_ts IS 'Timestamp when Packing stage completed';

-- =============================================================================
-- ADD COMMENTS FOR ORDERS_FLOURLANE
-- =============================================================================

COMMENT ON COLUMN public.orders_flourlane.filling_complete_ts IS 'Timestamp when Filling stage completed';
COMMENT ON COLUMN public.orders_flourlane.covering_complete_ts IS 'Timestamp when Covering stage completed';
COMMENT ON COLUMN public.orders_flourlane.decorating_complete_ts IS 'Timestamp when Decorating stage completed';
COMMENT ON COLUMN public.orders_flourlane.packing_complete_ts IS 'Timestamp when Packing stage completed';

