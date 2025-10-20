-- Create admin_delete_order RPC function for safe order deletion
create or replace function admin_delete_order(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  delete from stage_events  where order_id = p_order_id;
  delete from work_queue    where order_id = p_order_id;
  delete from order_photos  where order_id = p_order_id;
  delete from audit_log     where order_id = p_order_id;
  delete from dead_letter   where payload->>'order_id' = p_order_id::text;
  delete from orders        where id = p_order_id;
end; $$;

revoke all on function admin_delete_order(uuid) from public;
grant execute on function admin_delete_order(uuid) to authenticated;
