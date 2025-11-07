-- =====================================================
-- Migration: MESSAGING
-- Date: 2025-11-07
-- Description: Extract production RPCs for messaging
-- =====================================================
-- 
-- Functions in this migration:
--   - create_conversation
--   - create_conversation_text
--   - get_conversations
--   - get_conversation_participants
--   - get_messages
--   - get_messages_temp
--   - send_message
--   - mark_messages_read
--   - get_unread_count
--   - add_participant
--   - remove_participant
--
-- =====================================================

-- Function: create_conversation
CREATE OR REPLACE FUNCTION public.create_conversation(p_participants uuid[], p_name text DEFAULT NULL::text, p_type text DEFAULT 'direct'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_convo_id uuid;
  v_me uuid := auth.uid();
  v_name text := p_name;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if p_type not in ('direct','group','broadcast') then
    raise exception 'Invalid conversation type %', p_type;
  end if;
  if array_length(p_participants,1) is null or array_length(p_participants,1) = 0 then
    raise exception 'At least one participant required';
  end if;
  -- for direct, normalize name empty (UI can show other user's name)
  if p_type = 'direct' and v_name is null then
    v_name := null;
  end if;
  insert into public.conversations(type, name, created_by)
  values (p_type, v_name, v_me)
  returning id into v_convo_id;
  -- add creator
  insert into public.conversation_participants(conversation_id, user_id, role)
  values (v_convo_id, v_me, 'owner')
  on conflict do nothing;
  -- add other participants
  insert into public.conversation_participants(conversation_id, user_id)
  select v_convo_id, unnest(p_participants)
  on conflict do nothing;
  -- initialize read marker for creator
  insert into public.message_reads(conversation_id, user_id, last_read_at)
  values (v_convo_id, v_me, now())
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
  return v_convo_id;
end;
$function$
;

-- Function: create_conversation_text
CREATE OR REPLACE FUNCTION public.create_conversation_text(p_participants text[], p_name text DEFAULT NULL::text, p_type text DEFAULT 'direct'::text)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select public.create_conversation(
    array(select x::uuid from unnest(p_participants) as x),
    p_name,
    p_type
  );
$function$
;

-- Function: get_conversations
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
  mc.id, mc.name, mc.type, mc.created_by, mc.created_at,
  lm.body as last_message_text,
  lm.created_at as last_message_at,
  lm.sender_id as last_message_sender_id,
  lm.sender_name as last_message_sender_name,
  coalesce(sum(u.u) over (partition by mc.id),0) as unread_count,
  coalesce(ct.participant_count, 0) as participant_count
from mine mc
left join lasts lm on lm.conversation_id = mc.id
left join counts ct on ct.conversation_id = mc.id
left join unread u on u.conversation_id = mc.id
order by coalesce(lm.created_at, mc.created_at) desc
limit p_limit offset p_offset;
$function$
;

-- Function: get_conversation_participants
CREATE OR REPLACE FUNCTION public.get_conversation_participants(p_conversation_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, role text, is_online boolean, joined_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select
    cp.user_id,
    coalesce( (auth.jwt() -> 'user_metadata' ->> 'full_name') , '' )::text as full_name, -- placeholder; wire to your staff table if needed
    cp.role,
    false as is_online, -- placeholder; wire to presence later
    cp.joined_at
  from public.conversation_participants cp
  where cp.conversation_id = p_conversation_id
    and exists (select 1 from public.conversation_participants p
                where p.conversation_id = p_conversation_id and p.user_id = auth.uid());
$function$
;

-- Function: get_messages
CREATE OR REPLACE FUNCTION public.get_messages(p_conversation_id uuid, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_messages JSONB;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not authenticated',
      'data', null,
      'error_code', 'AUTH_REQUIRED'
    );
  END IF;
  
  -- Validate user is participant in conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = p_conversation_id 
    AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not participant in conversation',
      'data', null,
      'error_code', 'NOT_PARTICIPANT'
    );
  END IF;
  
  -- Get messages with sender info
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'content', m.body,
      'sender_id', m.sender_id,
      'sender_name', s.full_name,
      'created_at', m.created_at
    ) ORDER BY m.created_at DESC
  )
  INTO v_messages
  FROM public.messages m
  JOIN public.staff_shared s ON s.user_id = m.sender_id
  WHERE m.conversation_id = p_conversation_id
  LIMIT p_limit;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Messages retrieved successfully',
    'data', COALESCE(v_messages, '[]'::jsonb),
    'error_code', null
  );
END;
$function$
;

-- Function: get_messages_temp
CREATE OR REPLACE FUNCTION public.get_messages_temp(p_conversation_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id bigint, body text, sender_id uuid, sender_name text, created_at timestamp with time zone, is_own_message boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select
    m.id, m.body, m.sender_id, m.sender_name, m.created_at,
    (m.sender_id = auth.uid()) as is_own_message
  from public.messages m
  where m.conversation_id = p_conversation_id
    and exists (select 1 from public.conversation_participants p
                where p.conversation_id = m.conversation_id
                  and p.user_id = auth.uid())
  order by m.created_at asc
  limit p_limit offset p_offset
$function$
;

-- Function: send_message
CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id uuid, p_content text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_me uuid := auth.uid();
  v_id bigint;
  v_name text := public.current_user_name();
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if p_content is null or length(btrim(p_content)) = 0 then
    raise exception 'Message body required';
  end if;
  -- only participants can post
  if not exists (
    select 1 from public.conversation_participants p
    where p.conversation_id = p_conversation_id and p.user_id = v_me
  ) then
    raise exception 'Not a participant';
  end if;
  insert into public.messages(conversation_id, sender_id, sender_name, body)
  values (p_conversation_id, v_me, coalesce(v_name, 'Unknown'), p_content)
  returning id into v_id;
  -- mark the sender as read now
  insert into public.message_reads(conversation_id, user_id, last_read_at)
  values (p_conversation_id, v_me, now())
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
  return v_id;
end;
$function$
;

-- Function: mark_messages_read
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Not authenticated'; end if;
  insert into public.message_reads(conversation_id, user_id, last_read_at)
  values (p_conversation_id, v_me, now())
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
  return true;
end;
$function$
;

-- Function: get_unread_count
CREATE OR REPLACE FUNCTION public.get_unread_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
with my_convos as (
  select c.id
  from public.conversations c
  join public.conversation_participants p on p.conversation_id = c.id
  where p.user_id = auth.uid()
),
last_msg as (
  select conversation_id, max(created_at) as last_msg_at
  from public.messages
  group by conversation_id
)
select coalesce(count(*),0)
from my_convos mc
left join last_msg lm on lm.conversation_id = mc.id
left join public.message_reads r on r.conversation_id = mc.id and r.user_id = auth.uid()
where lm.last_msg_at is not null
  and (r.last_read_at is null or lm.last_msg_at > r.last_read_at);
$function$
;

-- Version 1 of 2
-- Function: add_participant
CREATE OR REPLACE FUNCTION public.add_participant(p_conversation_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  insert into public.conversation_participants(conversation_id, user_id)
  values (p_conversation_id, p_user_id)
  on conflict do nothing;
  select true;
$function$
;

-- Version 2 of 2
-- Function: add_participant
CREATE OR REPLACE FUNCTION public.add_participant(p_conversation_id text, p_user_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (p_conversation_id::uuid, p_user_id::uuid)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RETURN true;
END;
$function$
;

-- Version 1 of 2
-- Function: remove_participant
CREATE OR REPLACE FUNCTION public.remove_participant(p_conversation_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  delete from public.conversation_participants
  where conversation_id = p_conversation_id and user_id = p_user_id;
  select true;
$function$
;

-- Version 2 of 2
-- Function: remove_participant
CREATE OR REPLACE FUNCTION public.remove_participant(p_conversation_id text, p_user_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id::uuid
    AND user_id = p_user_id::uuid;
  
  RETURN true;
END;
$function$
;

