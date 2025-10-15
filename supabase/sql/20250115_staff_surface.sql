-- Forward-fix migration: Staff surface RPCs
-- Adds get_staff() and get_staff_stats() for UI ↔ Backend wiring
-- SECURITY DEFINER; RLS-ready (currently internal-only while RLS is off)

begin;

-- 1) Staff list
create or replace function public.get_staff()
returns table(
  user_id uuid,
  full_name text,
  role text
)
language sql
security definer
stable
as $$
  select s.user_id, s.full_name, s.role
  from public.staff_shared s
  order by s.full_name;
$$;

-- 2) Staff stats (simple example: count of assigned orders)
create or replace function public.get_staff_stats()
returns table(
  user_id uuid,
  assigned_orders bigint
)
language sql
security definer
stable
as $$
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
$$;

-- Grant execute to authenticated users
grant execute on function public.get_staff() to authenticated;
grant execute on function public.get_staff_stats() to authenticated;

commit;

