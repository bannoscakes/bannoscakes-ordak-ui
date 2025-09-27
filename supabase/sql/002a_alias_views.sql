-- 002a_alias_views.sql
-- Compatibility views for backward compatibility and simplified access patterns

-- Order-related compatibility views
create or replace view orders_active as
select * from orders where stage <> 'Complete';

create or replace view orders_complete as
select * from orders where stage = 'Complete';

create or replace view orders_pending as
select * from orders where stage in ('Filling_pending', 'Covering_pending', 'Decorating_pending');

create or replace view orders_in_progress as
select * from orders where stage in ('Filling_in_progress', 'Covering_in_progress', 'Decorating_in_progress', 'Packing_in_progress');

-- Stage event compatibility views
create or replace view stage_events_recent as
select * from stage_events 
order by created_at desc 
limit 1000;

create or replace view stage_events_by_order as
select 
  order_id,
  array_agg(
    json_build_object(
      'id', id,
      'from_stage', from_stage,
      'to_stage', to_stage,
      'performed_by', performed_by,
      'reason', reason,
      'created_at', created_at
    ) order by created_at
  ) as events
from stage_events
group by order_id;

-- Inventory compatibility views
create or replace view components_available as
select * from components where ats > 0;

create or replace view components_low_stock as
select * from components where ats <= buffer;

create or replace view inventory_txn_recent as
select * from inventory_txn 
order by created_at desc 
limit 1000;

-- Work queue compatibility views
create or replace view work_queue_pending as
select * from work_queue where status = 'pending';

create or replace view work_queue_processing as
select * from work_queue where status = 'processing';

create or replace view work_queue_failed as
select * from work_queue where status = 'error';

-- User compatibility views
create or replace view users_active as
select * from users where active_shift_id is not null;

create or replace view users_by_role as
select 
  role,
  array_agg(
    json_build_object(
      'id', id,
      'email', email,
      'store_access', store_access,
      'active_shift_id', active_shift_id
    )
  ) as users
from users
group by role;

-- Order photos compatibility views
create or replace view order_photos_recent as
select * from order_photos 
order by created_at desc 
limit 1000;

create or replace view order_photos_by_stage as
select 
  stage,
  count(*) as photo_count,
  array_agg(
    json_build_object(
      'id', id,
      'order_id', order_id,
      'url', url,
      'uploaded_by', uploaded_by,
      'created_at', created_at
    ) order by created_at desc
  ) as photos
from order_photos
group by stage;

-- API logs compatibility views
create or replace view api_logs_recent as
select * from api_logs 
order by created_at desc 
limit 1000;

create or replace view api_logs_by_route as
select 
  route,
  count(*) as request_count,
  avg(t_ms) as avg_response_time_ms,
  count(*) filter (where status >= 400) as error_count
from api_logs
group by route;

-- Audit log compatibility views
create or replace view audit_log_recent as
select * from audit_log 
order by created_at desc 
limit 1000;

create or replace view audit_log_by_action as
select 
  action,
  count(*) as action_count,
  array_agg(
    json_build_object(
      'id', id,
      'performed_by', performed_by,
      'source', source,
      'meta', meta,
      'created_at', created_at
    ) order by created_at desc
  ) as actions
from audit_log
group by action;

-- Messaging compatibility views
create or replace view conversations_active as
select c.*, 
       count(m.id) as message_count,
       max(m.sent_at) as last_message_at
from conversations c
left join messages m on c.id = m.conversation_id
group by c.id, c.type, c.participants, c.created_by, c.created_at;

create or replace view messages_recent as
select * from messages 
order by sent_at desc 
limit 1000;

-- Dead letter compatibility views
create or replace view dead_letter_recent as
select * from dead_letter 
order by created_at desc 
limit 1000;

create or replace view dead_letter_by_source as
select 
  source,
  count(*) as error_count,
  array_agg(
    json_build_object(
      'id', id,
      'reason', reason,
      'created_at', created_at
    ) order by created_at desc
  ) as errors
from dead_letter
group by source;
