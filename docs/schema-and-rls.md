# Schema & RLS

This document defines the **database schema** and **row-level security** rules for Ordak.  
Stage model: **Filling → Covering → Decorating → Packing → Complete** (single enum); progress is recorded by **timestamps + events**.  
**All writes go through SECURITY DEFINER RPCs**. Client can **SELECT** (read) but cannot write tables directly.

---

## Prerequisites

```sql
-- Enable UUID; Supabase projects already include pgcrypto
create extension if not exists pgcrypto;

-- Updated-at helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
Enums
sql
Copy code
do $$
begin
  if not exists (select 1 from pg_type where typname = 'stage_type') then
    create type stage_type as enum ('Filling','Covering','Decorating','Packing','Complete');
  end if;
end$$;
Core: Orders (one table per store)
Human ID id is scanner-friendly, unique per table. Surrogate row_id is the primary key.

sql
Copy code
-- Bannos
create table if not exists public.orders_bannos (
  row_id                 uuid primary key default gen_random_uuid(),
  id                     text not null unique,
  shopify_order_id       bigint,
  shopify_order_gid      text,
  shopify_order_number   int,
  customer_name          text,
  product_title          text,
  flavour                text,
  notes                  text,
  currency               char(3),
  total_amount           numeric(12,2),
  order_json             jsonb,
  stage                  stage_type not null default 'Filling',
  priority               smallint default 0,
  assignee_id            uuid,
  storage                text,
  -- timestamps (operational)
  filling_start_ts       timestamptz,
  filling_complete_ts    timestamptz,
  covering_complete_ts   timestamptz,
  decorating_complete_ts timestamptz,
  packing_start_ts       timestamptz,
  packing_complete_ts    timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Flourlane (identical structure)
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
-- Fast queue queries (incomplete + priority)
create index if not exists idx_orders_bannos_queue
  on public.orders_bannos (priority desc, shopify_order_number, id)
  where stage <> 'Complete';

create index if not exists idx_orders_flourlane_queue
  on public.orders_flourlane (priority desc, shopify_order_number, id)
  where stage <> 'Complete';

-- Unassigned lists / counts (per stage, no assignee)
create index if not exists idx_orders_bannos_unassigned
  on public.orders_bannos (stage, priority, shopify_order_number)
  where assignee_id is null and stage <> 'Complete';

create index if not exists idx_orders_flourlane_unassigned
  on public.orders_flourlane (stage, priority, shopify_order_number)
  where assignee_id is null and stage <> 'Complete';
Stage Events (optional but recommended)
Audit trail for operational actions (prints, scans, QC returns).

sql
Copy code
create table if not exists public.stage_events (
  id            bigserial primary key,
  order_id      text not null,
  store         text not null check (store in ('Bannos','Flourlane')),
  action        text not null,              -- e.g. filling_print | filling_complete | start_packing | qc_return
  performed_by  uuid,                       -- user row_id
  meta          jsonb default '{}'::jsonb,  -- extra info (reason, device, etc.)
  at            timestamptz not null default now()
);

create index if not exists idx_stage_events_order_time
  on public.stage_events (order_id, at desc);
Staff (shared) – minimal
sql
Copy code
create table if not exists public.staff_shared (
  row_id       uuid primary key default gen_random_uuid(),
  user_id      uuid unique,                 -- supabase auth user id
  full_name    text,
  is_active    boolean default true,
  role         text check (role in ('Worker','Supervisor','Admin')) default 'Worker',
  created_at   timestamptz default now()
);

create index if not exists idx_staff_active_role on public.staff_shared (is_active, role);
Inventory (minimal to support holds + sync)
sql
Copy code
-- Items catalog
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
  reason     text,                          -- order_create | manual_adjust | reconcile
  ref_id     text,                          -- order id or external reference
  created_at timestamptz default now()
);
create index if not exists idx_inv_txn_sku_time on public.inventory_txn (sku, created_at desc);

-- Work queue for Shopify ATS/OOS pushes
create table if not exists public.work_queue (
  id            bigserial primary key,
  topic         text not null,              -- inventory_push | reconcile
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
Messaging (optional surface)
sql
Copy code
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
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
RLS Strategy
Goal: Clients can read; they cannot write tables directly. All writes go via RPCs.

Orders (both tables)
sql
Copy code
-- Enable RLS
alter table public.orders_bannos    enable row level security;
alter table public.orders_flourlane enable row level security;

-- READ: allow authenticated users to select
drop policy if exists p_read_orders_bannos on public.orders_bannos;
create policy p_read_orders_bannos
on public.orders_bannos
for select
to authenticated
using (true);

drop policy if exists p_read_orders_fl on public.orders_flourlane;
create policy p_read_orders_fl
on public.orders_flourlane
for select
to authenticated
using (true);

-- WRITE: do not create insert/update/delete policies => blocked by RLS
Note: Edge Functions using service role bypass RLS (for webhooks, reconciliation).
RPCs are SECURITY DEFINER and perform writes after validating roles.

Stage Events
sql
Copy code
alter table public.stage_events enable row level security;

-- Allow authenticated to read their operational history
drop policy if exists p_read_stage_events on public.stage_events;
create policy p_read_stage_events
on public.stage_events
for select
to authenticated
using (true);

-- No insert/update/delete policies (writes come from RPCs)
Staff / Inventory / Work Queue / Messages
staff_shared: allow select to authenticated; no write policies (admin writes via RPC/Admin UI).

inventory_items / inventory_txn / work_queue: no client writes; select as needed; Edge uses service role.

conversations/messages: allow select to participants (add policies later when wiring the feature).

Example read-only policy pattern:

sql
Copy code
alter table public.inventory_items enable row level security;
drop policy if exists p_read_inv_items on public.inventory_items;
create policy p_read_inv_items
on public.inventory_items
for select
to authenticated
using (true);
-- No write policies
Grants (belt-and-suspenders)
sql
Copy code
-- Revoke default public writes
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Grant read-only where intended (RLS still applies)
grant select on public.orders_bannos, public.orders_flourlane to authenticated;
grant select on public.stage_events, public.inventory_items, public.inventory_txn to authenticated;
grant select on public.conversations, public.conversation_participants, public.messages to authenticated;
RPC Write Pattern (example)
Functions are created in sql migrations and marked SECURITY DEFINER. They validate roles, enforce idempotency, update rows, and append stage_events.

sql
Copy code
create or replace function public.handle_print_barcode(p_id text, p_user uuid, p_ctx jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  _tbl text;
begin
  -- choose table by prefix
  _tbl := case
    when p_id like 'bannos-%'    then 'public.orders_bannos'
    when p_id like 'flourlane-%' then 'public.orders_flourlane'
    else raise exception 'BAD_INPUT';
  end;

  -- set filling_start_ts only if null (idempotent)
  execute format($f$
    update %I
       set filling_start_ts = coalesce(filling_start_ts, now())
     where id = %L
     returning (filling_start_ts is not null) as already_set
  $f$, _tbl, p_id);

  -- append stage event (simplified example)
  insert into public.stage_events(order_id, store, action, performed_by, meta)
  values (p_id, case when p_id like 'bannos-%' then 'Bannos' else 'Flourlane' end,
          'filling_print', p_user, coalesce(p_ctx,'{}'::jsonb));

  return jsonb_build_object('ok', true, 'data', jsonb_build_object('id', p_id));
end $$;
Notes
Keep stage logic inside RPCs (validation, timestamps, idempotency, QC returns).

Do not add “pending/in_progress” tables—assignment is derived (assignee_id is null).

Add/adjust indexes based on real query plans (use explain analyze).

Backups: daily PITR (7 days). See backup-recovery.md.

pgsql
Copy code

# 2) Commit & push (ONLY this file)
After you paste and save in Cursor, run these inside `bannoscakes-ordak-ui`:

```bash
git add docs/schema-and-rls.md
git commit -m "docs(schema): tables, indexes, and RLS pattern for stage model"
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"