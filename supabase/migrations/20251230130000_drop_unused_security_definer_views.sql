-- Drop unused SECURITY DEFINER views and functions
-- These were flagged by Supabase linter and are no longer used by the application
-- The app uses get_queue RPC which queries tables directly

-- Drop functions first (they depend on the views)
DROP FUNCTION IF EXISTS public.get_queue_minimal(text, integer, integer);
DROP FUNCTION IF EXISTS public.get_complete_minimal(text, integer);

-- Drop wrapper views (they depend on base views)
DROP VIEW IF EXISTS public.queue_view;
DROP VIEW IF EXISTS public.complete_view;
DROP VIEW IF EXISTS public.unassigned_view;

-- Drop base views
DROP VIEW IF EXISTS public.vw_queue_minimal;
DROP VIEW IF EXISTS public.vw_complete_minimal;
DROP VIEW IF EXISTS public.vw_unassigned_counts;
