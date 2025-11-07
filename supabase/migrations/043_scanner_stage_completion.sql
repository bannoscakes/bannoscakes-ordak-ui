-- =====================================================
-- Migration: SCANNER STAGE COMPLETION
-- Date: 2025-11-07
-- Description: Extract production RPCs for scanner stage completion
-- =====================================================
-- 
-- Functions in this migration:
--   - complete_filling
--   - complete_covering
--   - complete_decorating
--   - complete_packing
--   - handle_print_barcode
--   - start_packing
--   - assign_staff_to_order
--   - move_to_filling_with_assignment
--   - qc_return_to_decorating
--
-- =====================================================

-- Version 1 of 2
-- Function: complete_filling
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

-- Version 2 of 2
-- Function: complete_filling
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

-- Version 1 of 2
-- Function: complete_covering
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

-- Version 2 of 2
-- Function: complete_covering
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

-- Version 1 of 2
-- Function: complete_decorating
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

-- Version 2 of 2
-- Function: complete_decorating
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

-- Version 1 of 2
-- Function: complete_packing
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

-- Version 2 of 2
-- Function: complete_packing
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

-- Function: handle_print_barcode
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

-- Function: start_packing
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

-- Function: assign_staff_to_order
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

-- Function: move_to_filling_with_assignment
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

-- Function: qc_return_to_decorating
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

-- =====================================================
-- VERSION 2 FUNCTIONS (with p_store parameter)
-- These replace the Version 1 functions above
-- =====================================================

-- Version 2 of 2
-- Function: handle_print_barcode
CREATE OR REPLACE FUNCTION public.handle_print_barcode(p_order_id text, p_store text, p_barcode text)
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
  
  EXECUTE format('UPDATE public.%I SET barcode = $1, filling_start_ts = COALESCE(filling_start_ts, now()), updated_at = now() WHERE id = $2', v_table_name)
  USING p_barcode, p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by)
  VALUES (p_order_id, p_store, 'Filling', 'barcode_printed', v_user_id);
  
  RETURN true;
END;
$function$
;

-- Version 2 of 2
-- Function: start_packing
CREATE OR REPLACE FUNCTION public.start_packing(p_order_id text, p_store text)
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
  
  EXECUTE format('UPDATE public.%I SET packing_start_ts = COALESCE(packing_start_ts, now()), updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by)
  VALUES (p_order_id, p_store, 'Packing', 'started', v_user_id);
  
  RETURN true;
END;
$function$
;

-- Version 2 of 2
-- Function: assign_staff_to_order
CREATE OR REPLACE FUNCTION public.assign_staff_to_order(p_order_id text, p_store text, p_staff_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_user_id uuid;
  v_current_stage stage_type;
  v_new_stage stage_type;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Get current stage
  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;
  
  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  -- Determine new stage based on current stage
  v_new_stage := CASE
    WHEN v_current_stage = 'Covering' THEN 'Covering'
    WHEN v_current_stage = 'Decorating' THEN 'Decorating'
    ELSE v_current_stage
  END;
  
  EXECUTE format('UPDATE public.%I SET assignee_id = $1, stage = $2, updated_at = now() WHERE id = $3', v_table_name)
  USING p_staff_id, v_new_stage, p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by)
  VALUES (p_order_id, p_store, v_new_stage::text, 'staff_assigned', v_user_id);
  
  RETURN true;
END;
$function$
;

-- Version 2 of 2
-- Function: move_to_filling_with_assignment
CREATE OR REPLACE FUNCTION public.move_to_filling_with_assignment(p_order_id text, p_store text, p_staff_id uuid)
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
  
  EXECUTE format('UPDATE public.%I SET assignee_id = $1, stage = ''Filling'', updated_at = now() WHERE id = $2', v_table_name)
  USING p_staff_id, p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by)
  VALUES (p_order_id, p_store, 'Filling', 'assigned_to_filling', v_user_id);
  
  RETURN true;
END;
$function$
;

-- Version 2 of 2
-- Function: qc_return_to_decorating
CREATE OR REPLACE FUNCTION public.qc_return_to_decorating(p_order_id text, p_store text, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_table_name text;
  v_user_id uuid;
  v_current_stage stage_type;
BEGIN
  v_table_name := 'orders_' || p_store;
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Get current stage
  EXECUTE format('SELECT stage FROM public.%I WHERE id = $1', v_table_name)
  INTO v_current_stage
  USING p_order_id;
  
  IF v_current_stage IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  IF v_current_stage != 'Packing' THEN
    RAISE EXCEPTION 'Order must be in Packing stage to return to Decorating';
  END IF;
  
  EXECUTE format('UPDATE public.%I SET stage = ''Decorating'', updated_at = now() WHERE id = $1', v_table_name)
  USING p_order_id;
  
  INSERT INTO public.stage_events (order_id, store, stage, event, performed_by, notes)
  VALUES (p_order_id, p_store, 'Decorating', 'qc_return', v_user_id, p_reason);
  
  RETURN true;
END;
$function$
;

