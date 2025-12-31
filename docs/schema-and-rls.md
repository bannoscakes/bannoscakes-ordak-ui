# Schema & RLS
**Version:** 2.0.0
**Last Updated:** 2025-12-31
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
```

---

## Enums

```sql
do $$
begin
  if not exists (select 1 from pg_type where typname = 'stage_type') then
    create type stage_type as enum ('Filling','Covering','Decorating','Packing','Complete');
  end if;
end$$;
```

---

## Staff (shared) — create first (FK target)

```sql
create table if not exists public.staff_shared (
  row_id       uuid primary key default gen_random_uuid(),
  user_id      uuid unique,                 -- supabase auth id
  full_name    text,
  role         text check (role in ('Admin','Supervisor','Staff')) default 'Staff',
  store        text check (store in ('bannos','flourlane','both')) default 'both',
  email        text,
  phone        text,
  hourly_rate  numeric(10,2),
  is_active    boolean default true,
  approved     boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_staff_active_role
  on public.staff_shared (is_active, role);
```

---

## Orders (per store)

Two identical tables, one per store. `assignee_id` references `staff_shared(user_id)`.

```sql
-- Bannos
create table if not exists public.orders_bannos (
  row_id                 uuid primary key default gen_random_uuid(),
  id                     text not null unique,          -- human/scanner id e.g. bannos-12345
  shopify_order_id       bigint,                        -- numeric id
  shopify_order_gid      text,                          -- GraphQL GID (for dedupe)
  shopify_order_number   int,
  human_id               text,                          -- display ID
  customer_name          text,
  product_title          text,
  flavour                text,
  size                   text,
  item_qty               int default 1,
  notes                  text,
  cake_writing           text,
  product_image          text,
  delivery_method        text,
  currency               char(3),
  total_amount           numeric(12,2),
  order_json             jsonb,
  stage                  stage_type not null default 'Filling',
  priority               text check (priority in ('HIGH','MEDIUM','LOW')) default 'LOW',
  assignee_id            uuid references public.staff_shared(user_id) on delete set null,
  storage                text,
  due_date               date not null,
  -- operational timestamps
  filling_start_ts       timestamptz,
  filling_complete_ts    timestamptz,
  covering_start_ts      timestamptz,
  covering_complete_ts   timestamptz,
  decorating_start_ts    timestamptz,
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
```

---

## Indexes (orders)

```sql
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
```

---

## Stage Events (audit trail)

```sql
create table if not exists public.stage_events (
  id            bigserial primary key,
  order_id      text not null,
  store         text not null check (store in ('bannos','flourlane')),
  stage         stage_type,
  action        text not null,              -- e.g. filling_print | filling_complete | qc_return
  performed_by  uuid,
  meta          jsonb default '{}'::jsonb,
  at            timestamptz not null default now()
);

create index if not exists idx_stage_events_order_time
  on public.stage_events (order_id, at desc);
```

---

## Inventory

### Components

```sql
create table if not exists public.components (
  id            uuid primary key default gen_random_uuid(),
  sku           text unique not null,
  name          text not null,
  description   text,
  category      text default 'other',
  unit          text default 'each',
  current_stock numeric(12,3) default 0,
  min_stock     numeric(12,3) default 0,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
```

### Accessories

```sql
create table if not exists public.accessories (
  id            uuid primary key default gen_random_uuid(),
  sku           text unique not null,
  name          text not null,
  category      text check (category in ('topper','balloon','candle','other')) default 'other',
  product_match text,
  current_stock int default 0,
  min_stock     int default 5,
  is_active     boolean default true,
  needs_sync    boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
```

### Cake Toppers

```sql
create table if not exists public.cake_toppers (
  id                   uuid primary key default gen_random_uuid(),
  name_1               text not null,
  name_2               text,
  current_stock        int default 0,
  min_stock            int default 5,
  shopify_product_id_1 text,
  shopify_product_id_2 text,
  is_active            boolean default true,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
```

### BOMs

```sql
create table if not exists public.boms (
  id                 uuid primary key default gen_random_uuid(),
  product_title      text not null,
  store              text check (store in ('bannos','flourlane','both')) default 'both',
  description        text,
  shopify_product_id text,
  is_active          boolean default true,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists public.bom_items (
  id                uuid primary key default gen_random_uuid(),
  bom_id            uuid references public.boms(id) on delete cascade,
  component_id      uuid references public.components(id),
  quantity_required numeric(12,3) not null,
  stage             stage_type,
  created_at        timestamptz default now()
);
```

### Stock Transactions (audit log)

```sql
create table if not exists public.stock_transactions (
  id            uuid primary key default gen_random_uuid(),
  table_name    text not null,              -- 'components' | 'accessories' | 'cake_toppers'
  item_id       uuid not null,
  change_amount numeric(12,3) not null,
  stock_before  numeric(12,3) not null,
  stock_after   numeric(12,3) not null,
  reason        text,
  reference     text,
  created_by    uuid,
  created_at    timestamptz default now()
);
```

### Work Queue

```sql
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

create index if not exists idx_work_queue_scan
  on public.work_queue (status, priority, next_retry_at);
```

---

## Messaging

```sql
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  type        text check (type in ('direct','group','broadcast')) default 'direct',
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

create table if not exists public.message_reads (
  message_id      bigint references public.messages(id) on delete cascade,
  user_id         uuid,
  read_at         timestamptz default now(),
  primary key (message_id, user_id)
);

create index if not exists idx_messages_conv_time
  on public.messages (conversation_id, created_at desc);
```

---

## Time & Payroll

```sql
create table if not exists public.shifts (
  id        uuid primary key default gen_random_uuid(),
  staff_id  uuid not null references public.staff_shared(user_id),
  store     text check (store in ('bannos','flourlane')),
  start_ts  timestamptz not null,
  end_ts    timestamptz,
  note      text,
  created_at timestamptz default now()
);

create table if not exists public.breaks (
  id        uuid primary key default gen_random_uuid(),
  shift_id  uuid references public.shifts(id) on delete cascade,
  staff_id  uuid not null,
  start_ts  timestamptz not null,
  end_ts    timestamptz
);
```

---

## RLS Strategy

**Goal:** Clients can read; cannot write directly. All writes via RPCs.

### RLS Helper Functions

```sql
-- Cached role lookup for RLS policies (optimized with auth_rls_initplan)
create or replace function current_user_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from staff_shared where user_id = (select auth.uid()) limit 1;
$$;

-- Conversation participant check
create or replace function is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from conversation_participants
    where conversation_id = p_conversation_id
      and user_id = (select auth.uid())
  );
$$;
```

### RLS Pattern: `(select auth.uid())`

**IMPORTANT:** All RLS policies use `(select auth.uid())` instead of `auth.uid()` directly.

This subquery pattern enables PostgreSQL to cache the auth.uid() result and reuse it across row evaluations, improving query performance significantly. The Supabase Performance Advisor checks for this via `auth_rls_initplan`.

```sql
-- GOOD: Uses subquery - auth.uid() cached
create policy "staff_select_own_or_admin" on staff_shared
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or current_user_role() = 'Admin'
  );

-- BAD: Direct call - evaluated per row
create policy "staff_select_bad" on staff_shared
  for select to authenticated
  using (user_id = auth.uid());  -- No caching!
```

### Policy Consolidation (Dec 2025)

Multiple permissive policies on the same action cause PostgreSQL to evaluate all of them. We consolidated:

1. **Replaced FOR ALL policies** with individual SELECT/INSERT/UPDATE/DELETE policies
2. **Dropped redundant service_only policies** (service_role bypasses RLS anyway)
3. **Dropped legacy public role policies** (kept authenticated versions)
4. **Dropped rls_bypass() function** (no longer needed)

Current RLS warnings: **0 security, 0 performance**

---

## RLS Policies by Table

### Orders (orders_bannos, orders_flourlane)

```sql
-- SELECT: Role-based access
create policy "orders_select_by_role" on orders_bannos
  for select to authenticated
  using (
    current_user_role() in ('Admin', 'Supervisor')
    or assignee_id = (select auth.uid())
  );

-- INSERT/UPDATE/DELETE: Blocked (use RPCs)
create policy "orders_block_insert" on orders_bannos
  for insert to authenticated with check (false);
create policy "orders_block_update" on orders_bannos
  for update to authenticated using (false);
create policy "orders_block_delete" on orders_bannos
  for delete to authenticated using (false);
```

### Staff

```sql
-- SELECT: Own record or Admin
create policy "staff_select_own_or_admin" on staff_shared
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or current_user_role() = 'Admin'
  );

-- INSERT/UPDATE/DELETE: Admin only
create policy "staff_insert_admin_only" on staff_shared
  for insert to authenticated with check (current_user_role() = 'Admin');
create policy "staff_update_admin_only" on staff_shared
  for update to authenticated using (current_user_role() = 'Admin');
create policy "staff_delete_admin_only" on staff_shared
  for delete to authenticated using (current_user_role() = 'Admin');
```

### Inventory (components, accessories, boms)

```sql
-- SELECT: All authenticated
create policy "components_select_authenticated" on components
  for select to authenticated using (true);

-- INSERT/UPDATE/DELETE: Via RPCs only (blocked)
create policy "components_block_insert" on components
  for insert to authenticated with check (false);
```

### Messaging

```sql
-- conversations: SELECT if participant or Admin
create policy "conversations_select_participant" on conversations
  for select to authenticated
  using (
    is_conversation_participant(id)
    or current_user_role() = 'Admin'
  );

-- messages: SELECT if conversation participant
create policy "messages_select_participant" on messages
  for select to authenticated
  using (is_conversation_participant(conversation_id));
```

### System Tables (work_queue, dead_letter, webhooks)

```sql
-- SELECT: Admin only
create policy "work_queue_admin_only" on work_queue
  for select to authenticated
  using (current_user_role() = 'Admin');

-- INSERT/UPDATE/DELETE: Blocked (service_role only)
create policy "work_queue_block_insert" on work_queue
  for insert to authenticated with check (false);
create policy "work_queue_block_update" on work_queue
  for update to authenticated using (false);
create policy "work_queue_block_delete" on work_queue
  for delete to authenticated using (false);
```

---

## RPC Write Pattern

All writes go through SECURITY DEFINER RPCs with role validation:

```sql
create or replace function public.complete_filling(
  p_order_id text,
  p_store text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _tbl text;
  _role text;
begin
  -- Role check
  _role := current_user_role();
  if _role is null then
    raise exception 'UNAUTHORIZED';
  end if;

  -- Route to correct table
  _tbl := case p_store
    when 'bannos' then 'orders_bannos'
    when 'flourlane' then 'orders_flourlane'
    else null
  end;

  if _tbl is null then
    raise exception 'INVALID_STORE';
  end if;

  -- Update order
  execute format($f$
    update %I
    set filling_complete_ts = now(),
        stage = 'Covering'::stage_type,
        notes = coalesce(%L, notes)
    where id = %L
      and stage = 'Filling'
  $f$, _tbl, p_notes, p_order_id);

  -- Audit log
  insert into stage_events(order_id, store, stage, action, performed_by)
  values (p_order_id, p_store, 'Filling', 'filling_complete', (select auth.uid()));

  return jsonb_build_object('success', true);
end $$;
```

---

## Indexes Recap

| Table | Index | Purpose |
|-------|-------|---------|
| orders_* | `(priority, due_date, size, shopify_order_number)` | Queue ordering (partial: stage <> 'Complete') |
| orders_* | `(stage, priority, shopify_order_number)` | Unassigned queries (partial: assignee_id IS NULL) |
| orders_* | `(shopify_order_gid)` | Webhook dedupe (partial: gid IS NOT NULL) |
| orders_* | `(due_date, stage)` | Date range queries |
| stage_events | `(order_id, at desc)` | Order history lookup |
| work_queue | `(status, priority, next_retry_at)` | Job processing |
| messages | `(conversation_id, created_at desc)` | Message retrieval |

---

## Notes

- Keep stage logic inside RPCs (validation, timestamps, idempotency, QC returns).
- Do not add "pending/in_progress" tables — assignment is derived (`assignee_id IS NULL`).
- Add/adjust indexes based on real query plans (`EXPLAIN ANALYZE`).
- Backups: daily PITR (7 days). See `backup-recovery.md`.
