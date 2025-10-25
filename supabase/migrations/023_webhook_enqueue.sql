-- 023_webhook_enqueue.sql (patch for existing schema)
-- Align enqueue_order_split() with current work_queue table (topic, payload, status)

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

  -- Insert job into existing queue (topic,payload,status)
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

-- optional index to match production queue style
create index if not exists work_queue_topic_created_at_idx
  on public.work_queue (topic, created_at desc);
