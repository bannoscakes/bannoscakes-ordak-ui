-- 003_orders_views.sql
-- Views for UI data access (matches queue.data.ts expectations)

-- Queue minimal view (matches UI expectations)
create or replace view vw_queue_minimal as
select
  id,
  id as human_id,                    -- same as id for UI compatibility
  product_title as title,            -- product_title mapped to title
  stage,
  priority,
  due_date,
  assignee_id,
  storage as storage_location,       -- storage mapped to storage_location
  'bannos' as store,
  created_at
from orders_bannos
where stage <> 'Complete'

union all

select
  id,
  id as human_id,                    -- same as id for UI compatibility
  product_title as title,            -- product_title mapped to title
  stage,
  priority,
  due_date,
  assignee_id,
  storage as storage_location,       -- storage mapped to storage_location
  'flourlane' as store,
  created_at
from orders_flourlane
where stage <> 'Complete'

order by priority desc, due_date asc;

-- Unassigned counts view (matches UI expectations)
create or replace view vw_unassigned_counts as
select
  'bannos' as store,
  stage,
  count(*)::int as count
from orders_bannos
where assignee_id is null
  and stage <> 'Complete'
group by stage

union all

select
  'flourlane' as store,
  stage,
  count(*)::int as count
from orders_flourlane
where assignee_id is null
  and stage <> 'Complete'
group by stage;

-- Complete orders view (matches UI expectations)
create or replace view vw_complete_minimal as
select
  id,
  id as human_id,                    -- same as id for UI compatibility
  product_title as title,            -- product_title mapped to title
  storage as storage_location,       -- storage mapped to storage_location
  'bannos' as store,
  packing_complete_ts,
  created_at
from orders_bannos
where stage = 'Complete'

union all

select
  id,
  id as human_id,                    -- same as id for UI compatibility
  product_title as title,            -- product_title mapped to title
  storage as storage_location,       -- storage mapped to storage_location
  'flourlane' as store,
  packing_complete_ts,
  created_at
from orders_flourlane
where stage = 'Complete'

order by packing_complete_ts desc;
