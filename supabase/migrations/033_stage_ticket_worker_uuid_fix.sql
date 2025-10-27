-- 033_stage_ticket_worker_uuid_fix.sql
-- Fix: generate a new order UUID per job (not once per batch)
-- Replaces process_kitchen_task_create() so v_order is set inside the job loop.

create or replace function public.process_kitchen_task_create(
  p_limit int default 20,
  p_lock_secs int default 60
)
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
  v_order uuid;         -- declare without default; set per job
  v_suffix text;
  v_line jsonb;
begin
  -- Validate inputs (defensive)
  if p_limit < 1 or p_limit > 100 then
    raise exception 'p_limit must be between 1 and 100';
  end if;
  if p_lock_secs < 1 or p_lock_secs > 3600 then
    raise exception 'p_lock_secs must be between 1 and 3600';
  end if;

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
      v_line   := v_p->'line_item';

      -- NEW: generate a fresh UUID per job, so all A/B/C tickets for this order share it,
      -- but different jobs in the batch get different order UUIDs.
      v_order := gen_random_uuid();

      if v_shop is null then
        raise exception 'missing payload: shop_domain';
      end if;

      -- Extract and validate task suffix (A/B/C…)
      v_suffix := nullif(v_p->>'task_suffix','');
      if v_suffix is null then
        raise exception 'missing payload: task_suffix';
      end if;
      -- Optional: enforce letters only (A–Z, AA…)
      if v_suffix !~ '^[A-Z]+$' then
        raise exception 'invalid task_suffix: %', v_suffix;
      end if;

      -- Insert Filling_pending ticket (idempotent by unique key)
      insert into public.stage_events(order_id, shop_domain, stage, status, task_suffix)
      values (v_order, v_shop, 'Filling', 'pending', v_suffix)
      on conflict (order_id, shop_domain, stage, task_suffix) do nothing;

      update public.work_queue set status='done', updated_at=now() where id=v_job.id;
      v_count := v_count + 1;

    exception when others then
      insert into public.dead_letter(created_at, payload, reason)
      values (
        now(),
        jsonb_build_object('worker','process_kitchen_task_create','job_id',v_job.id,'error',SQLERRM),
        'stage_ticket_failed'
      );
      update public.work_queue set status='error', updated_at=now() where id=v_job.id;
    end;
  end loop;

  return v_count;
end;
$$;

comment on function public.process_kitchen_task_create is
  'Consumes kitchen_task_create jobs; creates Filling_pending tickets; generates order UUID per job.';

