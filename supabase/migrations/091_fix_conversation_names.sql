-- Migration: Fix conversation names for direct messages
-- For direct messages (type='direct'), show the other participant's name instead of null
-- This fixes the "Unnamed Conversation" display issue

CREATE OR REPLACE FUNCTION public.get_conversations(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, type text, created_by uuid, created_at timestamp with time zone, last_message_text text, last_message_at timestamp with time zone, last_message_sender_id uuid, last_message_sender_name text, unread_count integer, participant_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
with mine as (
  select c.*
  from public.conversations c
  join public.conversation_participants p on p.conversation_id = c.id
  where p.user_id = auth.uid()
),
-- For direct messages, get the OTHER participant's name (not the current user)
other_participant as (
  select
    cp.conversation_id,
    s.full_name as other_name
  from public.conversation_participants cp
  join public.staff_shared s on s.user_id = cp.user_id
  where cp.user_id != auth.uid()
    and exists (
      select 1 from mine m
      where m.id = cp.conversation_id
        and m.type = 'direct'
    )
),
lasts as (
  select distinct on (m.conversation_id)
    m.conversation_id, m.body, m.created_at, m.sender_id, m.sender_name
  from public.messages m
  order by m.conversation_id, m.created_at desc
),
counts as (
  select conversation_id, count(*) as participant_count
  from public.conversation_participants
  group by conversation_id
),
unread as (
  select mc.id as conversation_id,
         case
           when lm.created_at is null then 0
           when r.last_read_at is null then 1
           when lm.created_at > r.last_read_at then 1
           else 0
         end as u
  from mine mc
  left join lasts lm on lm.conversation_id = mc.id
  left join public.message_reads r on r.conversation_id = mc.id and r.user_id = auth.uid()
)
select
  mc.id,
  -- For direct messages with no name, use the other participant's name
  case
    when mc.type = 'direct' and mc.name is null then coalesce(op.other_name, 'Unknown User')
    else coalesce(mc.name, 'Unnamed Conversation')
  end as name,
  mc.type,
  mc.created_by,
  mc.created_at,
  lm.body as last_message_text,
  lm.created_at as last_message_at,
  lm.sender_id as last_message_sender_id,
  lm.sender_name as last_message_sender_name,
  coalesce(sum(u.u) over (partition by mc.id),0) as unread_count,
  coalesce(ct.participant_count, 0) as participant_count
from mine mc
left join other_participant op on op.conversation_id = mc.id
left join lasts lm on lm.conversation_id = mc.id
left join counts ct on ct.conversation_id = mc.id
left join unread u on u.conversation_id = mc.id
order by coalesce(lm.created_at, mc.created_at) desc
limit p_limit offset p_offset;
$function$
;
