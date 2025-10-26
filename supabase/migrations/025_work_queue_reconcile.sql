-- 025_work_queue_reconcile.sql
-- Make work_queue shape consistent across all environments.

-- Ensure table exists (minimal shape)
create table if not exists public.work_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic text not null,
  payload jsonb not null,
  status text not null default 'pending'
);

-- Add missing columns defensively
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='work_queue' and column_name='topic'
  ) then
    alter table public.work_queue add column topic text not null default 'unknown';
    alter table public.work_queue alter column topic drop default;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='work_queue' and column_name='payload'
  ) then
    alter table public.work_queue add column payload jsonb not null default '{}'::jsonb;
    alter table public.work_queue alter column payload drop default;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='work_queue' and column_name='status'
  ) then
    alter table public.work_queue add column status text not null default 'pending';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='work_queue' and column_name='created_at'
  ) then
    alter table public.work_queue add column created_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='work_queue' and column_name='id'
  ) then
    alter table public.work_queue add column id uuid default gen_random_uuid();
    alter table public.work_queue alter column id set not null;
    alter table public.work_queue add primary key (id);
  end if;

  -- Handle legacy schema: job_type → topic
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='work_queue' and column_name='job_type'
  ) then
    -- If topic doesn't exist we already added it above; now backfill and drop job_type
    update public.work_queue
       set topic = coalesce(nullif(trim(topic), ''), job_type)
     where topic is null or length(trim(topic)) = 0;

    alter table public.work_queue drop column job_type;
  end if;
end$$;

-- Helpful index (safe if already exists)
create index if not exists work_queue_topic_created_at_idx
  on public.work_queue (topic, created_at desc);

