-- 008_ingest_order_rpc.sql
-- NOTE: Do NOT redefine settings_get_bool here. We already installed the robust jsonb/store version.
-- Drop any older/conflicting signatures first (idempotent)
drop function if exists public.ingest_order(text, jsonb, jsonb);
drop function if exists public.ingest_order(jsonb, jsonb);

-- Helper: read boolean feature flags from `settings` table
-- Read feature flags from settings
-- Helper: read boolean feature flags from settings
create or replace function public.settings_get_bool(scope text, k text, default_value boolean)
returns boolean
language sql
stable
as $$
  select coalesce((
    select case lower(value)
           when '1' then true when 'true' then true when 'yes' then true when 'on' then true
           else false end
    select case
             when lower(value) in ('1','true','yes','on') then true
             else false
           end
    from public.settings s
    where s.scope = scope and s.key = k
    limit 1
  ), default_value);
$$;

-- Idempotency support (won't error if already there)
create unique index if not exists orders_shopify_gid_uidx on public.orders (shopify_order_gid);

-- Ingest RPC (SECURITY DEFINER; executes even with RLS later)
-- Idempotency support (no error if it already exists)
-- Idempotency support (no error if already present)
create unique index if not exists orders_shopify_gid_uidx on public.orders (shopify_order_gid);


---------------------------------------
-- MAIN: accepts payload or normalized via optional args
---------------------------------------
create function public.ingest_order(payload jsonb default null,
                                   normalized jsonb default null)
returns table(id text, dedup boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean := public.settings_get_bool('global','ingest', false);
  v_work_payload jsonb;
  v_rows integer;

  -- route
  v_shop_domain text;
  v_store       text;

  -- ids
  v_gid             text;
  v_shopify_id      text;
  v_order_number    text;
  v_human_id        text;

  -- customer / notes
  v_customer_name   text;
  v_notes           text;
  v_delivery_instr  text;

  -- delivery
  v_method_raw      text;
  v_delivery_method text;
  v_due_raw         text;
  v_due_text        text;
  v_delivery_date   date;

  -- money
  v_currency        text;
  v_total_amount    numeric(12,2);

  -- primary line item (non-gift, qty>0)
  v_line            jsonb;
  v_product_title   text;
  v_item_qty        integer;
  v_flavour         text;
begin
  -- feature flag
  if not v_enabled then return; end if;

  -- Use normalized if provided, otherwise use payload
  v_work_payload := coalesce(normalized, payload);
  if v_work_payload is null then
    raise exception 'Either payload or normalized must be provided';
  end if;

  -- Extract values from working payload
  v_shop_domain := coalesce(v_work_payload->>'shop_domain', v_work_payload->>'domain', v_work_payload->'shop'->>'domain');
  v_gid := v_work_payload->>'admin_graphql_api_id';
  v_shopify_id := v_work_payload->>'id';
  v_order_number := coalesce(v_work_payload->>'order_number', v_work_payload->>'name');
  
  v_customer_name := coalesce(
    v_work_payload->'shipping_address'->>'name',
    v_work_payload->'customer'->>'name',
    trim(concat_ws(' ', v_work_payload->'customer'->>'first_name', v_work_payload->'customer'->>'last_name'))
  );
  v_notes := coalesce(v_work_payload->>'note','');
  
  v_currency := coalesce(v_work_payload->>'presentment_currency', v_work_payload->>'currency');
  v_total_amount := coalesce(nullif(v_work_payload->>'current_total_price','')::numeric,
                            nullif(v_work_payload->>'total_price','')::numeric, 0);

  -- store routing
  v_store := case
    when v_shop_domain ilike '%bannos%'    then 'bannos'
    when v_shop_domain ilike '%flourlane%' then 'flourlane'
    else null
  end;
  if v_store is null then
    raise exception 'Unknown shop domain: %', coalesce(v_shop_domain, '<null>');
  end if;

  -- GID required for idempotency
  if v_gid is null then
    raise exception 'Missing admin_graphql_api_id';
  end if;

  -- human id "bannos-<order_number>" (fallback to numeric id)
  v_human_id := format('%s-%s', v_store, coalesce(nullif(v_order_number,''), v_shopify_id));

  -- primary line item: first non-gift with qty > 0
  select li
  into v_line
  from jsonb_array_elements(coalesce(v_work_payload->'line_items','[]'::jsonb)) li
  where coalesce((li->>'gift_card')::boolean, false) = false
    and coalesce((li->>'quantity')::int, 0) > 0
  limit 1;

  v_product_title := coalesce(v_line->>'title','');
  v_item_qty      := nullif(v_line->>'quantity','')::int;

  -- flavour extraction with blacklist + "gelato flavour(s)" keys; variant-title fallback
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

  -- Feature gate: do nothing if switched off
  -- Feature gate: do nothing if disabled
  if not v_enabled then
    return;
  end if;

  if coalesce(v_gid, '') = '' then
    raise exception 'missing shopify_order_gid';
  end if;

  -- Dedup
  if coalesce(v_gid,'') = '' then
  -- Single validation (remove duplicates)
  if v_gid is null or v_gid = '' then
    raise exception 'missing shopify_order_gid';

  end if;

  -- delivery method (attributes first)
  select na->>'value' into v_method_raw
  from jsonb_path_query(v_work_payload, '$.note_attributes[*] ? (@.name != null)') as na
  where lower(na->>'name') in ('delivery method','pickup or delivery')
  limit 1;

  if v_method_raw is not null then
    v_delivery_method := case
      when lower(v_method_raw) ~ 'pickup|pick up' then 'pickup'
      else 'delivery'
    end;
  end if;
  -- due date: part before "between"
  select na->>'value' into v_due_raw
  from jsonb_path_query(v_work_payload, '$.note_attributes[*] ? (@.name != null)') as na
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

  -- Insert minimal, safe set of fields (match your schema)
  -- Insert minimal, schema-safe fields
  insert into public.orders
    (id, store, shopify_order_id, shopify_order_gid, shopify_order_number,
     customer_name, product_title, flavour, notes, currency, total_amount,
     order_json, due_date, delivery_method, stage, priority)
  values
    (v_id,
     v_store,
     nullif(normalized->>'shopify_order_id','')::bigint,
     v_gid,
     nullif(normalized->>'shopify_order_number',''),
     nullif(normalized->>'customer_name',''),
     nullif(normalized->>'product_title',''),
     coalesce(normalized->>'flavour',''),
     coalesce(normalized->>'notes',''),
     coalesce(normalized->>'currency',''),
     coalesce((normalized->>'total_amount')::numeric, 0),
     normalized,
     nullif(normalized->>'due_date','')::date,
     nullif(normalized->>'delivery_method',''),
     'Filling_pending',
     nullif(normalized->>'priority',''))
  returning id into v_id;

  -- Best-effort logs (ignore if tables/cols differ)
  -- Best-effort logs (tables/cols may not exist → swallow)
  begin
    insert into public.api_logs(source, topic, ref, payload)
    values ('shopify','orders/create', v_gid, normalized)
    on conflict do nothing;
  exception when others then
    -- ignore
  end;
  exception when others then end;
    null;
  end;

  begin
    insert into public.audit_log(kind, ref, detail)
    values ('ingest_order', v_id, jsonb_build_object('gid', v_gid))
    on conflict do nothing;
  exception when others then
    -- ignore
  end;

  -- Initial stage_event (optional, ignore if table/cols differ)
  begin
    insert into public.stage_events(order_id, stage, event, at)
    values (v_id, 'Filling', 'pending', now());
  exception when others then
    -- ignore
  end;
  exception when others then end;
    null;
  end;


  -- notes aggregation: note + delivery instructions (joined with " • ")
  select na->>'value' into v_delivery_instr
  from jsonb_path_query(v_work_payload, '$.note_attributes[*] ? (@.name != null)') as na
  where lower(na->>'name') = 'delivery instructions'
  limit 1;

  if coalesce(v_delivery_instr,'') <> '' then
    v_notes := trim(both ' ' from concat_ws(' • ', nullif(v_notes,''), v_delivery_instr));
  end if;

  -- INSERT (idempotent by GID)
  insert into public.orders (
    store,
    human_id,
    shopify_order_id,
    shopify_order_gid,
    order_number,
    customer_name,
    delivery_date,
    delivery_method,
    product_title,
    flavour,
    item_qty,
    notes,
    currency,
    total_amount,
    order_json
  )
  values (
    v_store,
    v_human_id,
    v_shopify_id,
    v_gid,
    v_order_number,
    v_customer_name,
    v_delivery_date,
    v_delivery_method,
    v_product_title,
    v_flavour,
    v_item_qty,
    v_notes,
    v_currency,
    v_total_amount,
    v_work_payload
  )
  on conflict (shopify_order_gid) do nothing;
  get diagnostics v_rows = row_count;
  return query
  select
    v_human_id::text as id,
    (v_rows = 0) as dedup;
end
$$;

-------------------------------------------------------------
-- LEGACY WRAPPER: p_shop_domain + body
-------------------------------------------------------------
create or replace function public.ingest_order(p_shop_domain text,
                                              payload jsonb default null,
                                              normalized jsonb default null)
returns table(id text, dedup boolean)
language sql
security definer
set search_path = public
as $$
  select * from public.ingest_order(
    coalesce(payload, normalized) || jsonb_build_object('shop_domain', p_shop_domain),
    null
  );
$$;

