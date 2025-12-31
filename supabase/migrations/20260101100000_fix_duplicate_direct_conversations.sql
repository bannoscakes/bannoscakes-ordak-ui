-- Migration: Fix duplicate direct conversations
-- Issue: #582
--
-- Problem: create_conversation always creates a new conversation without checking
-- if a direct conversation already exists between the same two users.
-- This results in multiple duplicate conversations in the conversation list.
--
-- Solution: Add "find or create" logic for direct conversations.
-- For direct type with 1 participant, first check if a conversation exists
-- between the current user and that participant. If found, return it.
-- Otherwise, create a new one.

CREATE OR REPLACE FUNCTION public.create_conversation(
  p_participants uuid[],
  p_name text DEFAULT NULL::text,
  p_type text DEFAULT 'direct'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_convo_id uuid;
  v_me uuid := auth.uid();
  v_name text := p_name;
  v_other_user uuid;
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

  -- For DIRECT conversations with exactly 1 participant: find existing or create new
  if p_type = 'direct' and array_length(p_participants, 1) = 1 then
    v_other_user := p_participants[1];

    -- Don't create a conversation with yourself
    if v_other_user = v_me then
      raise exception 'Cannot create direct conversation with yourself';
    end if;

    -- Look for existing direct conversation between these two users
    select c.id into v_convo_id
    from public.conversations c
    where c.type = 'direct'
      -- Current user is a participant
      and exists (
        select 1 from public.conversation_participants cp1
        where cp1.conversation_id = c.id and cp1.user_id = v_me
      )
      -- Other user is a participant
      and exists (
        select 1 from public.conversation_participants cp2
        where cp2.conversation_id = c.id and cp2.user_id = v_other_user
      )
      -- Exactly 2 participants (ensures it's a direct 1:1 conversation)
      and (
        select count(*) from public.conversation_participants cp
        where cp.conversation_id = c.id
      ) = 2
    limit 1;

    -- If found, return existing conversation
    if v_convo_id is not null then
      return v_convo_id;
    end if;
  end if;

  -- For direct, normalize name empty (UI can show other user's name)
  if p_type = 'direct' and v_name is null then
    v_name := null;
  end if;

  -- Create new conversation (existing behavior)
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
$function$;

-- Add a comment explaining the behavior
COMMENT ON FUNCTION public.create_conversation(uuid[], text, text) IS
'Creates a new conversation or returns existing one for direct messages.
For direct conversations (type=direct, 1 participant), checks if a conversation
already exists between the two users and returns it. This prevents duplicate
direct message conversations.';
