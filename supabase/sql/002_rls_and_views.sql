-- 002_rls_and_views.sql
-- RLS scaffolding (feature-flagged) + minimal read views for UI lists.

-- Safety: required by gen_random_uuid in case not present
create extension if not exists pgcrypto;

-- ---------- Helpers ----------
-- 1) Read email from JWT
create or replace function auth_email()
returns text
language sql
stable
as $$
select coalesce( (current_setting('request.jwt.claims', true)::jsonb ->> 'email'), '' );
$$;

-- 2) Is service role (server-side)
create or replace function app_is_service_role()
returns boolean
language sql
stable
as $$
select coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role';
$$;

-- 3) Feature flag: RLS enabled?  (defaults to false if not configured)
--    To turn ON later:
--    insert into settings(store, key, value) values ('global','rls','{"enabled": true}');
--    To turn OFF: update settings set value='{"enabled": false}' where store='global' and key='rls';
alter table if exists settings add column if not exists created_at timestamptz not null default now();

create or replace function feature_rls_enabled()
returns boolean
language sql
stable
as $$
select coalesce(
  (select (value->>'enabled')::boolean from settings where store = 'global' and key = 'rls' limit 1),
  false
);
$$;

-- 4) Role lookup from our users table (by email)
create or replace function app_role()
returns text
language sql
stable
as $$
select coalesce( (select role from users where email = auth_email() limit 1), 'Staff');
$$;

-- 5) Store access check (Admin bypasses)
create or replace function app_can_access_store(s text)
returns boolean
language sql
stable
as $$
select
  app_role() = 'Admin'
  or exists (
    select 1
    from users u
    where u.email = auth_email()
      and (u.store_access @> array[s]::text[])
  );
$$;

-- 6) Common bypass: RLS OFF or service role
create or replace function rls_bypass()
returns boolean
language sql
stable
as $$
select (not feature_rls_enabled()) or app_is_service_role();
$$;

-- ---------- Enable RLS + Policies ----------
-- Keep writes locked to service role for now. UI will only read via views.

-- orders
alter table orders enable row level security;

drop policy if exists orders_select on orders;
create policy orders_select
on orders for select
using (
  rls_bypass() or app_can_access_store(store)
);

drop policy if exists orders_modify_service_only on orders;
create policy orders_modify_service_only
on orders for all
using (rls_bypass())
with check (rls_bypass());

-- stage_events
alter table stage_events enable row level security;

drop policy if exists stage_events_select on stage_events;
create policy stage_events_select
on stage_events for select
using (
  rls_bypass()
  or exists (
    select 1 from orders o
    where o.id = stage_events.order_id
      and app_can_access_store(o.store)
  )
);

drop policy if exists stage_events_modify_service_only on stage_events;
create policy stage_events_modify_service_only
on stage_events for all
using (rls_bypass())
with check (rls_bypass());

-- order_photos
alter table order_photos enable row level security;

drop policy if exists order_photos_select on order_photos;
create policy order_photos_select
on order_photos for select
using (
  rls_bypass()
  or exists (
    select 1 from orders o
    where o.id = order_photos.order_id
      and app_can_access_store(o.store)
  )
);

drop policy if exists order_photos_modify_service_only on order_photos;
create policy order_photos_modify_service_only
on order_photos for all
using (rls_bypass())
with check (rls_bypass());

-- work_queue (service/internal only)
alter table work_queue enable row level security;

drop policy if exists work_queue_service_only on work_queue;
create policy work_queue_service_only
on work_queue for all
using (rls_bypass())
with check (rls_bypass());

-- dead_letter (service/internal only)
alter table dead_letter enable row level security;

drop policy if exists dead_letter_service_only on dead_letter;
create policy dead_letter_service_only
on dead_letter for all
using (rls_bypass())
with check (rls_bypass());

-- api_logs (service/internal only)
alter table api_logs enable row level security;

drop policy if exists api_logs_service_only on api_logs;
create policy api_logs_service_only
on api_logs for all
using (rls_bypass())
with check (rls_bypass());

-- components, bom_headers, bom_items, inventory_txn
-- Keep service-only for now; UI screens come later.
alter table components enable row level security;
drop policy if exists components_service_only on components;
create policy components_service_only
on components for all
using (rls_bypass())
with check (rls_bypass());

alter table bom_headers enable row level security;
drop policy if exists bom_headers_service_only on bom_headers;
create policy bom_headers_service_only
on bom_headers for all
using (rls_bypass())
with check (rls_bypass());

alter table bom_items enable row level security;
drop policy if exists bom_items_service_only on bom_items;
create policy bom_items_service_only
on bom_items for all
using (rls_bypass())
with check (rls_bypass());

alter table inventory_txn enable row level security;
drop policy if exists inventory_txn_service_only on inventory_txn;
create policy inventory_txn_service_only
on inventory_txn for all
using (rls_bypass())
with check (rls_bypass());

-- ---------- Minimal Views for UI ----------
-- Queue: active (not Complete)
create or replace view vw_queue_minimal as
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
from orders
where stage <> 'Complete';

-- Unassigned counts by store/stage (excludes Complete)
create or replace view vw_unassigned_counts as
select
  store,
  stage,
  count(*)::int as count
from orders
where assignee_id is null
  and stage <> 'Complete'
group by store, stage;

-- Completed orders minimal list
create or replace view vw_complete_minimal as
select
  id,
  human_id,
  title,
  storage_location,
  store,
  packing_complete_ts,
  created_at
from orders
where stage = 'Complete';
