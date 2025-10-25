-- 023_webhook_enqueue.sql
-- Queue + SECURITY DEFINER RPC to enqueue order-splitting work from verified webhooks.

-- 1) Ensure the work_queue table exists (idempotent)
create table if not exists public.work_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_type text not null,
  payload jsonb not null
);

-- Optional helper index to pop newest jobs by type efficiently
create index if not exists work_queue_job_type_created_at_idx
  on public.work_queue (job_type, created_at desc);

-- 2) SECURITY DEFINER RPC to enqueue work (with input validation)
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
  -- Validate required inputs (defensive; webhook should already guarantee these)
  if p_shop_domain is null or length(trim(p_shop_domain)) = 0 then
    raise exception 'p_shop_domain is required';
  end if;

  if p_hook_id is null or length(trim(p_hook_id)) = 0 then
    raise exception 'p_hook_id is required';
  end if;

  if p_topic is null or length(trim(p_topic)) = 0 then
    raise exception 'p_topic is required';
  end if;

  -- Enqueue job
  insert into public.work_queue (job_type, payload)
  values (
    'webhook_order_split',
    jsonb_build_object(
      'shop_domain', p_shop_domain,
      'topic', p_topic,
      'hook_id', p_hook_id,
      'body', p_body
    )
  );
end;
$$;

comment on function public.enqueue_order_split is
  'Queues order split work for verified Shopify webhooks.';
