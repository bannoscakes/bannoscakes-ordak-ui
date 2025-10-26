-- 024_work_queue_align.sql
-- Forward-fix: ensures work_queue has the required schema for webhook enqueue.
-- Creates table if missing, adds missing columns if table exists with old schema.

-- 1) Create table if it doesn't exist (with correct schema)
create table if not exists public.work_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic text not null,
  payload jsonb not null,
  status text not null default 'pending'
);

-- 2) Add missing columns if table exists but has old schema
do $$
begin
  -- Add topic column if missing (rename from job_type if it exists)
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='work_queue' and column_name='topic'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='work_queue' and column_name='job_type'
    ) then
      alter table public.work_queue rename column job_type to topic;
    else
      alter table public.work_queue add column topic text not null default 'unknown';
    end if;
  end if;

  -- Add status column if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='work_queue' and column_name='status'
  ) then
    alter table public.work_queue add column status text not null default 'pending';
  end if;
end$$;

-- 3) Create index for efficient queue processing
create index if not exists work_queue_topic_created_at_idx
  on public.work_queue (topic, created_at desc);

