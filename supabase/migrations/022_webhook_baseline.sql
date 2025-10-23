-- 022_webhook_baseline.sql
-- Baseline for Shopify webhook ingest: idempotency table (shop-aware) + dead_letter table.

create table if not exists public.processed_webhooks (
  id text not null,                    -- Shopify X-Shopify-Webhook-Id
  shop_domain text not null,           -- e.g., 'bannos.myshopify.com'
  topic text not null,
  received_at timestamptz not null default now(),
  status text not null default 'pending', -- pending | ok | rejected | error
  constraint processed_webhooks_status_check check (status in ('pending','ok','rejected','error')),
  http_hmac text,                      -- what client sent
  note text,                           -- failure reason if any
  primary key (id, shop_domain)        -- composite for true idempotency per store
);

-- create dead_letter table if not exists
create table if not exists public.dead_letter (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  payload jsonb,
  reason text
);
