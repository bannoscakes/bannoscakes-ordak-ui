git checkout dev
git pull --ff-only origin dev

cat > supabase/sql/006_stage_rpcs.sql <<'SQL'
-- 006_stage_rpcs.sql — stage/timestamp RPCs (locked logic)
-- Notes:
-- - Idempotent where reasonable (repeated calls won't break state)
-- - SECURITY DEFINER with search_path pinned
-- - Only GRANT to authenticated (NOT anon)

-- Helper: advisory lock per order
create or replace function _order_lock(p_order_id uuid)
returns void
language sql
as $$
  -- hashtext() gives a 32-bit int; promoted to bigint for advisory lock
  select pg_advisory_xact_lock(hashtext(p_order_id::text));
$$;

-- handle_print_barcode: set barcode if empty, set filling_start_ts if empty,
-- and move Filling_pending -> Filling_in_progress (once).
create or replace function handle_print_barcode(p_order_id uuid, p_barcode text)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    orders;
begin
  perform _order_lock(p_order_id);

  select stage into v_before from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  -- If barcode exists and differs, reject
  if exists (
    select 1 from orders where id = p_order_id and barcode is not null and barcode <> p_barcode
  ) then
    raise exception 'BARCODE_MISMATCH';
  end if;

  update orders
     set barcode = coalesce(barcode, p_barcode),
         filling_start_ts = coalesce(filling_start_ts, now()),
         stage = case
                    when stage = 'Filling_pending' then 'Filling_in_progress'
                    else stage
                 end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;

  if v_after is distinct from v_before then
    insert into stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'print_barcode');
  end if;

  insert into audit_log(action, performed_by, source, meta)
  values ('handle_print_barcode', null, 'rpc', jsonb_build_object('order_id', p_order_id, 'barcode', p_barcode));

  return v_row;
end
$$;

-- move_to_filling_with_assignment: assign + move to Filling_in_progress (no timestamps)
create or replace function move_to_filling_with_assignment(p_order_id uuid, p_staff_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    orders;
begin
  perform _order_lock(p_order_id);

  select stage into v_before from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  update orders
     set assignee_id = p_staff_id,
         stage = case
                    when stage in ('Filling_pending','Filling_in_progress') then 'Filling_in_progress'
                    else stage
                 end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;
  if v_after is distinct from v_before then
    insert into stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'assign_to_filling');
  end if;

  insert into audit_log(action, performed_by, source, meta)
  values ('move_to_filling_with_assignment', null, 'rpc', jsonb_build_object('order_id', p_order_id, 'staff_id', p_staff_id));

  return v_row;
end
$$;

-- assign_staff_to_order: set assignee; if Covering/Decorating pending -> in_progress
create or replace function assign_staff_to_order(p_order_id uuid, p_staff_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    orders;
begin
  perform _order_lock(p_order_id);

  select stage into v_before from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  update orders
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
    insert into stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'assign_staff');
  end if;

  insert into audit_log(action, performed_by, source, meta)
  values ('assign_staff_to_order', null, 'rpc', jsonb_build_object('order_id', p_order_id, 'staff_id', p_staff_id));

  return v_row;
end
$$;

-- complete_filling: set end ts (once) and advance to Covering_pending
create or replace function complete_filling(p_order_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    orders;
begin
  perform _order_lock(p_order_id);

  select stage into v_before from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  -- idempotent: if already set, no-op
  update orders
     set filling_complete_ts = coalesce(filling_complete_ts, now()),
         stage = case when v_before = 'Filling_in_progress' then 'Covering_pending' else stage end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;
  if v_after is distinct from v_before then
    insert into stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'complete_filling');
  end if;

  insert into audit_log(action, performed_by, source, meta)
  values ('complete_filling', null, 'rpc', jsonb_build_object('order_id', p_order_id));

  return v_row;
end
$$;

-- complete_covering: set end ts and advance to Decorating_pending
create or replace function complete_covering(p_order_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    orders;
begin
  perform _order_lock(p_order_id);

  select stage into v_before from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  update orders
     set covering_complete_ts = coalesce(covering_complete_ts, now()),
         stage = case when v_before = 'Covering_in_progress' then 'Decorating_pending' else stage end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;
  if v_after is distinct from v_before then
    insert into stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'complete_covering');
  end if;

  insert into audit_log(action, performed_by, source, meta)
  values ('complete_covering', null, 'rpc', jsonb_build_object('order_id', p_order_id));

  return v_row;
end
$$;

-- complete_decorating: set end ts and advance to Packing_in_progress
create or replace function complete_decorating(p_order_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.stage;
  v_after  public.stage;
  v_row    orders;
begin
  perform _order_lock(p_order_id);

  select stage into v_before from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  update orders
     set decorating_complete_ts = coalesce(decorating_complete_ts, now()),
         stage = case when v_before = 'Decorating_in_progress' then 'Packing_in_progress' else stage end,
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  v_after := v_row.stage;
  if v_after is distinct from v_before then
    insert into stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, v_after, null, 'complete_decorating');
  end if;

  insert into audit_log(action, performed_by, source, meta)
  values ('complete_decorating', null, 'rpc', jsonb_build_object('order_id', p_order_id));

  return v_row;
end
$$;

-- start_packing: set start ts (no stage change; already Packing_in_progress)
create or replace function start_packing(p_order_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row orders;
begin
  perform _order_lock(p_order_id);

  update orders
     set packing_start_ts = coalesce(packing_start_ts, now()),
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  insert into audit_log(action, performed_by, source, meta)
  values ('start_packing', null, 'rpc', jsonb_build_object('order_id', p_order_id));

  return v_row;
end
$$;

-- complete_packing: set end ts and mark Complete
create or replace function complete_packing(p_order_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.stage;
  v_row    orders;
begin
  perform _order_lock(p_order_id);

  select stage into v_before from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  update orders
     set packing_complete_ts = coalesce(packing_complete_ts, now()),
         stage = 'Complete',
         updated_at = now()
   where id = p_order_id
  returning * into v_row;

  if v_before is distinct from 'Complete' then
    insert into stage_events(order_id, from_stage, to_stage, performed_by, reason)
    values (p_order_id, v_before, 'Complete', null, 'complete_packing');
  end if;

  insert into audit_log(action, performed_by, source, meta)
  values ('complete_packing', null, 'rpc', jsonb_build_object('order_id', p_order_id));

  return v_row;
end
$$;

-- qc_return_to_decorating: move back with reason (from Packing_in_progress)
create or replace function qc_return_to_decorating(p_order_id uuid, p_reason text)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.stage;
  v_row    orders;
begin
  perform _order_lock(p_order_id);

  select stage into v_before from orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  update orders
     set stage = 'Decorating_pending',
         updated_at = now()
   where id = p_order_id
     and v_before = 'Packing_in_progress'
  returning * into v_row;

  if not found then
    -- idempotent: if not in packing, just return current row
    select * into v_row from orders where id = p_order_id;
    return v_row;
  end if;

  insert into stage_events(order_id, from_stage, to_stage, performed_by, reason)
  values (p_order_id, v_before, 'Decorating_pending', null, coalesce(p_reason,'qc_return'));

  insert into audit_log(action, performed_by, source, meta)
  values ('qc_return_to_decorating', null, 'rpc', jsonb_build_object('order_id', p_order_id, 'reason', p_reason));

  return v_row;
end
$$;

-- Permissions: allow only signed-in (NOT anon) for write RPCs
grant execute on function handle_print_barcode(uuid, text)             to authenticated;
grant execute on function move_to_filling_with_assignment(uuid, uuid)  to authenticated;
grant execute on function assign_staff_to_order(uuid, uuid)            to authenticated;
grant execute on function complete_filling(uuid)                       to authenticated;
grant execute on function complete_covering(uuid)                      to authenticated;
grant execute on function complete_decorating(uuid)                    to authenticated;
grant execute on function start_packing(uuid)                          to authenticated;
grant execute on function complete_packing(uuid)                       to authenticated;
grant execute on function qc_return_to_decorating(uuid, text)          to authenticated;
SQL

git add supabase/sql/006_stage_rpcs.sql
git commit -m "sql(006): stage/timestamp RPCs (idempotent, SECURITY DEFINER, authenticated-only)"
git push -u origin dev

  
