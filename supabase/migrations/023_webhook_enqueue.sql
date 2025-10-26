-- 023_webhook_enqueue.sql
-- Ensure work_queue exists (topic,payload,status) + enqueue RPC (SECURITY DEFINER).

-- A) Make sure the queue table is present and shaped as expected (idempotent)
create table if not exists public.work_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic text not null,
  payload jsonb not null,
  status text not null default 'pending'
);

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
end$$;

-- Helpful index for consumers
create index if not exists work_queue_topic_created_at_idx
  on public.work_queue (topic, created_at desc);

-- B) Enqueue RPC (uses topic,payload,status)
create or replace function public.enqueue_order_split(
  p_shop_domain text,
  p_topic text,
  p_hook_id text,
  p_body jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validate required inputs
  if p_shop_domain is null or length(trim(p_shop_domain)) = 0 then
    raise exception 'p_shop_domain is required';
  end if;
  if p_hook_id is null or length(trim(p_hook_id)) = 0 then
    raise exception 'p_hook_id is required';
  end if;
  if p_topic is null or length(trim(p_topic)) = 0 then
    raise exception 'p_topic is required';
  end if;

  insert into public.work_queue (topic, payload, status)
  values (
    'webhook_order_split',
    jsonb_build_object(
      'shop_domain', p_shop_domain,
      'topic', p_topic,
      'hook_id', p_hook_id,
      'body', p_body
    ),
    'pending'
  );
end;
$$;

comment on function public.enqueue_order_split is
  'Queues order split work for verified Shopify webhooks.';
