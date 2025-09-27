-- 002b_alias_more_views.sql — compatibility views for legacy UI
-- Map legacy names to our new minimal views (read-only)

-- Unassigned counts (legacy screen expects 'unassigned_view')
create or replace view public.unassigned_view as
select store, stage, count
from public.vw_unassigned_counts;

-- Completed (legacy screen expects 'complete_view')
create or replace view public.complete_view as
select id, human_id, title, storage_location, store, packing_complete_ts, created_at
from public.vw_complete_minimal;
