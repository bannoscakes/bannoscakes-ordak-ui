-- =====================================================
-- Migration: WORKERS BACKGROUND JOBS
-- Date: 2025-11-07
-- Description: Extract production RPCs for workers background jobs
-- =====================================================
-- 
-- Functions in this migration:
--   - process_webhook_order_split
--   - process_kitchen_task_create
--   - ingest_order
--   - is_cake_item
--
-- =====================================================

-- Function: process_webhook_order_split
CREATE OR REPLACE FUNCTION public.process_webhook_order_split(p_limit integer DEFAULT 10, p_lock_secs integer DEFAULT 60)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- Function: process_kitchen_task_create
CREATE OR REPLACE FUNCTION public.process_kitchen_task_create(p_limit integer DEFAULT 20, p_lock_secs integer DEFAULT 60)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_now timestamptz := now();
  v_count int := 0;
  v_job record;
  v_p jsonb;
  v_shop text;
  v_order uuid;   -- set per job, deterministically
  v_suffix text;
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
      v_p    := v_job.payload;
      v_shop := v_p->>'shop_domain';
      if v_shop is null then
        raise exception 'missing payload: shop_domain';
      end if;
      -- Deterministic order UUID: use parent webhook id (Shopify header) we stored in worker #1.
      -- All A/B/C tasks from the same order share this UUID; retries reuse it exactly.
      v_order := nullif(v_p->>'parent_hook_id','')::uuid;
      if v_order is null then
        -- fallback (rare): stable per job id
        v_order := v_job.id; -- requires work_queue.id to be uuid (it is in your DB)
      end if;
      -- Extract and validate suffix (A/B/C…)
      v_suffix := nullif(v_p->>'task_suffix','');
      if v_suffix is null then
        raise exception 'missing payload: task_suffix';
      end if;
      if v_suffix !~ '^[A-Z]+$' then
        raise exception 'invalid task_suffix: %', v_suffix;
      end if;
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
$function$
;

-- Version 1 of 2
-- Function: ingest_order
CREATE OR REPLACE FUNCTION public.ingest_order(payload jsonb DEFAULT NULL::jsonb, normalized jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_enabled boolean := public.settings_get_bool('global','ingest', false);
  v_in      jsonb    := coalesce(payload, normalized);  -- <— accept either key
  v_shop_domain text := coalesce(v_in->>'shop_domain', v_in->>'domain', v_in->'shop'->>'domain');
  v_store       text;
  v_gid             text := v_in->>'admin_graphql_api_id';
  v_shopify_id      text := v_in->>'id';
  v_order_number    text := coalesce(v_in->>'order_number', v_in->>'name');
  v_customer_name   text := coalesce(
                          v_in->'shipping_address'->>'name',
                          v_in->'customer'->>'name',
                          trim(concat_ws(' ', v_in->'customer'->>'first_name', v_in->'customer'->>'last_name'))
                        );
  v_notes           text := coalesce(v_in->>'note','');
  v_delivery_instr  text;
  v_method_raw      text;
  v_delivery_method text;
  v_due_raw         text;
  v_due_text        text;
  v_delivery_date   date;
  v_currency        text := coalesce(v_in->>'presentment_currency', v_in->>'currency');
  v_total_amount    numeric(12,2) := coalesce(nullif(v_in->>'current_total_price','')::numeric,
                                             nullif(v_in->>'total_price','')::numeric, 0);
  v_line            jsonb;
  v_product_title   text;
  v_item_qty        integer;
  v_flavour         text;
begin
  if not v_enabled then return; end if;
  v_store := case
    when v_shop_domain ilike '%bannos%'    then 'bannos'
    when v_shop_domain ilike '%flourlane%' then 'flourlane'
    else null
  end;
  if v_store is null then
    raise exception 'Unknown shop domain: %', coalesce(v_shop_domain, '<null>');
  end if;
  if v_gid is null then
    raise exception 'Missing admin_graphql_api_id';
  end if;
  -- primary line item: first non-gift with qty > 0
  select li
  into v_line
  from jsonb_array_elements(coalesce(v_in->'line_items','[]'::jsonb)) li
  where coalesce((li->>'gift_card')::boolean, false) = false
    and coalesce((li->>'quantity')::int, 0) > 0
  limit 1;
  v_product_title := coalesce(v_line->>'title','');
  v_item_qty      := nullif(v_line->>'quantity','')::int;
  -- flavour: "gelato flavour(s)" (skip internal keys) → variant_title fallback
  with props as (
    select p
    from jsonb_array_elements(coalesce(v_line->'properties','[]'::jsonb)) p
  ),
  visible as (
    select p
    from props
    where not (
      coalesce(lower(p->>'name'), lower(p->>'first'), '') like '\_%' escape '\'
      or coalesce(lower(p->>'name'), lower(p->>'first'), '') ~ '_origin|_raw|gwp|_LocalDeliveryID'
    )
  ),
  hit as (
    select p
    from visible
    where coalesce(p->>'name', p->>'first') ~* 'gelato flavour(s)?'
       or lower(coalesce(p->>'name', p->>'first')) in ('flavour','flavor')
    limit 1
  )
  select string_agg(trim(x), ', ') into v_flavour
  from (
    select unnest(regexp_split_to_array(coalesce((select h.p->>'value' from hit h), ''), E'\\r?\\n|,|/')) x
  ) s
  where x <> '';
  if coalesce(v_flavour,'') = '' then
    v_flavour := coalesce(split_part(coalesce(v_line->>'variant_title',''), ',', 1), '');
    if position('/' in v_flavour) > 0 then
      v_flavour := split_part(v_flavour, '/', 1);
    end if;
  end if;
  -- delivery method (attributes first)
  select na->>'value' into v_method_raw
  from jsonb_path_query(v_in, '$.note_attributes[*] ? (@.name != null)') as na
  where lower(na->>'name') in ('delivery method','pickup or delivery')
  limit 1;
  if v_method_raw is not null then
    v_delivery_method := case when lower(v_method_raw) ~ 'pickup|pick up' then 'pickup' else 'delivery' end;
  end if;
  -- delivery date (strip “between …” then parse)
  select na->>'value' into v_due_raw
  from jsonb_path_query(v_in, '$.note_attributes[*] ? (@.name != null)') as na
  where lower(na->>'name') in ('local delivery date and time','delivery date','pickup date')
  limit 1;
  if v_due_raw is not null then
    v_due_text := split_part(v_due_raw, 'between', 1);
    begin
      v_delivery_date := v_due_text::date;
    exception when others then
      begin
        v_delivery_date := to_date(regexp_replace(v_due_text, '.*?(\d{4}-\d{2}-\d{2}).*', '\1'), 'YYYY-MM-DD');
      exception when others then
        v_delivery_date := null;
      end;
    end;
  end if;
  -- notes aggregation: order note + Delivery Instructions
  select na->>'value' into v_delivery_instr
  from jsonb_path_query(v_in, '$.note_attributes[*] ? (@.name != null)') as na
  where lower(na->>'name') = 'delivery instructions'
  limit 1;
  if coalesce(v_delivery_instr,'') <> '' then
    v_notes := trim(both ' ' from concat_ws(' • ', nullif(v_notes,''), v_delivery_instr));
  end if;
  -- INSERT (human_id is filled by trigger)
  insert into public.orders (
    store, shopify_order_id, shopify_order_gid, order_number,
    customer_name, delivery_date, delivery_method, product_title, flavour,
    item_qty, notes, currency, total_amount, order_json
  )
  values (
    v_store, v_shopify_id, v_gid, v_order_number,
    v_customer_name, v_delivery_date, v_delivery_method, v_product_title, v_flavour,
    v_item_qty, v_notes, v_currency, v_total_amount, v_in
  )
  on conflict (shopify_order_gid) do nothing;
end
$function$
;

-- Version 2 of 2
-- Function: ingest_order
CREATE OR REPLACE FUNCTION public.ingest_order(p_shop_domain text, payload jsonb DEFAULT NULL::jsonb, normalized jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select public.ingest_order(
    coalesce(payload, normalized) || jsonb_build_object('shop_domain', p_shop_domain),
    null
  );
$function$
;

-- Function: is_cake_item
CREATE OR REPLACE FUNCTION public.is_cake_item(p_item jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce( (p_item->>'product_type') ilike '%cake%'
                or (p_item->>'title') ilike '%cake%', false )
$function$
;

