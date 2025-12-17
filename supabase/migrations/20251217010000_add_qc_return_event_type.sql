-- Add 'qc_return' to stage_events event_type constraint
-- This allows the qc_return_to_decorating RPC to log events properly

-- Drop the existing constraint
ALTER TABLE public.stage_events DROP CONSTRAINT IF EXISTS stage_events_event_type_check;

-- Add updated constraint with 'qc_return'
ALTER TABLE public.stage_events ADD CONSTRAINT stage_events_event_type_check
  CHECK (event_type = ANY (ARRAY['assign'::text, 'complete'::text, 'print'::text, 'start'::text, 'qc_return'::text]));

COMMENT ON CONSTRAINT stage_events_event_type_check ON public.stage_events
  IS 'Allowed event types: assign, complete, print, start, qc_return';
