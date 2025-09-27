-- 007_scan_lookup.sql — read-only scanner lookup
create or replace function public.get_order_for_scan(p_code text)
returns public.orders
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s text := lower(trim(p_code));
  v_store text;
  v_num bigint;
  v_id uuid;
  v_row public.orders;
begin
  -- UUID direct
  if s ~ '^[0-9a-f-]{36}$' then
    begin v_id := s::uuid; exception when others then v_id := null; end;
    if v_id is not null then
      select * into v_row from public.orders where id = v_id limit 1;
      return v_row;
    end if;
  end if;

  -- Exact barcode match first (case-sensitive user entry)
  select * into v_row from public.orders where barcode = p_code limit 1;
  if found then return v_row; end if;

  -- bannos-##### / flourlane-##### / plain number
  if s like 'bannos-%' then
    v_store := 'bannos';
    begin v_num := substring(s from 'bannos-(\\d+)')::bigint; exception when others then v_num := null; end;
  elsif s like 'flourlane-%' then
    v_store := 'flourlane';
    begin v_num := substring(s from 'flourlane-(\\d+)')::bigint; exception when others then v_num := null; end;
  elsif s ~ '^\\d+$' then
    v_num := s::bigint;
  end if;

  -- store + number
  if v_store is not null and v_num is not null then
    select * into v_row from public.orders where store = v_store and shopify_order_number = v_num limit 1;
    if found then return v_row; end if;
  end if;

  -- number only across stores
  if v_num is not null then
    select * into v_row from public.orders where shopify_order_number = v_num limit 1;
    if found then return v_row; end if;
  end if;

  return v_row; -- null if no match
end
$$;

-- Staff-only (read); keep off for anon
grant execute on function public.get_order_for_scan(text) to authenticated;
