-- 022_webhook_baseline.sql
-- Baseline for Shopify webhook ingest: idempotency table (shop-aware) + minimal dead_letter reason.

create table if not exists public.processed_webhooks (
  id text not null,                    -- Shopify X-Shopify-Webhook-Id
  shop_domain text not null,           -- e.g., 'bannos.myshopify.com'
  topic text not null,
  received_at timestamptz not null default now(),
  status text not null default 'ok',   -- ok | rejected | error
  http_hmac text,                      -- what client sent
  note text,                           -- failure reason if any
  primary key (id, shop_domain)        -- composite for true idempotency per store
);

-- extend dead_letter with reason (if not present)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='dead_letter' and column_name='reason'
  ) then
    alter table public.dead_letter add column reason text;
  end if;
end$$;

