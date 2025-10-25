-- 023_webhook_enqueue.sql
-- SECURITY DEFINER RPC to enqueue order-splitting work from verified webhooks.

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
  -- Assumes work_queue exists with (id uuid default gen_random_uuid(), created_at timestamptz default now(), job_type text, payload jsonb)
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

-- Optional: lightweight comment helps audits
comment on function public.enqueue_order_split is 'Queues order split work for verified Shopify webhooks.';

