-- =====================================================
-- Migration: QUEUE ORDERS
-- Date: 2025-11-07
-- Description: Extract production RPCs for queue orders
-- =====================================================
-- 
-- Functions in this migration:
--   - get_queue
--   - get_queue_minimal
--   - get_queue_stats
--   - get_unassigned_counts
--   - get_complete_minimal
--   - get_order_for_scan
--   - admin_delete_order
--
-- =====================================================

-- Function: get_queue
CREATE OR REPLACE FUNCTION public.get_queue(p_store text DEFAULT NULL::text, p_stage text DEFAULT NULL::text, p_assignee_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_priority text DEFAULT NULL::text, p_storage text DEFAULT NULL::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 50, p_sort_by text DEFAULT 'priority'::text, p_sort_order text DEFAULT 'DESC'::text)
 RETURNS TABLE(id text, shopify_order_id bigint, shopify_order_number integer, customer_name text, product_title text, flavour text, notes text, currency character, total_amount numeric, stage stage_type, priority priority_level, due_date date, delivery_method text, size text, item_qty integer, storage text, assignee_id uuid, assignee_name text, store text, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF p_store = 'bannos' OR p_store IS NULL THEN
    RETURN QUERY
    SELECT 
      o.id,
      o.shopify_order_id,
      o.shopify_order_number,
      o.customer_name,
      o.product_title,
      o.flavour,
      o.notes,
      o.currency,
      o.total_amount,
      o.stage,
      o.priority,
      o.due_date,
      o.delivery_method,
      o.size,
      o.item_qty,
      o.storage,
      o.assignee_id,
      s.full_name as assignee_name,
      'bannos'::text as store,
      o.created_at,
      o.updated_at,
      COUNT(*) OVER() as total_count
    FROM public.orders_bannos o
    LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
    WHERE (p_stage IS NULL OR o.stage::text = p_stage)
      AND (p_assignee_id IS NULL OR o.assignee_id = p_assignee_id)
      AND (p_priority IS NULL OR o.priority::text = p_priority)
      AND (p_storage IS NULL OR o.storage = p_storage)
      AND (p_search IS NULL OR 
           o.customer_name ILIKE '%' || p_search || '%' OR 
           o.product_title ILIKE '%' || p_search || '%' OR
           o.id ILIKE '%' || p_search || '%')
    ORDER BY 
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'DESC' THEN o.priority END DESC,
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'ASC' THEN o.priority END ASC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'DESC' THEN o.due_date END DESC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'ASC' THEN o.due_date END ASC,
      o.created_at ASC
    LIMIT p_limit OFFSET p_offset;
  END IF;
  IF p_store = 'flourlane' OR p_store IS NULL THEN
    RETURN QUERY
    SELECT 
      o.id,
      o.shopify_order_id,
      o.shopify_order_number,
      o.customer_name,
      o.product_title,
      o.flavour,
      o.notes,
      o.currency,
      o.total_amount,
      o.stage,
      o.priority,
      o.due_date,
      o.delivery_method,
      o.size,
      o.item_qty,
      o.storage,
      o.assignee_id,
      s.full_name as assignee_name,
      'flourlane'::text as store,
      o.created_at,
      o.updated_at,
      COUNT(*) OVER() as total_count
    FROM public.orders_flourlane o
    LEFT JOIN public.staff_shared s ON o.assignee_id = s.user_id
    WHERE (p_stage IS NULL OR o.stage::text = p_stage)
      AND (p_assignee_id IS NULL OR o.assignee_id = p_assignee_id)
      AND (p_priority IS NULL OR o.priority::text = p_priority)
      AND (p_storage IS NULL OR o.storage = p_storage)
      AND (p_search IS NULL OR 
           o.customer_name ILIKE '%' || p_search || '%' OR 
           o.product_title ILIKE '%' || p_search || '%' OR
           o.id ILIKE '%' || p_search || '%')
    ORDER BY 
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'DESC' THEN o.priority END DESC,
      CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'ASC' THEN o.priority END ASC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'DESC' THEN o.due_date END DESC,
      CASE WHEN p_sort_by = 'due_date' AND p_sort_order = 'ASC' THEN o.due_date END ASC,
      o.created_at ASC
    LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$function$
;

-- Function: get_queue_minimal
CREATE OR REPLACE FUNCTION public.get_queue_minimal(p_store text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS SETOF vw_queue_minimal
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select *
  from vw_queue_minimal
  where (p_store is null or store = p_store)
  order by due_date asc nulls last, created_at asc
  limit p_limit offset p_offset;
$function$
;

-- Function: get_queue_stats
CREATE OR REPLACE FUNCTION public.get_queue_stats(p_store text)
 RETURNS TABLE(total_orders bigint, completed_orders bigint, in_production bigint, unassigned_orders bigint, filling_count bigint, covering_count bigint, decorating_count bigint, packing_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
BEGIN
  v_table_name := 'orders_' || p_store;
  
  RETURN QUERY EXECUTE format('
    SELECT 
      COUNT(*)::bigint as total_orders,
      COUNT(*) FILTER (WHERE stage = ''Complete'')::bigint as completed_orders,
      COUNT(*) FILTER (WHERE stage != ''Complete'')::bigint as in_production,
      COUNT(*) FILTER (WHERE assignee_id IS NULL AND stage != ''Complete'')::bigint as unassigned_orders,
      COUNT(*) FILTER (WHERE stage = ''Filling'')::bigint as filling_count,
      COUNT(*) FILTER (WHERE stage = ''Covering'')::bigint as covering_count,
      COUNT(*) FILTER (WHERE stage = ''Decorating'')::bigint as decorating_count,
      COUNT(*) FILTER (WHERE stage = ''Packing'')::bigint as packing_count
    FROM public.%I
  ', v_table_name);
END;
$function$
;

-- Function: get_unassigned_counts
CREATE OR REPLACE FUNCTION public.get_unassigned_counts(p_store text)
 RETURNS TABLE(stage text, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
BEGIN
  v_table_name := 'orders_' || p_store;
  
  RETURN QUERY EXECUTE format('
    SELECT 
      stage::text,
      COUNT(*)::bigint
    FROM public.%I
    WHERE assignee_id IS NULL AND stage != ''Complete''
    GROUP BY stage
    ORDER BY stage
  ', v_table_name);
END;
$function$
;

-- Function: get_complete_minimal
CREATE OR REPLACE FUNCTION public.get_complete_minimal(p_store text DEFAULT NULL::text, p_limit integer DEFAULT 50)
 RETURNS SETOF vw_complete_minimal
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select *
  from vw_complete_minimal
  where (p_store is null or store = p_store)
  order by packing_complete_ts desc nulls last
  limit p_limit;
$function$
;

-- Function: get_order_for_scan
CREATE OR REPLACE FUNCTION public.get_order_for_scan(p_code text)
 RETURNS orders
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s text := lower(trim(p_code));
  v_store text;
  v_num bigint;
  v_id uuid;
  v_row public.orders;
begin
  -- UUID direct
  if s ~ '^[0-9a-f-]{36}$' then
    begin v_id := s::uuid; exception when others then v_id := null; end;
    if v_id is not null then
      select * into v_row from public.orders where id = v_id limit 1;
      return v_row;
    end if;
  end if;
  -- Exact barcode match
  select * into v_row from public.orders where barcode = p_code limit 1;
  if found then return v_row; end if;
  -- bannos-##### / flourlane-##### / plain number
  if s like 'bannos-%' then
    v_store := 'bannos';
    begin v_num := substring(s from 'bannos-(\d+)')::bigint; exception when others then v_num := null; end;
  elsif s like 'flourlane-%' then
    v_store := 'flourlane';
    begin v_num := substring(s from 'flourlane-(\d+)')::bigint; exception when others then v_num := null; end;
  elsif s ~ '^\d+$' then
    v_num := s::bigint;
  end if;
  -- store + number
  if v_store is not null and v_num is not null then
    select * into v_row from public.orders where store = v_store and shopify_order_number = v_num limit 1;
    if found then return v_row; end if;
  end if;
  -- number only across stores
  if v_num is not null then
    select * into v_row from public.orders where shopify_order_number = v_num limit 1;
    if found then return v_row; end if;
  end if;
  return v_row; -- null if no match
end
$function$
;

-- Function: admin_delete_order
CREATE OR REPLACE FUNCTION public.admin_delete_order(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  delete from stage_events  where order_id = p_order_id;
  delete from work_queue    where order_id = p_order_id;
  delete from order_photos  where order_id = p_order_id;
  delete from audit_log     where order_id = p_order_id;
  delete from dead_letter   where payload->>'order_id' = p_order_id::text;
  delete from orders        where id = p_order_id;
end; $function$
;

-- =====================================================
-- VERSION 2 FUNCTIONS (with p_store parameter)
-- These replace the Version 1 functions above
-- =====================================================

-- Version 2 of 2
-- Function: get_order_for_scan
-- This version searches across BOTH stores (bannos and flourlane)
CREATE OR REPLACE FUNCTION public.get_order_for_scan(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  s text := lower(trim(p_code));
  v_store text;
  v_num bigint;
  v_id text;
  v_row jsonb;
BEGIN
  -- Try UUID format (text-based ID like 'bannos-24481-A')
  IF s ~ '^(bannos|flourlane)-\d+-[A-Z0-9]+$' THEN
    -- Try bannos first
    EXECUTE 'SELECT row_to_json(o.*)::jsonb FROM orders_bannos o WHERE id = $1 LIMIT 1'
    INTO v_row
    USING p_code;
    IF v_row IS NOT NULL THEN RETURN v_row; END IF;
    
    -- Try flourlane
    EXECUTE 'SELECT row_to_json(o.*)::jsonb FROM orders_flourlane o WHERE id = $1 LIMIT 1'
    INTO v_row
    USING p_code;
    IF v_row IS NOT NULL THEN RETURN v_row; END IF;
  END IF;
  
  -- Try barcode match in both stores
  EXECUTE 'SELECT row_to_json(o.*)::jsonb FROM orders_bannos o WHERE barcode = $1 LIMIT 1'
  INTO v_row
  USING p_code;
  IF v_row IS NOT NULL THEN RETURN v_row; END IF;
  
  EXECUTE 'SELECT row_to_json(o.*)::jsonb FROM orders_flourlane o WHERE barcode = $1 LIMIT 1'
  INTO v_row
  USING p_code;
  IF v_row IS NOT NULL THEN RETURN v_row; END IF;
  
  -- Try shopify order number
  IF s ~ '^\d+$' THEN
    v_num := s::bigint;
    
    -- Try bannos
    EXECUTE 'SELECT row_to_json(o.*)::jsonb FROM orders_bannos o WHERE shopify_order_number = $1 LIMIT 1'
    INTO v_row
    USING v_num;
    IF v_row IS NOT NULL THEN RETURN v_row; END IF;
    
    -- Try flourlane
    EXECUTE 'SELECT row_to_json(o.*)::jsonb FROM orders_flourlane o WHERE shopify_order_number = $1 LIMIT 1'
    INTO v_row
    USING v_num;
    IF v_row IS NOT NULL THEN RETURN v_row; END IF;
  END IF;
  
  RETURN NULL; -- No match found
END;
$function$
;

-- Version 2 of 2
-- Function: admin_delete_order
CREATE OR REPLACE FUNCTION public.admin_delete_order(p_order_id text, p_store text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
BEGIN
  v_table_name := 'orders_' || p_store;
  
  -- Delete related records
  DELETE FROM stage_events WHERE order_id = p_order_id AND store = p_store;
  DELETE FROM work_queue WHERE order_id = p_order_id;
  DELETE FROM order_photos WHERE order_id = p_order_id;
  
  -- Delete the order itself
  EXECUTE format('DELETE FROM public.%I WHERE id = $1', v_table_name)
  USING p_order_id;
  
  RETURN true;
END;
$function$
;

