-- 002a_alias_views.sql — compatibility views for legacy UI calls

-- Old UI calls /rest/v1/queue_view; map it to our new minimal queue view.
create or replace view public.queue_view as
select
  id,
  human_id,
  title,
  stage,
  priority,
  due_date,
  assignee_id,
  storage_location,
  store,
  created_at
from public.vw_queue_minimal;
