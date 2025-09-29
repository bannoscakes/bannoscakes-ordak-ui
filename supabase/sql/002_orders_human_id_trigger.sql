create or replace function public.orders_set_human_id()
returns trigger language plpgsql as $$
begin
  new.human_id := new.store::text || '-' ||
                  coalesce(
                    nullif(new.order_number::text, ''),
                    nullif(new.shopify_order_number::text, ''),
                    new.shopify_order_id::text
                  );
  return new;
end $$;
drop trigger if exists trg_orders_set_human_id on public.orders;
create trigger trg_orders_set_human_id
before insert or update of store, order_number, shopify_order_number, shopify_order_id
on public.orders for each row execute function public.orders_set_human_id();
