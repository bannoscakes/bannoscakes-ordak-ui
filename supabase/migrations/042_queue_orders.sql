-- Migration: Queue and order retrieval RPCs
-- Generated: 2025-11-07T05:15:46.196Z
-- Functions: 10 (includes get_staff_stats moved from 041)
--
-- IMPORTANT NOTES:
-- 1. Some functions have TWO versions (e.g., admin_delete_order, get_order_for_scan):
--    - Version 1: Uses public.orders table (UUID-based, old system)
--    - Version 2: Uses orders_bannos/orders_flourlane (text-based IDs, current system)
-- 2. BOTH versions are kept for backward compatibility and transition period
-- 3. The new system (orders_bannos/orders_flourlane) is the active one in production
-- 4. DO NOT remove old versions without explicit approval

-- ============================================================================
-- VERSION 1: Old system (public.orders with UUID)
-- ============================================================================

-- Function 1/9: admin_delete_order (Version 1 - UUID-based)
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
end;
$function$
;

-- Function 2/9: assign_staff
CREATE OR REPLACE FUNCTION public.assign_staff(p_order_id text, p_store text, p_staff_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
BEGIN
  v_table_name := 'orders_' || p_store;
  
  EXECUTE format('UPDATE public.%I SET assignee_id = $1, updated_at = now() WHERE id = $2', v_table_name)
  USING p_staff_id, p_order_id;
  
  RETURN true;
END;
$function$
;

-- Function 3/9: get_complete_minimal
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

-- Function 4/9: get_order_for_scan
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

-- Function 5/9: get_queue
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

-- Function 6/9: get_queue_minimal
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

-- Function 7/9: get_queue_stats
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

-- Function 8/9: get_unassigned_counts
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

-- Function 9/9: update_order_core
CREATE OR REPLACE FUNCTION public.update_order_core(p_order_id text, p_store text, p_customer_name text DEFAULT NULL::text, p_product_title text DEFAULT NULL::text, p_flavour text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_due_date date DEFAULT NULL::date, p_delivery_method text DEFAULT NULL::text, p_size text DEFAULT NULL::text, p_item_qty integer DEFAULT NULL::integer, p_storage text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_old_values jsonb;
  v_new_values jsonb;
  v_user_id uuid;
  v_update_parts text[] := ARRAY[]::text[];
  v_new_priority smallint;
  v_current_due_date date;
BEGIN
  -- Check if user has permission to update orders
  IF NOT public.check_user_role('Supervisor') THEN
    RAISE EXCEPTION 'Insufficient permissions to update orders';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Get user ID for audit log
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  -- Set table name based on store
  v_table_name := 'orders_' || p_store;

  -- Get current values for audit log and due_date
  EXECUTE format('SELECT to_jsonb(o.*), o.due_date FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_old_values, v_current_due_date;

  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Calculate new priority if due_date is being updated
  IF p_due_date IS NOT NULL THEN
    -- Priority calculation based on due_date (same logic as order_transform.ts)
    -- HIGH: today/overdue/tomorrow (deltaDays <= 1)
    -- MEDIUM: within 3 days (deltaDays <= 3)  
    -- LOW: more than 3 days (deltaDays > 3)
    DECLARE
      v_delta_days integer;
    BEGIN
      v_delta_days := p_due_date - CURRENT_DATE;
      
      IF v_delta_days <= 1 THEN
        v_new_priority := 1; -- HIGH
      ELSIF v_delta_days <= 3 THEN
        v_new_priority := 0; -- MEDIUM
      ELSE
        v_new_priority := -1; -- LOW
      END IF;
    END;
  END IF;

  -- Build dynamic UPDATE statement
  IF p_customer_name IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'customer_name = ' || quote_literal(p_customer_name));
  END IF;

  IF p_product_title IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'product_title = ' || quote_literal(p_product_title));
  END IF;

  IF p_flavour IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'flavour = ' || quote_literal(p_flavour));
  END IF;

  IF p_notes IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'notes = ' || quote_literal(p_notes));
  END IF;

  IF p_due_date IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'due_date = ' || quote_literal(p_due_date));
    -- Update priority when due_date changes
    v_update_parts := array_append(v_update_parts, 'priority = ' || v_new_priority);
  END IF;

  IF p_delivery_method IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'delivery_method = ' || quote_literal(p_delivery_method));
  END IF;

  IF p_size IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'size = ' || quote_literal(p_size));
  END IF;

  IF p_item_qty IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'item_qty = ' || p_item_qty);
  END IF;

  IF p_storage IS NOT NULL THEN
    v_update_parts := array_append(v_update_parts, 'storage = ' || quote_literal(p_storage));
  END IF;

  -- If nothing to update, return early
  IF array_length(v_update_parts, 1) IS NULL THEN
    RETURN false;
  END IF;

  -- Add updated_at
  v_update_parts := array_append(v_update_parts, 'updated_at = now()');

  -- Execute update
  EXECUTE format('UPDATE public.%I SET %s WHERE id = $1', 
    v_table_name, array_to_string(v_update_parts, ', '))
  USING p_order_id;

  -- Get new values for audit log
  EXECUTE format('SELECT to_jsonb(o.*) FROM public.%I o WHERE o.id = $1', v_table_name)
  USING p_order_id INTO v_new_values;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, new_values, actor_id, store, order_id
  ) VALUES (
    v_table_name, p_order_id, 'update_order_core',
    v_old_values, v_new_values, v_user_id, p_store, p_order_id
  );

  RETURN true;
END;
$function$
;

-- Function 10/10: get_staff_stats (moved from 041 due to orders table dependency)
CREATE OR REPLACE FUNCTION public.get_staff_stats()
 RETURNS TABLE(user_id uuid, assigned_orders bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  with all_orders as (
    select assignee_id from public.orders_bannos
    union all
    select assignee_id from public.orders_flourlane
  )
  select s.user_id,
         count(a.assignee_id)::bigint as assigned_orders
  from public.staff_shared s
  left join all_orders a on a.assignee_id = s.user_id
  group by s.user_id
  order by assigned_orders desc nulls last;
$function$
;
