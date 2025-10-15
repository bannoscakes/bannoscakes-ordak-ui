-- Forward-fix migration: Inventory Transactions surface (idempotent, read/write ready)
-- Adds record_component_txn() RPC for write operations
-- SECURITY DEFINER; RLS-ready (currently internal-only while RLS is off)

begin;

-- 1) Transaction table (append-only)
create table if not exists public.component_txns (
  id          uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.components(id) on delete restrict,
  qty_delta   numeric not null,                     -- +receive / -consume
  reason      text,                                 -- human note (e.g., "production use", "adjustment")
  ref         text,                                 -- external ref (order id, PO id)
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now()
);

create index if not exists component_txns_component_id_idx on public.component_txns(component_id);

-- 2) On-hand balance view (derived from transactions)
create or replace view public.vw_component_balances as
select
  t.component_id,
  coalesce(sum(t.qty_delta), 0)::numeric as onhand
from public.component_txns t
group by t.component_id;

-- 3) Write RPC: record a movement (+receive, -consume)
create or replace function public.record_component_txn(
  p_component_id uuid,
  p_qty_delta    numeric,
  p_reason       text,
  p_ref          text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_txn_id uuid;
  v_onhand numeric;
begin
  -- Optional safety: prevent negative stock
  select coalesce(sum(qty_delta),0) into v_onhand
  from public.component_txns
  where component_id = p_component_id;

  if v_onhand + p_qty_delta < 0 then
    raise exception 'Insufficient stock for component % (onhand %, delta %)', p_component_id, v_onhand, p_qty_delta;
  end if;

  insert into public.component_txns (component_id, qty_delta, reason, ref)
  values (p_component_id, p_qty_delta, p_reason, p_ref)
  returning id into v_txn_id;

  return v_txn_id;
end $$;

-- Grant execute to authenticated users
grant execute on function public.record_component_txn(uuid, numeric, text, text) to authenticated;

-- Grant select on the balance view to authenticated users
grant select on public.vw_component_balances to authenticated;

commit;

