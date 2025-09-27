-- -- 001_initial_schema.sql
-- Base enums
create type stage as enum ('Filling_pending','Filling_in_progress','Covering_pending','Covering_in_progress','Decorating_pending','Decorating_in_progress','Packing_in_progress','Complete');

create type priority_lvl as enum ('High','Medium','Low');

-- Core: users (app users, not Shopify customers)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null check (role in ('Admin','Supervisor','Staff')),
  store_access text[] not null default '{}', -- e.g. {'bannos','flourlane'}
  active_shift_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  store text not null check (store in ('bannos','flourlane')),
  stage stage not null default 'Filling_pending',
  title text,
  priority priority_lvl not null default 'Medium',
  due_date date,
  barcode text unique,
  storage_location text,
  assignee_id uuid references users(id),
  shopify_order_number bigint,
  human_id text generated always as (
    case store
      when 'bannos' then 'bannos-' || shopify_order_number::text
      else 'flourlane-' || shopify_order_number::text
    end
  ) stored,
  order_json jsonb,
  inventory_blocked boolean not null default false,

  -- timestamps for KPI
  filling_start_ts timestamptz,
  filling_complete_ts timestamptz,
  covering_complete_ts timestamptz,
  decorating_complete_ts timestamptz,
  packing_start_ts timestamptz,
  packing_complete_ts timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stage events (history)
create table if not exists stage_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_stage stage,
  to_stage stage not null,
  performed_by uuid references users(id),
  reason text,
  created_at timestamptz not null default now()
);

-- Minimal inventory + BOM placeholders (expanded later phases)
create table if not exists components (
  sku text primary key,
  name text not null,
  stock_level numeric not null default 0,
  reserved numeric not null default 0,
  buffer numeric not null default 0,
  ats numeric generated always as (stock_level - reserved - buffer) stored,
  updated_at timestamptz not null default now()
);

create table if not exists bom_headers (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,        -- Shopify product handle/ID (mapped later)
  version int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists bom_items (
  id uuid primary key default gen_random_uuid(),
  header_id uuid not null references bom_headers(id) on delete cascade,
  component_sku text not null references components(sku),
  quantity numeric not null check (quantity > 0),
  unit text not null default 'ea'
);

-- Inventory transactions (audit of deductions/restocks)
create table if not exists inventory_txn (
  id uuid primary key default gen_random_uuid(),
  sku text not null references components(sku),
  delta numeric not null,
  reason text,
  order_id uuid references orders(id),
  created_at timestamptz not null default now()
);

-- Work queue for async jobs (inventory sync, webhooks, etc.)
create table if not exists work_queue (
  id uuid primary key default gen_random_uuid(),
  topic text not null,                  -- e.g. 'inventory_push','shopify_sync'
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','done','error')),
  dedupe_key text,                      -- optional idempotency key
  retry_count int not null default 0,
  next_retry_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dead letters for bad payloads / permanently failed jobs
create table if not exists dead_letter (
  id uuid primary key default gen_random_uuid(),
  source text not null,                 -- e.g. 'shopify_webhook','worker'
  payload jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Order photos (QC, proof)
create table if not exists order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  stage stage,
  url text not null,
  signed_url_expires timestamptz,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- API logs / performance
create table if not exists api_logs (
  id uuid primary key default gen_random_uuid(),
  route text not null,                  -- '/webhooks/orders_create' etc.
  t_ms int not null,
  status int not null,
  error_code text,
  created_at timestamptz not null default now()
);

-- Audit log (generic)
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,                 -- 'assign_staff','complete_packing', etc.
  performed_by uuid references users(id),
  source text,                          -- 'ui','worker','webhook'
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Messaging (optional later but safe to stub now)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct',  -- 'direct','group'
  participants uuid[] not null default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid references users(id),
  text text not null,
  sent_at timestamptz not null default now(),
  read_by jsonb default '[]'
);

-- Helpful indexes
create index if not exists idx_orders_store_stage_due on orders(store, stage, due_date);
create index if not exists idx_orders_assignee on orders(assignee_id);
create index if not exists idx_stage_events_order on stage_events(order_id);
create index if not exists idx_work_queue_status_topic on work_queue(status, topic);
create index if not exists idx_dead_letter_source on dead_letter(source);
create index if not exists idx_components_ats on components(ats);
create index if not exists idx_api_logs_route_time on api_logs(route, created_at);

-- Row update triggers for updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
for each row execute function set_updated_at();

drop trigger if exists trg_components_updated on components;
create trigger trg_components_updated before update on components
for each row execute function set_updated_at();

drop trigger if exists trg_work_queue_updated on work_queue;
create trigger trg_work_queue_updated before update on work_queue
for each row execute function set_updated_at();
TODO: write initial schema (orders, views, RLS). Placeholder for Phase 2.
