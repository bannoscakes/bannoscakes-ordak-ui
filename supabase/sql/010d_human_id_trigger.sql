-- 010d_human_id_trigger.sql
-- Make human_id maintained by trigger (no view breakage), backfill, and enforce uniqueness.

-- If human_id was a generated column before, drop the expression (noop if plain)
do $$
begin
  begin
    alter table public.orders alter column human_id drop expression;
  exception when others then null;
  end;
end$$;

-- Backfill existing rows (safe if table empty)
update public.orders
set human_id = store::text || '-' ||
               coalesce(order_number::text, shopify_order_number::text, shopify_order_id::text)
where human_id is null or human_id = '';

-- Trigger function to keep human_id correct on insert/update
create or replace function public.orders_set_human_id()
returns trigger
language plpgsql
as $$
begin
  new.human_id := new.store::text || '-' ||
                  coalesce(new.order_number::text, new.shopify_order_number::text, new.shopify_order_id::text);
  return new;
end
$$;

-- Install trigger (idempotent-ish)
drop trigger if exists trg_orders_set_human_id on public.orders;
create trigger trg_orders_set_human_id
before insert or update of store, order_number, shopify_order_number, shopify_order_id
on public.orders
for each row
execute function public.orders_set_human_id();

-- Uniqueness for store+human_id
create unique index if not exists orders_store_human_uidx
  on public.orders (store, human_id);
