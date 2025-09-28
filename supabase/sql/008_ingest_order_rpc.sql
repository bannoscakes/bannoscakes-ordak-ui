begin;

-- Read feature flags from settings
create or replace function public.settings_get_bool(scope text, k text, default_value boolean)
returns boolean
language sql
stable
as $$
  select coalesce((
    select case
             when lower(value) in ('1','true','yes','on') then true
             else false
           end
    from public.settings s
    where s.scope = scope and s.key = k
    limit 1
  ), default_value);
$$;

-- Idempotency support (no error if it already exists)
create unique index if not exists orders_shopify_gid_uidx on public.orders (shopify_order_gid);

-- Ingest RPC (SECURITY DEFINER; idempotent by shopify_order_gid)
create or replace function public.ingest_order(normalized jsonb)
returns table(id text, dedup boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean := public.settings_get_bool('global','ingest', false);
  v_gid     text    := normalized->>'shopify_order_gid';
  v_id      text    := normalized->>'id';
  v_store   text    := normalized->>'store';
  v_exists  text;
begin
  if not v_enabled then
    return;
  end if;

  if coalesce(v_gid,'') = '' then
    raise exception 'missing shopify_order_gid';
  end if;

  select o.id into v_exists from public.orders o where o.shopify_order_gid = v_gid limit 1;
  if found then
    return query select v_exists, true;
  end if;

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

  -- best-effort logs (ignore if tables/cols differ)
  begin
    insert into public.api_logs(source, topic, ref, payload)
    values ('shopify','orders/create', v_gid, normalized)
    on conflict do nothing;
  exception when others then end;

  begin
    insert into public.audit_log(kind, ref, detail)
    values ('ingest_order', v_id, jsonb_build_object('gid', v_gid))
    on conflict do nothing;
  exception when others then end;

  begin
    insert into public.stage_events(order_id, stage, event, at)
    values (v_id, 'Filling', 'pending', now());
  exception when others then end;

  return query select v_id, false;
end;
$$;

grant execute on function public.ingest_order(jsonb) to authenticated;

commit;