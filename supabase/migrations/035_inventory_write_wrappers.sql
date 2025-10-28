-- 035_inventory_write_wrappers.sql
-- Write-side wrappers for stock actions. SECURITY DEFINER. Idempotent creation.

create or replace function public._log_component_txn(
  p_component uuid,
  p_qty numeric,
  p_type text,
  p_order uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_has_logger boolean;
begin
  -- Try to call existing logger if present (adjust signature if needed)
  v_has_logger := to_regprocedure('public.record_component_txn(uuid,numeric,text,uuid,jsonb)') is not null;

  if v_has_logger then
    -- TODO: set correct logger signature here if different
    execute 'select (public.record_component_txn($1,$2,$3,$4,$5)).id'
      into v_id
      using p_component, p_qty, p_type, p_order, p_payload;
    return v_id;
  end if;

  -- Fallback: direct insert into component_txns
  v_id := gen_random_uuid();
  insert into public.component_txns (id, created_at, component_id, qty, transaction_type, order_id, payload)
  values (v_id, now(), p_component, p_qty, p_type, p_order, p_payload);
  return v_id;
end;
$$;

comment on function public._log_component_txn(uuid,numeric,text,uuid,jsonb)
  is 'Internal wrapper: calls existing component txn logger if available; otherwise inserts into component_txns.';

-- Generic adjust (positive or negative), with validation
create or replace function public.tx_component_adjust(
  p_component uuid,
  p_qty numeric,
  p_reason text default 'manual',
  p_order uuid default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_component is null then
    raise exception 'component is required';
  end if;
  if p_qty = 0 then
    raise exception 'qty must be non-zero';
  end if;
  return public._log_component_txn(p_component, p_qty, case when p_qty>0 then 'adjust+' else 'adjust-' end, p_order, p_payload || jsonb_build_object('reason',coalesce(p_reason,'manual')));
end;
$$;

comment on function public.tx_component_adjust(uuid,numeric,text,uuid,jsonb)
  is 'Adjust component qty (+/-). Wraps _log_component_txn.';

-- Receive (inbound)
create or replace function public.tx_component_receive(
  p_component uuid,
  p_qty numeric,
  p_po_id uuid default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty <= 0 then
    raise exception 'receive qty must be > 0';
  end if;
  return public._log_component_txn(p_component, p_qty, 'receive', p_po_id, p_payload);
end;
$$;

-- Consume (outbound)
create or replace function public.tx_component_consume(
  p_component uuid,
  p_qty numeric,
  p_order uuid default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty <= 0 then
    raise exception 'consume qty must be > 0';
  end if;
  return public._log_component_txn(p_component, -abs(p_qty), 'consume', p_order, p_payload);
end;
$$;

-- Reserve (hold stock for an order)
create or replace function public.tx_component_reserve(
  p_component uuid,
  p_qty numeric,
  p_order uuid,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty <= 0 then
    raise exception 'reserve qty must be > 0';
  end if;
  if p_order is null then
    raise exception 'order id required for reserve';
  end if;
  return public._log_component_txn(p_component, p_qty, 'reserve', p_order, p_payload);
end;
$$;

-- Release (undo a reserve)
create or replace function public.tx_component_release(
  p_component uuid,
  p_qty numeric,
  p_order uuid,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty <= 0 then
    raise exception 'release qty must be > 0';
  end if;
  if p_order is null then
    raise exception 'order id required for release';
  end if;
  return public._log_component_txn(p_component, -abs(p_qty), 'release', p_order, p_payload);
end;
$$;

-- Grants
grant execute on function public.tx_component_adjust(uuid,numeric,text,uuid,jsonb)  to authenticated;
grant execute on function public.tx_component_receive(uuid,numeric,uuid,jsonb)    to authenticated;
grant execute on function public.tx_component_consume(uuid,numeric,uuid,jsonb)    to authenticated;
grant execute on function public.tx_component_reserve(uuid,numeric,uuid,jsonb)    to authenticated;
grant execute on function public.tx_component_release(uuid,numeric,uuid,jsonb)    to authenticated;
