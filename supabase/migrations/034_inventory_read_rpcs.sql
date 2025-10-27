-- 034_inventory_read_rpcs.sql
-- Read-only SECURITY DEFINER RPCs for Inventory UI tabs
-- No schema changes; uses existing tables (boms, components, accessory_keywords, product_requirements, component_txns, vw_component_balances)

begin;

-- =============================================
-- 1) GET_COMPONENTS
-- =============================================
create or replace function public.get_components(
  p_category text default null,
  p_is_active boolean default true,
  p_low_stock_only boolean default false,
  p_search text default null,
  p_limit int default 100
)
returns table(
  id uuid,
  name text,
  sku text,
  category text,
  unit text,
  min_stock numeric,
  current_stock numeric,
  unit_cost numeric,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.sku,
    c.category,
    c.unit,
    c.min_stock,
    coalesce(b.onhand, 0) as current_stock,
    c.unit_cost,
    c.is_active,
    c.created_at,
    c.updated_at
  from public.components c
  left join public.vw_component_balances b on b.component_id = c.id
  where (p_category is null or c.category = p_category)
    and (p_is_active is null or c.is_active = p_is_active)
    and (p_low_stock_only is false or coalesce(b.onhand, 0) < c.min_stock)
    and (p_search is null
         or c.name ilike '%' || p_search || '%'
         or c.sku ilike '%' || p_search || '%')
  order by c.name
  limit p_limit;
$$;

grant execute on function public.get_components(text, boolean, boolean, text, int) to authenticated;

comment on function public.get_components is
  'Returns components with current stock balances, optional filters for category, active status, low stock, and search.';

-- =============================================
-- 2) GET_BOMS
-- =============================================
create or replace function public.get_boms(
  p_store text default null,
  p_is_active boolean default true,
  p_search text default null
)
returns table(
  id uuid,
  product_title text,
  description text,
  store text,
  shopify_product_id text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    b.id,
    b.product_title,
    b.description,
    b.store,
    b.shopify_product_id,
    b.is_active,
    b.created_at,
    b.updated_at,
    coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'component_id', c.id,
          'component_name', c.name,
          'component_sku', c.sku,
          'quantity', bc.quantity
        ) order by c.name
      )
      from public.bom_components bc
      join public.components c on c.id = bc.component_id
      where bc.bom_id = b.id),
      '[]'::jsonb
    ) as items
  from public.boms b
  where (p_store is null or b.store = p_store)
    and (p_is_active is null or b.is_active = p_is_active)
    and (p_search is null
         or b.product_title ilike '%' || p_search || '%'
         or b.description ilike '%' || p_search || '%')
  order by b.product_title;
$$;

grant execute on function public.get_boms(text, boolean, text) to authenticated;

comment on function public.get_boms is
  'Returns BOMs with their component line items as nested JSON, optional filters for store, active status, and search.';

-- =============================================
-- 3) GET_ACCESSORY_KEYWORDS
-- =============================================
create or replace function public.get_accessory_keywords(
  p_search text default null,
  p_is_active boolean default true
)
returns table(
  id uuid,
  keyword text,
  component_id uuid,
  component_name text,
  component_sku text,
  priority int,
  match_type text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    ak.id,
    ak.keyword,
    ak.component_id,
    c.name as component_name,
    c.sku as component_sku,
    ak.priority,
    ak.match_type,
    ak.is_active,
    ak.created_at,
    ak.updated_at
  from public.accessory_keywords ak
  join public.components c on c.id = ak.component_id
  where (p_is_active is null or ak.is_active = p_is_active)
    and (p_search is null
         or ak.keyword ilike '%' || p_search || '%'
         or c.name ilike '%' || p_search || '%')
  order by ak.keyword;
$$;

grant execute on function public.get_accessory_keywords(text, boolean) to authenticated;

comment on function public.get_accessory_keywords is
  'Returns accessory keywords with their linked component details, optional filters for active status and search.';

-- =============================================
-- 4) GET_PRODUCT_REQUIREMENTS
-- =============================================
create or replace function public.get_product_requirements(
  p_shopify_product_id text default null,
  p_search text default null
)
returns table(
  id uuid,
  shopify_product_id text,
  shopify_variant_id text,
  product_title text,
  component_id uuid,
  component_name text,
  component_sku text,
  quantity_per_unit numeric,
  is_optional boolean,
  auto_deduct boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    pr.id,
    pr.shopify_product_id,
    pr.shopify_variant_id,
    pr.product_title,
    pr.component_id,
    c.name as component_name,
    c.sku as component_sku,
    pr.quantity_per_unit,
    pr.is_optional,
    pr.auto_deduct,
    pr.created_at,
    pr.updated_at
  from public.product_requirements pr
  join public.components c on c.id = pr.component_id
  where (p_shopify_product_id is null or pr.shopify_product_id = p_shopify_product_id)
    and (p_search is null
         or pr.product_title ilike '%' || p_search || '%'
         or c.name ilike '%' || p_search || '%')
  order by pr.product_title;
$$;

grant execute on function public.get_product_requirements(text, text) to authenticated;

comment on function public.get_product_requirements is
  'Returns product requirements with component details, optional filters for Shopify product ID and search.';

-- =============================================
-- 5) GET_STOCK_TRANSACTIONS
-- =============================================
create or replace function public.get_stock_transactions(
  p_component_id uuid default null,
  p_order_id text default null,
  p_transaction_type text default null
)
returns table(
  id uuid,
  component_id uuid,
  component_name text,
  component_sku text,
  delta numeric,
  reason text,
  order_id text,
  performed_by uuid,
  performer_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    ct.id,
    ct.component_id,
    c.name as component_name,
    c.sku as component_sku,
    ct.qty_delta as delta,
    ct.reason,
    ct.ref as order_id,
    ct.created_by as performed_by,
    s.full_name as performer_name,
    ct.created_at,
    ct.created_at as updated_at  -- component_txns are append-only, so updated_at = created_at
  from public.component_txns ct
  join public.components c on c.id = ct.component_id
  left join public.staff_shared s on s.user_id = ct.created_by
  where (p_component_id is null or ct.component_id = p_component_id)
    and (p_order_id is null or ct.ref = p_order_id)
    and (p_transaction_type is null or ct.reason ilike '%' || p_transaction_type || '%')
    and ct.created_at >= now() - interval '30 days'  -- Default 30-day window
  order by ct.created_at desc
  limit 200;
$$;

grant execute on function public.get_stock_transactions(uuid, text, text) to authenticated;

comment on function public.get_stock_transactions is
  'Returns stock transactions (last 30 days, max 200) with component and performer details, optional filters for component, order, and transaction type.';

commit;

