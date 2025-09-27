-- 005_rpc_read.sql — read-only RPCs that wrap views

-- Ensure stable search_path for SECURITY DEFINER functions
create or replace function get_queue_minimal(
  p_store text default null,
  p_limit int default 100,
  p_offset int default 0
) returns setof vw_queue_minimal
language sql
stable
security definer
set search_path = public
as $$
  select *
  from vw_queue_minimal
  where (p_store is null or store = p_store)
  order by due_date asc nulls last, created_at asc
  limit p_limit offset p_offset;
$$;

create or replace function get_unassigned_counts(
  p_store text default null
) returns setof vw_unassigned_counts
language sql
stable
security definer
set search_path = public
as $$
  select *
  from vw_unassigned_counts
  where (p_store is null or store = p_store);
$$;

create or replace function get_complete_minimal(
  p_store text default null,
  p_limit int default 50
) returns setof vw_complete_minimal
language sql
stable
security definer
set search_path = public
as $$
  select *
  from vw_complete_minimal
  where (p_store is null or store = p_store)
  order by packing_complete_ts desc nulls last
  limit p_limit;
$$;

-- Allow frontend (anon) and signed-in (authenticated) to call these
grant execute on function get_queue_minimal(text, int, int) to anon, authenticated;
grant execute on function get_unassigned_counts(text)    to anon, authenticated;
grant execute on function get_complete_minimal(text, int) to anon, authenticated;
