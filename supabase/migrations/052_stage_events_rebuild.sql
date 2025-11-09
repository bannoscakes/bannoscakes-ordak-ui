-- Migration 052: Rebuild stage_events table for production analytics
-- Date: 2025-11-08
-- Task: Master_Task.md - Task 6: Create stage_events Table
--
-- BACKGROUND:
-- Old stage_events table exists from migration 028 but has wrong schema
-- for production system (orders_bannos/orders_flourlane).
-- This migration rebuilds it to match the spec and enable analytics.

-- Drop old stage_events table and recreate with new schema
DROP TABLE IF EXISTS public.stage_events CASCADE;

-- Create new stage_events table matching production spec
CREATE TABLE public.stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store text NOT NULL CHECK (store IN ('bannos', 'flourlane')),
  order_id text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('Filling', 'Covering', 'Decorating', 'Packing', 'Complete')),
  event_type text NOT NULL CHECK (event_type IN ('assign', 'complete', 'print')),
  at_ts timestamptz NOT NULL DEFAULT now(),
  staff_id uuid NULL REFERENCES staff_shared(user_id),
  ok boolean NULL,  -- For quality tracking (future use)
  meta jsonb NULL   -- Flexible metadata (notes, reason, etc.)
);

-- Indexes for common queries
CREATE INDEX idx_stage_events_store_ts 
  ON stage_events(store, at_ts DESC);
CREATE INDEX idx_stage_events_store_stage_ts 
  ON stage_events(store, stage, at_ts DESC);
CREATE INDEX idx_stage_events_staff_ts 
  ON stage_events(staff_id, at_ts DESC);
CREATE INDEX idx_stage_events_order 
  ON stage_events(order_id, at_ts DESC);

-- Enable RLS
ALTER TABLE stage_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone authenticated can read
CREATE POLICY stage_events_select_policy ON stage_events
  FOR SELECT TO authenticated
  USING (true);

-- RLS Policy: No direct writes (RPC-only via SECURITY DEFINER)
CREATE POLICY stage_events_insert_policy ON stage_events
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- Grant read access
GRANT SELECT ON stage_events TO authenticated;

-- Comments
COMMENT ON TABLE stage_events IS 'Audit trail for stage transitions, assignments, and prints. Powers analytics and timeline views.';
COMMENT ON COLUMN stage_events.ok IS 'Quality flag: true=passed, false=issue, null=not checked';
COMMENT ON COLUMN stage_events.meta IS 'Flexible metadata: notes, reason, qc_comments, etc.';

