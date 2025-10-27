-- 027_stage_ticket_worker.sql
-- Consume work_queue(topic='kitchen_task_create') and create Filling_pending tickets per A/B/C suffix.
-- No mock/seed; only acts when real jobs exist. SECURITY DEFINER + idempotent.

create index if not exists work_queue_status_topic_created_idx2
  on public.work_queue (status, topic, created_at desc);

create or replace function public.process_kitchen_task_create(p_limit int default 20, p_lock_secs int default 60)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int := 0;
  v_job record;
  v_p jsonb;
  v_shop text;
  v_order text;
  v_suffix text;
  v_line jsonb;
begin
  for v_job in
    select *
      from public.work_queue
     where status = 'pending'
       and topic  = 'kitchen_task_create'
       and (locked_at is null or locked_at < v_now - make_interval(secs => p_lock_secs))
     order by created_at asc
     limit p_limit
     for update skip locked
  loop
    begin
      update public.work_queue
         set locked_at = v_now, locked_by = 'stage-ticket-worker', status='processing'
       where id = v_job.id;

      v_p      := v_job.payload;
      v_shop   := v_p->>'shop_domain';
      v_order  := v_p->>'order_id';
      v_suffix := v_p->>'task_suffix';
      v_line   := v_p->'line_item';

      if v_shop is null or v_order is null or v_suffix is null then
        raise exception 'missing payload fields';
      end if;

      -- Insert a Filling_pending ticket; rely on existing unique key if present (on conflict no-op)
      insert into public.stage_events(order_id, shop_domain, stage, status, task_suffix)
      values (v_order, v_shop, 'Filling', 'pending', v_suffix)
      on conflict do nothing;

      update public.work_queue set status='done', updated_at=now() where id=v_job.id;
      v_count := v_count + 1;

    exception when others then
      insert into public.dead_letter(created_at, payload, reason)
      values (now(),
              jsonb_build_object('worker','process_kitchen_task_create','job_id',v_job.id,'error',SQLERRM),
              'stage_ticket_failed');

      update public.work_queue set status='error', updated_at=now() where id=v_job.id;
    end;
  end loop;

  return v_count;
end;
$$;

comment on function public.process_kitchen_task_create is
  'Consumes kitchen_task_create jobs; creates Filling_pending tickets per task_suffix; no-op unless real jobs exist.';

