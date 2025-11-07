-- Migration: Stage completion and scanner RPCs
-- Generated: 2025-11-07T05:15:46.196Z
-- Functions: 13
--
-- IMPORTANT NOTES:
-- 1. Many functions have TWO versions:
--    - Version 1: Uses public.orders table (UUID-based, returns orders type)
--    - Version 2: Uses orders_bannos/orders_flourlane (text-based IDs, returns boolean)
-- 2. BOTH versions are kept for backward compatibility
-- 3. Version 2 (orders_bannos/orders_flourlane) is the active system in production

-- ============================================================================
-- VERSION 1: Old system (public.orders with UUID)
-- ============================================================================

-- Function 1/13: assign_staff_to_order (Version 1 - UUID-based)
CREATE OR REPLACE FUNCTION public.assign_staff_to_order(p_order_id uuid, p_staff_id uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    public.orders;
begin
  perform public._order_lock(p_order_id);

  select stage into v_before from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  update public.orders
     set assignee_id = p_staff_id,
         stage = case
                   when stage = 'Covering_pending' then 'Covering_in_progress'
                   when stage = 'Decorating_pending' then 'Decorating_in_progress'
                   else stage
                 end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;
  if v_after is distinct from v_before then
    insert into public.stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'assign_staff');
  end if;

  insert into public.audit_log(action, performed_by, source, meta)
  values ('assign_staff_to_order', null, 'rpc', jsonb_build_object('order_id', p_order_id, 'staff_id', p_staff_id));

  return v_row;
end
$function$
;

-- Function 2/13: complete_covering
CREATE OR REPLACE FUNCTION public.complete_covering(p_order_id uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    public.orders;
begin
  perform public._order_lock(p_order_id);

  select stage into v_before from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  update public.orders
     set covering_complete_ts = coalesce(covering_complete_ts, now()),
         stage = case when v_before = 'Covering_in_progress' then 'Decorating_pending' else stage end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;
  if v_after is distinct from v_before then
    insert into public.stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'complete_covering');
  end if;

  insert into public.audit_log(action, performed_by, source, meta)
  values ('complete_covering', null, 'rpc', jsonb_build_object('order_id', p_order_id));

  return v_row;
end
$function$
;

-- Function 3/13: complete_covering
CREATE OR REPLACE FUNCTION public.complete_covering(p_order_id text, p_store text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_user_id uuid;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  EXECUTE format('UPDATE public.%I SET stage = ''Decorating'', covering_complete_ts = now(), updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by, notes)
  VALUES (p_order_id, p_store, 'Covering', 'completed', v_user_id, p_notes);
  
  RETURN true;
END;
$function$
;

-- Function 4/13: complete_decorating
CREATE OR REPLACE FUNCTION public.complete_decorating(p_order_id uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    public.orders;
begin
  perform public._order_lock(p_order_id);

  select stage into v_before from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  update public.orders
     set decorating_complete_ts = coalesce(decorating_complete_ts, now()),
         stage = case when v_before = 'Decorating_in_progress' then 'Packing_in_progress' else stage end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;
  if v_after is distinct from v_before then
    insert into public.stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'complete_decorating');
  end if;

  insert into public.audit_log(action, performed_by, source, meta)
  values ('complete_decorating', null, 'rpc', jsonb_build_object('order_id', p_order_id));

  return v_row;
end
$function$
;

-- Function 5/13: complete_decorating
CREATE OR REPLACE FUNCTION public.complete_decorating(p_order_id text, p_store text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_user_id uuid;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  EXECUTE format('UPDATE public.%I SET stage = ''Packing'', decorating_complete_ts = now(), packing_start_ts = now(), updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by, notes)
  VALUES (p_order_id, p_store, 'Decorating', 'completed', v_user_id, p_notes);
  
  RETURN true;
END;
$function$
;

-- Function 6/13: complete_filling
CREATE OR REPLACE FUNCTION public.complete_filling(p_order_id uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    public.orders;
begin
  perform public._order_lock(p_order_id);

  select stage into v_before from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  update public.orders
     set filling_complete_ts = coalesce(filling_complete_ts, now()),
         stage = case when v_before = 'Filling_in_progress' then 'Covering_pending' else stage end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;
  if v_after is distinct from v_before then
    insert into public.stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'complete_filling');
  end if;

  insert into public.audit_log(action, performed_by, source, meta)
  values ('complete_filling', null, 'rpc', jsonb_build_object('order_id', p_order_id));

  return v_row;
end
$function$
;

-- Function 7/13: complete_filling
CREATE OR REPLACE FUNCTION public.complete_filling(p_order_id text, p_store text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_current_stage stage_type;
  v_user_id uuid;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;
  
  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  IF v_current_stage != 'Filling' THEN
    RAISE EXCEPTION 'Order must be in Filling stage to complete filling';
  END IF;
  
  EXECUTE format('UPDATE public.%I SET stage = ''Covering'', filling_complete_ts = now(), updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by, notes)
  VALUES (p_order_id, p_store, 'Filling', 'completed', v_user_id, p_notes);
  
  RETURN true;
END;
$function$
;

-- Function 8/13: complete_packing
CREATE OR REPLACE FUNCTION public.complete_packing(p_order_id uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_before public.stage;
  v_row    public.orders;
begin
  perform public._order_lock(p_order_id);

  select stage into v_before from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  update public.orders
     set packing_complete_ts = coalesce(packing_complete_ts, now()),
         stage = 'Complete',
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  if v_before is distinct from 'Complete' then
    insert into public.stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, 'Complete', null, 'complete_packing');
  end if;

  insert into public.audit_log(action, performed_by, source, meta)
  values ('complete_packing', null, 'rpc', jsonb_build_object('order_id', p_order_id));

  return v_row;
end
$function$
;

-- Function 9/13: complete_packing
CREATE OR REPLACE FUNCTION public.complete_packing(p_order_id text, p_store text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_user_id uuid;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  EXECUTE format('UPDATE public.%I SET stage = ''Complete'', packing_complete_ts = now(), updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by, notes)
  VALUES (p_order_id, p_store, 'Packing', 'completed', v_user_id, p_notes);
  
  RETURN true;
END;
$function$
;

-- Function 10/13: handle_print_barcode
CREATE OR REPLACE FUNCTION public.handle_print_barcode(p_order_id uuid, p_barcode text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    public.orders;
begin
  perform public._order_lock(p_order_id);

  select stage into v_before from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if exists (select 1 from public.orders where id = p_order_id and barcode is not null and barcode <> p_barcode)
  then raise exception 'BARCODE_MISMATCH'; end if;

  update public.orders
     set barcode = coalesce(barcode, p_barcode),
         filling_start_ts = coalesce(filling_start_ts, now()),
         stage = case when stage = 'Filling_pending' then 'Filling_in_progress' else stage end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;
  if v_after is distinct from v_before then
    insert into public.stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'print_barcode');
  end if;

  insert into public.audit_log(action, performed_by, source, meta)
  values ('handle_print_barcode', null, 'rpc', jsonb_build_object('order_id', p_order_id, 'barcode', p_barcode));

  return v_row;
end
$function$
;

-- Function 11/13: move_to_filling_with_assignment
CREATE OR REPLACE FUNCTION public.move_to_filling_with_assignment(p_order_id uuid, p_staff_id uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    public.orders;
begin
  perform public._order_lock(p_order_id);

  select stage into v_before from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  update public.orders
     set assignee_id = p_staff_id,
         stage = case when stage in ('Filling_pending','Filling_in_progress') then 'Filling_in_progress' else stage end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;
  if v_after is distinct from v_before then
    insert into public.stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'assign_to_filling');
  end if;

  insert into public.audit_log(action, performed_by, source, meta)
  values ('move_to_filling_with_assignment', null, 'rpc', jsonb_build_object('order_id', p_order_id, 'staff_id', p_staff_id));

  return v_row;
end
$function$
;

-- Function 12/13: qc_return_to_decorating
CREATE OR REPLACE FUNCTION public.qc_return_to_decorating(p_order_id uuid, p_reason text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_before public.stage;
  v_row    public.orders;
begin
  perform public._order_lock(p_order_id);

  select stage into v_before from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  update public.orders
     set stage = 'Decorating_pending',
         updated_at = now()
   where id = p_order_id
     and v_before = 'Packing_in_progress'
  returning * into v_row;

  if not found then
    select * into v_row from public.orders where id = p_order_id;
    return v_row;
  end if;

  insert into public.stage_events(order_id, from_stage, to_stage, performed_by, reason)
  values (p_order_id, v_before, 'Decorating_pending', null, coalesce(p_reason,'qc_return'));

  insert into public.audit_log(action, performed_by, source, meta)
  values ('qc_return_to_decorating', null, 'rpc', jsonb_build_object('order_id', p_order_id, 'reason', p_reason));

  return v_row;
end
$function$
;

-- Function 13/13: start_packing
CREATE OR REPLACE FUNCTION public.start_packing(p_order_id uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row public.orders;
begin
  perform public._order_lock(p_order_id);

  update public.orders
     set packing_start_ts = coalesce(packing_start_ts, now()),
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  insert into public.audit_log(action, performed_by, source, meta)
  values ('start_packing', null, 'rpc', jsonb_build_object('order_id', p_order_id));

  return v_row;
end
$function$
;

