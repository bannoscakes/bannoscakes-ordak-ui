-- 032_stage_events_uuid_guard.sql
-- Ensure stage_events.order_id is UUID-safe across all envs.

-- If the column exists and is uuid, just enforce NOT NULL (backfill nulls).
do $$
declare v_type text;
begin
  select data_type into v_type
  from information_schema.columns
  where table_schema='public' and table_name='stage_events' and column_name='order_id';

  if v_type = 'uuid' then
    -- Backfill only NULLs with a stable placeholder UUID; no '' checks for uuid
    update public.stage_events
       set order_id = gen_random_uuid()
     where order_id is null;

    alter table public.stage_events alter column order_id set not null;

  elsif v_type = 'text' then
    -- If some envs still have text, migrate to uuid safely
    -- 1) add a temp uuid column, 2) backfill, 3) swap, 4) cleanup
    alter table public.stage_events add column if not exists _order_id_uuid uuid;

    update public.stage_events
       set _order_id_uuid =
           case
             when order_id is null or length(trim(order_id)) = 0 then gen_random_uuid()
             when order_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
               then order_id::uuid
             else gen_random_uuid()
           end
     where _order_id_uuid is null;

    alter table public.stage_events alter column _order_id_uuid set not null;

    -- swap columns
    alter table public.stage_events drop column order_id;
    alter table public.stage_events rename column _order_id_uuid to order_id;

  else
    -- Unknown type: ensure there's at least some uuid column to proceed
    alter table public.stage_events add column if not exists order_id uuid;
    update public.stage_events set order_id = coalesce(order_id, gen_random_uuid());
    alter table public.stage_events alter column order_id set not null;
  end if;
end$$;

-- Re-assert unique index (idempotent)
create unique index if not exists stage_events_order_shop_stage_suffix_uidx
  on public.stage_events(order_id, shop_domain, stage, task_suffix);

