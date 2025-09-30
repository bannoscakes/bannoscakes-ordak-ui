-- 002_orders_human_id_trigger.sql
-- Human ID generation for separate store tables

-- Human ID generation for orders_bannos
create or replace function public.orders_bannos_set_human_id()
returns trigger language plpgsql as $$
begin
  new.id := 'bannos-' || coalesce(
    nullif(new.shopify_order_number::text, ''),
    new.shopify_order_id::text
  );
  return new;
end $$;

drop trigger if exists trg_orders_bannos_set_human_id on public.orders_bannos;
create trigger trg_orders_bannos_set_human_id
before insert or update of shopify_order_number, shopify_order_id
on public.orders_bannos for each row execute function public.orders_bannos_set_human_id();

-- Human ID generation for orders_flourlane
create or replace function public.orders_flourlane_set_human_id()
returns trigger language plpgsql as $$
begin
  new.id := 'flourlane-' || coalesce(
    nullif(new.shopify_order_number::text, ''),
    new.shopify_order_id::text
  );
  return new;
end $$;

drop trigger if exists trg_orders_flourlane_set_human_id on public.orders_flourlane;
create trigger trg_orders_flourlane_set_human_id
before insert or update of shopify_order_number, shopify_order_id
on public.orders_flourlane for each row execute function public.orders_flourlane_set_human_id();
