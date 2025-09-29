-- 008_ingest_order_rpc.sql
-- NOTE: Do NOT redefine settings_get_bool here. We already installed the robust jsonb/store version.

---------------------------------------
-- Main function: ingest_order(payload)
---------------------------------------
create or replace function public.ingest_order(payload jsonb)
returns void
language plpgsql
security definer
as $$
declare
  v_enabled boolean := public.settings_get_bool('global','ingest', false);

  -- route
  v_shop_domain text := coalesce(payload->>'shop_domain', payload->>'domain', payload->'shop'->>'domain');
  v_store       text;

  -- ids
  v_gid             text := payload->>'admin_graphql_api_id';
  v_shopify_id      text := payload->>'id';
  v_order_number    text := coalesce(payload->>'order_number', payload->>'name');
  v_human_id        text;

  -- customer / notes
  v_customer_name   text := coalesce(
                          payload->'shipping_address'->>'name',
                          payload->'customer'->>'name',
                          trim(concat_ws(' ', payload->'customer'->>'first_name', payload->'customer'->>'last_name'))
                        );
  v_notes           text := coalesce(payload->>'note','');
  v_delivery_instr  text;

  -- delivery
  v_method_raw      text;
  v_delivery_method text;
  v_due_raw         text;
  v_due_text        text;
  v_delivery_date   date;

  -- money
  v_currency        text := coalesce(payload->>'presentment_currency', payload->>'currency');
  v_total_amount    numeric(12,2) := coalesce(nullif(payload->>'current_total_price','')::numeric,
                                             nullif(payload->>'total_price','')::numeric, 0);

  -- primary line item (non-gift, qty>0)
  v_line            jsonb;
  v_product_title   text;
  v_item_qty        integer;
  v_flavour         text;
begin
  -- feature flag
  if not v_enabled then return; end if;

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
  from jsonb_array_elements(coalesce(payload->'line_items','[]'::jsonb)) li
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
  end if;

  -- delivery method (attributes first)
  select na->>'value' into v_method_raw
  from jsonb_path_query(payload, '$.note_attributes[*] ? (@.name != null)') as na
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
  from jsonb_path_query(payload, '$.note_attributes[*] ? (@.name != null)') as na
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

  -- notes aggregation: note + delivery instructions (joined with " • ")
  select na->>'value' into v_delivery_instr
  from jsonb_path_query(payload, '$.note_attributes[*] ? (@.name != null)') as na
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
    payload
  )
  on conflict (shopify_order_gid) do nothing;
end
$$;

-------------------------------------------------------------
-- Wrapper overload for legacy callers: ingest_order(text, jsonb)
-------------------------------------------------------------
create or replace function public.ingest_order(p_shop_domain text, p_payload jsonb)
returns void
language sql
security definer
as $$
  select public.ingest_order(
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('shop_domain', p_shop_domain)
  );
$$;