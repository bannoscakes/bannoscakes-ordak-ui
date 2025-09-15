# Schema & RLS (Final)
**Version:** 1.0.0  
**Last Updated:** 2025-01-16  
**Status:** Production

Authoritative reference for database schema, enums, triggers, RLS patterns, and indexes.  
All writes go through **SECURITY DEFINER** RPCs. Client never writes tables directly.

---

## Ground Rules
- **RLS enabled** on all tables (default deny on writes).  
- **No direct client writes**; all inserts/updates/deletes go through RPCs.  
- **Buckets** use **signed URLs** only (no public access).  
- **Timestamps**: `created_at` defaults to `now()`, `updated_at` maintained by trigger.  
- **Due dates** are date-only; **priority** is derived (High / Medium / Low).  
- Stage model: **Filling → Covering → Decorating → Packing → Complete** (single enum).  
  Filling **starts** at barcode print; scan **completes** Filling.

---

## Prerequisites
```sql
create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
Enums
sql
Copy code
do $$
begin
  if not exists (select 1 from pg_type where typname = 'stage_type') then
    create type stage_type as enum ('Filling','Covering','Decorating','Packing','Complete');
  end if;
end$$;
Staff (shared) — create first (FK target)
sql
Copy code
create table if not exists public.staff_shared (
  row_id       uuid primary key default gen_random_uuid(),
  user_id      uuid unique,                 -- supabase auth id
  full_name    text,
  role         text check (role in ('Admin','Supervisor','Staff')) default 'Staff',
  is_active    boolean default true,
  created_at   timestamptz default now()
);

create index if not exists idx_staff_active_role
  on public.staff_shared (is_active, role);
Orders (per store)
Two identical tables, one per store. assignee_id references staff_shared(user_id).

sql
Copy code
-- Bannos
create table if not exists public.orders_bannos (
  row_id                 uuid primary key default gen_random_uuid(),
  id                     text not null unique,          -- human/scanner id e.g. bannos-12345
  shopify_order_id       bigint,                        -- numeric id
  shopify_order_gid      text,                          -- GraphQL GID (for dedupe)
  shopify_order_number   int,
  customer_name          text,
  product_title          text,
  flavour                text,
  notes                  text,
  currency               char(3),
  total_amount           numeric(12,2),
  order_json             jsonb,
  stage                  stage_type not null default 'Filling',
  priority               smallint not null default 0,
  assignee_id            uuid references public.staff_shared(user_id) on delete set null,
  storage                text,
  due_date               date not null,
  size                   text,                          -- e.g. S|M|L
  -- operational timestamps
  filling_start_ts       timestamptz,
  filling_complete_ts    timestamptz,
  covering_complete_ts   timestamptz,
  decorating_complete_ts timestamptz,
  packing_start_ts       timestamptz,
  packing_complete_ts    timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Flourlane
create table if not exists public.orders_flourlane (like public.orders_bannos including all);

-- Updated-at triggers
drop trigger if exists trg_orders_bannos_updated on public.orders_bannos;
create trigger trg_orders_bannos_updated
before update on public.orders_bannos
for each row execute procedure set_updated_at();

drop trigger if exists trg_orders_fl_updated on public.orders_flourlane;
create trigger trg_orders_fl_updated
before update on public.orders_flourlane
for each row execute procedure set_updated_at();
Indexes (orders)
sql
Copy code
-- Queue ordering (incomplete only)
create index if not exists idx_orders_bannos_queue
  on public.orders_bannos (priority desc, due_date asc, size asc, shopify_order_number asc)
  where stage <> 'Complete';

create index if not exists idx_orders_flourlane_queue
  on public.orders_flourlane (priority desc, due_date asc, size asc, shopify_order_number asc)
  where stage <> 'Complete';

-- Unassigned counts/lists
create index if not exists idx_orders_bannos_unassigned
  on public.orders_bannos (stage, priority, shopify_order_number)
  where assignee_id is null and stage <> 'Complete';

create index if not exists idx_orders_flourlane_unassigned
  on public.orders_flourlane (stage, priority, shopify_order_number)
  where assignee_id is null and stage <> 'Complete';

-- Shopify webhook dedupe (GID present)
create index if not exists idx_orders_bannos_shopify_gid
  on public.orders_bannos (shopify_order_gid)
  where shopify_order_gid is not null;

create index if not exists idx_orders_flourlane_shopify_gid
  on public.orders_flourlane (shopify_order_gid)
  where shopify_order_gid is not null;

-- Date-range queries (exclude completed)
create index if not exists idx_orders_bannos_due_date
  on public.orders_bannos (due_date, stage)
  where stage <> 'Complete';

create index if not exists idx_orders_flourlane_due_date
  on public.orders_flourlane (due_date, stage)
  where stage <> 'Complete';
Stage Events (audit trail, recommended)
sql
Copy code
create table if not exists public.stage_events (
  id            bigserial primary key,
  order_id      text not null,
  store         text not null check (store in ('Bannos','Flourlane')),
  stage         stage_type,
  action        text not null,              -- e.g. filling_print | filling_complete | start_packing | qc_return
  performed_by  uuid,
  meta          jsonb default '{}'::jsonb,
  at            timestamptz not null default now()
);

create index if not exists idx_stage_events_order_time
  on public.stage_events (order_id, at desc);
Inventory & BOM
Minimal shape to support holds + sync; BOM optional.

sql
Copy code
-- Items
create table if not exists public.inventory_items (
  sku        text primary key,
  title      text,
  uom        text,
  ats        numeric(12,3) default 0,       -- available to sell
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
drop trigger if exists trg_inv_items_updated on public.inventory_items;
create trigger trg_inv_items_updated
before update on public.inventory_items
for each row execute procedure set_updated_at();

-- Transactions
create table if not exists public.inventory_txn (
  id         bigserial primary key,
  sku        text references public.inventory_items(sku),
  qty        numeric(12,3) not null,
  reason     text,                          -- order_create | manual_adjust | reconcile | restock
  ref_id     text,                          -- order id / external ref
  created_at timestamptz default now()
);
create index if not exists idx_inv_txn_sku_time on public.inventory_txn (sku, created_at desc);

-- Work queue for Shopify ATS/OOS pushes
create table if not exists public.work_queue (
  id            bigserial primary key,
  topic         text not null,              -- inventory_push | reconcile | order_ingest_retry
  status        text not null default 'pending', -- pending | processing | done | error
  priority      int default 5,
  dedupe_key    text unique,
  payload       jsonb not null,
  retry_count   int default 0,
  max_retries   int default 3,
  next_retry_at timestamptz,
  locked_at     timestamptz,
  locked_by     text,
  last_error    text,
  created_at    timestamptz default now()
);
create index if not exists idx_work_queue_scan on public.work_queue (status, priority, next_retry_at);

-- (Optional) reservation holds & BOM
create table if not exists public.reservation_holds (
  id         bigserial primary key,
  sku        text references public.inventory_items(sku),
  qty        numeric(12,3) not null,
  order_id   text,
  expires_at timestamptz
);

create table if not exists public.bom_header (
  id         bigserial primary key,
  product_id text,
  version    int,
  created_at timestamptz default now()
);

create table if not exists public.bom_item (
  id            bigserial primary key,
  header_id     bigint references public.bom_header(id) on delete cascade,
  component_sku text references public.inventory_items(sku),
  qty           numeric(12,3) not null
);

create table if not exists public.product_requirements (
  product_id    text primary key,
  requirements  jsonb not null
);
Messaging (optional)
sql
Copy code
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid,
  created_at  timestamptz default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id         uuid,
  added_at        timestamptz default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id              bigserial primary key,
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id       uuid,
  body            text,
  created_at      timestamptz default now()
);
create index if not exists idx_messages_conv_time on public.messages (conversation_id, created_at desc);
Media (optional)
sql
Copy code
create table if not exists public.order_photos (
  id         bigserial primary key,
  order_id   text not null,
  stage      stage_type,
  url        text not null,
  created_at timestamptz default now()
);
-- Storage: use signed URLs; restrict read by store/staff in policies.
Time (optional)
sql
Copy code
create table if not exists public.shifts (
  id        bigserial primary key,
  staff_id  uuid not null,
  start_ts  timestamptz not null,
  end_ts    timestamptz
);

create table if not exists public.breaks (
  id        bigserial primary key,
  staff_id  uuid not null,
  start_ts  timestamptz not null,
  end_ts    timestamptz
);
RLS Strategy
Goal: clients can read; cannot write directly. All writes via RPCs.

sql
Copy code
-- Orders
alter table public.orders_bannos    enable row level security;
alter table public.orders_flourlane enable row level security;

drop policy if exists p_read_orders_bannos on public.orders_bannos;
create policy p_read_orders_bannos
on public.orders_bannos for select to authenticated using (true);

drop policy if exists p_read_orders_fl on public.orders_flourlane;
create policy p_read_orders_fl
on public.orders_flourlane for select to authenticated using (true);

-- Stage events
alter table public.stage_events enable row level security;
drop policy if exists p_read_stage_events on public.stage_events;
create policy p_read_stage_events
on public.stage_events for select to authenticated using (true);

-- Staff / Inventory / Work queue / Messages: read-only pattern
alter table public.inventory_items enable row level security;
drop policy if exists p_read_inv_items on public.inventory_items;
create policy p_read_inv_items
on public.inventory_items for select to authenticated using (true);

alter table public.inventory_txn enable row level security;
drop policy if exists p_read_inv_txn on public.inventory_txn;
create policy p_read_inv_txn
on public.inventory_txn for select to authenticated using (true);

alter table public.work_queue enable row level security;
drop policy if exists p_read_wq on public.work_queue;
create policy p_read_wq
on public.work_queue for select to authenticated using (true);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
-- (Add participant-scoped policies when wiring messaging feature)
Grants (belt & suspenders)
sql
Copy code
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on
  public.orders_bannos, public.orders_flourlane,
  public.stage_events, public.inventory_items, public.inventory_txn,
  public.conversations, public.conversation_participants, public.messages
to authenticated;
RPC Write Pattern (example)
sql
Copy code
create or replace function public.handle_print_barcode(p_id text, p_user uuid, p_ctx jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer as $$
declare _tbl text;
begin
  _tbl := case
    when p_id like 'bannos-%'    then 'public.orders_bannos'
    when p_id like 'flourlane-%' then 'public.orders_flourlane'
    else raise exception 'BAD_INPUT';
  end;

  execute format($f$ update %I
                   set filling_start_ts = coalesce(filling_start_ts, now())
                 where id = %L $f$, _tbl, p_id);

  insert into public.stage_events(order_id, store, action, performed_by, meta)
  values (p_id,
          case when p_id like 'bannos-%' then 'Bannos' else 'Flourlane' end,
          'filling_print', p_user, coalesce(p_ctx,'{}'::jsonb));

  return jsonb_build_object('success', true, 'message', null, 'data', jsonb_build_object('id', p_id), 'error_code', null);
end $$;
Indexes Recap
Orders queue: (priority, due_date, size, shopify_order_number) partial where stage <> 'Complete'

Orders assignee: (assignee_id, stage, due_date)

Orders GID & due_date: GID partial; (due_date, stage) partial

Stage events: (order_id, at desc)

Work queue ready: (status, priority, next_retry_at)

Messages: (conversation_id, created_at desc)

Notes
Keep stage logic inside RPCs (validation, timestamps, idempotency, QC returns).

Do not add “pending/in_progress” tables — assignment is derived (assignee_id is null).

Add/adjust indexes based on real query plans (EXPLAIN ANALYZE).

Backups: daily PITR (7 days). See backup-recovery.md.