create table if not exists public.orders (
  store                text,
  shopify_order_id     text,
  shopify_order_gid    text,
  order_number         text,
  shopify_order_number text,
  customer_name        text,
  delivery_date        date,
  delivery_method      text,
  product_title        text,
  flavour              text,
  item_qty             integer,
  notes                text,
  currency             text,
  total_amount         numeric(12,2),
  order_json           jsonb,
  human_id             text
);
create unique index if not exists orders_shopify_gid_uidx on public.orders (shopify_order_gid);
create unique index if not exists orders_store_human_uidx  on public.orders (store, human_id);
create index if not exists orders_store_delivery_idx       on public.orders (store, delivery_date);
