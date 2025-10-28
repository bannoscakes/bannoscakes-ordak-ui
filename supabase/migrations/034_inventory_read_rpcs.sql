-- 034_inventory_read_rpcs.sql
-- Read-only SECURITY DEFINER RPCs for Inventory UI tabs
-- Creates minimal tables if missing (safe bootstrap); adds RPCs on top
-- Standard pattern: p_search, p_is_active (null=all), p_limit, bounded results

begin;

-- =============================================
-- TABLE BOOTSTRAP (safe guards if tables don't exist yet)
-- =============================================

-- 1) Components table
create table if not exists public.components (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sku        text,
  category   text,
  unit       text default 'unit',
  min_stock  numeric default 0,
  unit_cost  numeric default 0,
  is_active  boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists components_sku_uidx on public.components(sku) where sku is not null;

-- 2) BOMs table
create table if not exists public.boms (
  id                  uuid primary key default gen_random_uuid(),
  product_title       text not null,
  description         text,
  store               text,
  shopify_product_id  text,
  is_active           boolean default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 3) BOM Components (junction table)
create table if not exists public.bom_components (
  id           uuid primary key default gen_random_uuid(),
  bom_id       uuid not null references public.boms(id) on delete cascade,
  component_id uuid not null references public.components(id) on delete restrict,
  qty          numeric not null default 1,
  created_at   timestamptz not null default now()
);

create unique index if not exists bom_components_bom_component_uidx 
  on public.bom_components(bom_id, component_id);

-- 4) Accessory Keywords table
create table if not exists public.accessory_keywords (
  id           uuid primary key default gen_random_uuid(),
  keyword      text not null,
  component_id uuid not null references public.components(id) on delete cascade,
  priority     int default 0,
  match_type   text default 'contains',
  is_active    boolean default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists accessory_keywords_keyword_idx on public.accessory_keywords(keyword);

-- 5) Product Requirements table
create table if not exists public.product_requirements (
  id                   uuid primary key default gen_random_uuid(),
  shopify_product_id   text not null,
  shopify_variant_id   text,
  product_title        text not null,
  component_id         uuid not null references public.components(id) on delete restrict,
  quantity_per_unit    numeric not null default 1,
  is_optional          boolean default false,
  auto_deduct          boolean default true,
  is_active            boolean default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists product_requirements_shopify_product_id_idx 
  on public.product_requirements(shopify_product_id);

-- =============================================
-- 1) GET_COMPONENTS  (no view dependency)
-- =============================================
drop function if exists public.get_components(text, boolean, int);

create or replace function public.get_components(
  p_search     text    default null,
  p_is_active  boolean default null,
  p_limit      int     default 100
)
returns setof public.components
language sql
security definer
set search_path = public
as $$
  select *
  from public.components c
  where (p_is_active is null or c.is_active = p_is_active)
    and (p_search   is null or c.name ilike '%'||p_search||'%')
  order by c.name
  limit p_limit
$$;

grant execute on function public.get_components(text, boolean, int) to authenticated;

-- =============================================
-- 2) GET_BOMS  (store-aware, bounded, active filter optional)
-- =============================================
drop function if exists public.get_boms(text, boolean, text, int);

create or replace function public.get_boms(
  p_store      text    default null,
  p_is_active  boolean default null,
  p_search     text    default null,
  p_limit      int     default 100
)
returns table (
  id             uuid,
  product_title  text,
  store          text,
  is_active      boolean,
  items          jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.product_title,
    b.store,
    b.is_active,
    (
      select jsonb_agg(jsonb_build_object(
               'component_id', bc.component_id,
               'component_name', c.name,
               'unit', c.unit,
               'qty', bc.qty
             ) order by c.name)
      from public.bom_components bc
      join public.components c on c.id = bc.component_id
      where bc.bom_id = b.id
    ) as items
  from public.boms b
  where (p_store     is null or b.store = p_store)
    and (p_is_active is null or b.is_active = p_is_active)
    and (p_search    is null or b.product_title ilike '%'||p_search||'%')
  order by b.product_title
  limit p_limit
$$;

grant execute on function public.get_boms(text, boolean, text, int) to authenticated;

-- =============================================
-- 3) GET_ACCESSORY_KEYWORDS  (return with linked component details)
-- =============================================
drop function if exists public.get_accessory_keywords(text, boolean, int);

create or replace function public.get_accessory_keywords(
  p_search     text    default null,
  p_is_active  boolean default null,
  p_limit      int     default 200
)
returns table (
  id            uuid,
  keyword       text,
  match_type    text,
  priority      int,
  is_active     boolean,
  component_id  uuid,
  component_name text,
  component_unit text
)
language sql
security definer
set search_path = public
as $$
  select
    ak.id,
    ak.keyword,
    ak.match_type,
    ak.priority,
    ak.is_active,
    ak.component_id,
    c.name  as component_name,
    c.unit  as component_unit
  from public.accessory_keywords ak
  left join public.components c on c.id = ak.component_id
  where (p_is_active is null or ak.is_active = p_is_active)
    and (p_search    is null or ak.keyword ilike '%'||p_search||'%')
  order by ak.keyword
  limit p_limit
$$;

grant execute on function public.get_accessory_keywords(text, boolean, int) to authenticated;

-- =============================================
-- 4) GET_PRODUCT_REQUIREMENTS  (include component details; bounded)
-- =============================================
drop function if exists public.get_product_requirements(text, text, boolean, int);

create or replace function public.get_product_requirements(
  p_shopify_product_id text    default null,
  p_search             text    default null,
  p_is_active          boolean default null,
  p_limit              int     default 200
)
returns table (
  id               uuid,
  shopify_product_id text,
  product_title    text,
  component_id     uuid,
  component_name   text,
  component_unit   text,
  quantity_per_unit numeric,
  is_active        boolean
)
language sql
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.shopify_product_id,
    pr.product_title,
    pr.component_id,
    c.name  as component_name,
    c.unit  as component_unit,
    pr.quantity_per_unit,
    pr.is_active
  from public.product_requirements pr
  left join public.components c on c.id = pr.component_id
  where (p_shopify_product_id is null or pr.shopify_product_id = p_shopify_product_id)
    and (p_is_active         is null or pr.is_active = p_is_active)
    and (p_search            is null or pr.product_title ilike '%'||p_search||'%')
  order by pr.product_title, c.name
  limit p_limit
$$;

grant execute on function public.get_product_requirements(text, text, boolean, int) to authenticated;

-- =============================================
-- 5) GET_STOCK_TRANSACTIONS (preview-safe; adds order/type filters)
--    Compiles even if public.component_txns does not exist.
-- =============================================
drop function if exists public.get_stock_transactions(uuid, timestamptz, uuid, text, int);

create or replace function public.get_stock_transactions(
  p_component        uuid        default null,
  p_since            timestamptz default (now() - interval '30 days'),
  p_order_id         uuid        default null,
  p_transaction_type text        default null,
  p_limit            int         default 200
)
returns table (
  id               uuid,
  created_at       timestamptz,
  component_id     uuid,
  qty              numeric,
  transaction_type text,
  order_id         uuid,
  payload          jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  sql text;
begin
  -- If underlying table is missing (fresh preview), return no rows to keep migration compilable.
  if to_regclass('public.component_txns') is null then
    return;
  end if;

  sql := '
    select
      t.id, t.created_at, t.component_id, t.qty, t.transaction_type, t.order_id, t.payload
    from public.component_txns t
    where t.created_at >= $1
      and ($2 is null or t.component_id = $2)
      and ($3 is null or t.order_id     = $3)
      and ($4 is null or t.transaction_type = $4)
    order by t.created_at desc
    limit $5
  ';

  return query execute sql using p_since, p_component, p_order_id, p_transaction_type, p_limit;
end;
$$;

grant execute on function public.get_stock_transactions(
  uuid, timestamptz, uuid, text, int
) to authenticated;

commit;
