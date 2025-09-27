-- 006b_stage_rpcs_public.sql — force-create stage/timestamp RPCs in public schema

-- Advisory lock helper
create or replace function public._order_lock(p_order_id uuid)
returns void
language sql
as $$
  select pg_advisory_xact_lock(hashtext(p_order_id::text));
$$;

-- Print barcode + start filling
create or replace function public.handle_print_barcode(p_order_id uuid, p_barcode text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- Move to filling + assign
create or replace function public.move_to_filling_with_assignment(p_order_id uuid, p_staff_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- Assign staff (Covering/Decorating pending -> in_progress)
create or replace function public.assign_staff_to_order(p_order_id uuid, p_staff_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- Complete filling -> Covering_pending
create or replace function public.complete_filling(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- Complete covering -> Decorating_pending
create or replace function public.complete_covering(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- Complete decorating -> Packing_in_progress
create or replace function public.complete_decorating(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- Start packing (timestamp only)
create or replace function public.start_packing(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- Complete packing -> Complete
create or replace function public.complete_packing(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- QC return to decorating
create or replace function public.qc_return_to_decorating(p_order_id uuid, p_reason text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- Grants (write RPCs: authenticated only)
grant execute on function public.handle_print_barcode(uuid, text)            to authenticated;
grant execute on function public.move_to_filling_with_assignment(uuid, uuid) to authenticated;
grant execute on function public.assign_staff_to_order(uuid, uuid)           to authenticated;
grant execute on function public.complete_filling(uuid)                      to authenticated;
grant execute on function public.complete_covering(uuid)                     to authenticated;
grant execute on function public.complete_decorating(uuid)                   to authenticated;
grant execute on function public.start_packing(uuid)                         to authenticated;
grant execute on function public.complete_packing(uuid)                      to authenticated;
grant execute on function public.qc_return_to_decorating(uuid, text)         to authenticated;
