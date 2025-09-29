-- 010b_orders_ingest_parity.sql
-- Columns needed by Kitchen-Docket parity (id, money, raw payload)

alter table public.orders
  add column if not exists human_id         text,        -- e.g. bannos-1234
  add column if not exists shopify_order_id text,        -- Shopify numeric id as text
  add column if not exists currency         text,
  add column if not exists total_amount     numeric(12,2),
  add column if not exists order_json       jsonb;

-- Helpful uniqueness (human_id is unique within a store)
create unique index if not exists orders_store_human_uidx
  on public.orders (store, human_id);
