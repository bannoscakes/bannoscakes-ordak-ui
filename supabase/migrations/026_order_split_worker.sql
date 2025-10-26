-- 026_order_split_worker.sql
-- Worker that consumes work_queue(topic='webhook_order_split') and emits child jobs
-- kitchen_task_create (one per cake unit) using A/B/C suffixing and accessories-on-A rule.

-- 1) Safety/indices (idempotent)
create index if not exists work_queue_status_topic_created_idx
  on public.work_queue (status, topic, created_at desc);

-- 2) Helper: classify line item as cake (very simple; adjust later if needed)
create or replace function public.is_cake_item(p_item jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce( (p_item->>'product_type') ilike '%cake%'
                or (p_item->>'title') ilike '%cake%', false )
$$;

-- Helper: convert 0-based index to A..Z, then AA..AZ, BA..BZ, etc.
create or replace function public.alpha_suffix(p_idx int)
returns text
language plpgsql
immutable
as $$
declare
  n int := p_idx;
  s text := '';
  r int;
begin
  if n < 0 then
    return 'A';
  end if;
  loop
    r := n % 26;
    s := chr(65 + r) || s;   -- 65 = 'A'
    n := (n / 26) - 1;       -- 0-based to Excel-like
    exit when n < 0;
  end loop;
  return s;
end;
$$;

-- 3) The worker: grabs N pending jobs, locks them, emits child jobs, completes or errors.
create or replace function public.process_webhook_order_split(p_limit int default 10, p_lock_secs int default 60)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int := 0;
  v_job record;
  v_payload jsonb;
  v_items jsonb;
  v_cakes jsonb := '[]'::jsonb;
  v_accessories jsonb := '[]'::jsonb;
  v_shop text;
  v_topic text;
  v_hook text;
  v_body jsonb;
  i int := 0;
  v_suffix text;
begin
  -- lock a batch of jobs
  for v_job in
    select *
    from public.work_queue
    where status = 'pending'
      and topic = 'webhook_order_split'
      and (locked_at is null or locked_at < v_now - make_interval(secs => p_lock_secs))
    order by created_at asc
    limit p_limit
    for update skip locked
  loop
    begin
      -- lock
      update public.work_queue
         set locked_at = v_now,
             locked_by = 'order-split-worker',
             status = 'processing'
       where id = v_job.id;

      v_payload := v_job.payload;
      v_shop    := (v_payload->>'shop_domain');
      v_topic   := (v_payload->>'topic');
      v_hook    := (v_payload->>'hook_id');
      v_body    := (v_payload->'body');

      -- Validate required fields
      if v_shop is null or v_topic is null or v_hook is null or v_body is null then
        raise exception 'Missing required payload fields (shop_domain/topic/hook_id/body)';
      end if;

      -- Expect Shopify order payload with line_items array
      v_items := coalesce(v_body->'line_items', '[]'::jsonb);

      -- Separate cakes vs accessories
      v_cakes := '[]'::jsonb;
      v_accessories := '[]'::jsonb;
      for i in 0 .. coalesce(jsonb_array_length(v_items), 0)-1 loop
        if public.is_cake_item(v_items->i) then
          -- push N times by quantity
          for _q in 1 .. coalesce(((v_items->i)->>'quantity')::int, 1) loop
            v_cakes := v_cakes || jsonb_build_array(v_items->i);
          end loop;
        else
          v_accessories := v_accessories || jsonb_build_array(v_items->i);
        end if;
      end loop;

      if jsonb_array_length(v_cakes) = 0 then
        update public.work_queue set status = 'done', updated_at = now() where id = v_job.id;
        v_count := v_count + 1;
        continue;
      end if;

      -- Emit one child job per cake with A/B/C…; accessories only on A
      for i in 0 .. coalesce(jsonb_array_length(v_cakes), 0)-1 loop
        v_suffix := public.alpha_suffix(i);
        insert into public.work_queue (topic, payload, status)
        values (
          'kitchen_task_create',
          jsonb_build_object(
            'shop_domain', v_shop,
            'parent_hook_id', v_hook,
            'parent_topic', v_topic,
            'order_id', coalesce(v_body->>'id', v_body->>'order_number'),
            'task_suffix', v_suffix,
            'line_item', v_cakes->i,
            'accessories', case when i = 0 then v_accessories else '[]'::jsonb end
          ),
          'pending'
        );
      end loop;

      -- complete parent
      update public.work_queue
         set status = 'done',
             updated_at = now()
       where id = v_job.id;

      v_count := v_count + 1;

    exception when others then
      -- mark error and keep evidence
      insert into public.dead_letter (created_at, payload, reason)
      values (now(),
              jsonb_build_object(
                'worker', 'process_webhook_order_split',
                'error', SQLERRM,
                'job_id', v_job.id,
                'hook_id', v_hook,
                'shop_domain', v_shop
              ),
              'split_worker_failed');

      update public.work_queue
         set status = 'error',
             updated_at = now()
       where id = v_job.id;
    end;
  end loop;

  return v_count;
end;
$$;

comment on function public.process_webhook_order_split is
  'Locks pending webhook_order_split jobs, emits kitchen_task_create child jobs (A/B/C, accessories on A), marks parent done or error.';

