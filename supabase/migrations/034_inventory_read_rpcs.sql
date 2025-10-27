-- 034_inventory_read_rpcs.sql
-- Read-only SECURITY DEFINER RPCs for Inventory UI tabs
-- No schema changes; uses existing tables (boms, components, accessory_keywords, product_requirements, component_txns, vw_component_balances)
-- Standard pattern: p_search, p_is_active (null=all), p_limit

begin;

-- =============================================
-- 1) GET_COMPONENTS
-- =============================================
create or replace function public.get_components(
  p_search text default null,
  p_is_active boolean default null,
  p_limit int default 100
)
returns setof vw_component_balances
language sql
security definer
set search_path = public
as $$
  select *
  from public.vw_component_balances v
  where (p_is_active is null or v.is_active = p_is_active)
    and (p_search is null or v.name ilike '%'||p_search||'%')
  order by v.name
  limit p_limit;
$$;

grant execute on function public.get_components(text, boolean, int) to authenticated;

comment on function public.get_components is
  'Returns components with balances from vw_component_balances; p_is_active: null=all, true=active, false=inactive.';

-- =============================================
-- 2) GET_BOMS
-- =============================================
create or replace function public.get_boms(
  p_search text default null,
  p_is_active boolean default null,
  p_limit int default 100
)
returns table (
  id uuid,
  product_title text,
  is_active boolean,
  items jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.product_title,
    b.is_active,
    (
      select jsonb_agg(jsonb_build_object(
        'component_id', c.id,
        'component_name', c.name,
        'qty', bc.qty
      ) order by c.name)
      from public.bom_components bc
      join public.components c on c.id = bc.component_id
      where bc.bom_id = b.id
    ) as items
  from public.boms b
  where (p_is_active is null or b.is_active = p_is_active)
    and (p_search is null or b.product_title ilike '%'||p_search||'%')
  order by b.product_title
  limit p_limit;
$$;

grant execute on function public.get_boms(text, boolean, int) to authenticated;

comment on function public.get_boms is
  'Returns BOMs with nested component items as JSON; p_is_active: null=all.';

-- =============================================
-- 3) GET_ACCESSORY_KEYWORDS
-- =============================================
create or replace function public.get_accessory_keywords(
  p_search text default null,
  p_is_active boolean default null,
  p_limit int default 100
)
returns setof accessory_keywords
language sql
security definer
set search_path = public
as $$
  select ak.*
  from public.accessory_keywords ak
  where (p_is_active is null or ak.is_active = p_is_active)
    and (p_search is null or ak.keyword ilike '%'||p_search||'%')
  order by ak.keyword
  limit p_limit;
$$;

grant execute on function public.get_accessory_keywords(text, boolean, int) to authenticated;

comment on function public.get_accessory_keywords is
  'Returns accessory keywords; p_is_active: null=all.';

-- =============================================
-- 4) GET_PRODUCT_REQUIREMENTS
-- =============================================
create or replace function public.get_product_requirements(
  p_shopify_product_id text default null,
  p_search text default null,
  p_is_active boolean default null,
  p_limit int default 100
)
returns setof product_requirements
language sql
security definer
set search_path = public
as $$
  select pr.*
  from public.product_requirements pr
  where (p_shopify_product_id is null or pr.shopify_product_id = p_shopify_product_id)
    and (p_is_active is null or pr.is_active = p_is_active)
    and (p_search is null or pr.product_title ilike '%'||p_search||'%')
  order by pr.product_title
  limit p_limit;
$$;

grant execute on function public.get_product_requirements(text, text, boolean, int) to authenticated;

comment on function public.get_product_requirements is
  'Returns product requirements; p_is_active: null=all.';

-- =============================================
-- 5) GET_STOCK_TRANSACTIONS
-- =============================================
create or replace function public.get_stock_transactions(
  p_component uuid default null,
  p_since timestamptz default now() - interval '30 days',
  p_limit int default 200
)
returns setof component_txns
language sql
security definer
set search_path = public
as $$
  select *
  from public.component_txns t
  where (p_component is null or t.component_id = p_component)
    and t.created_at >= p_since
  order by t.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_stock_transactions(uuid, timestamptz, int) to authenticated;

comment on function public.get_stock_transactions is
  'Returns stock transactions; default: last 30 days, max 200 rows.';

commit;

