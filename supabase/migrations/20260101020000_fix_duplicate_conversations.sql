-- Migration: Fix duplicate direct conversations with find-or-create pattern
-- Issue: #582 - Clicking a user in Recipients creates duplicate direct conversations
--
-- Problem: create_conversation always creates a new conversation, even when a
-- direct conversation between the same two users already exists.
--
-- Solution: For direct conversations, check for an existing conversation between
-- the two users before creating a new one. Return the existing conversation ID
-- if found.

-- Add index for efficient type-based queries
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);

-- Add index for participant count subquery performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id
  ON public.conversation_participants(conversation_id);

CREATE OR REPLACE FUNCTION public.create_conversation(p_participants uuid[], p_name text DEFAULT NULL::text, p_type text DEFAULT 'direct'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
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

  if array_length(p_participants, 1) is null then
    raise exception 'At least one participant required';
  end if;

  -- For DIRECT conversations: find existing or create new
  if p_type = 'direct' and array_length(p_participants, 1) = 1 then
    v_other_user := p_participants[1];

    if v_other_user is null then
      raise exception 'Participant cannot be null';
    end if;

    if v_other_user = v_me then
      raise exception 'Cannot create direct conversation with yourself';
    end if;

    -- Acquire advisory lock on the pair of user IDs to prevent race conditions
    -- Uses deterministic key from sorted UUIDs (released at transaction end)
    perform pg_advisory_xact_lock(
      hashtext(least(v_me::text, v_other_user::text) || '|' || greatest(v_me::text, v_other_user::text))
    );

    -- Look for existing direct conversation between these two users
    -- Uses JOIN-based query for better index utilization
    select cp1.conversation_id into v_convo_id
    from public.conversation_participants cp1
    join public.conversation_participants cp2
      on cp1.conversation_id = cp2.conversation_id
    join public.conversations c
      on c.id = cp1.conversation_id
    where cp1.user_id = v_me
      and cp2.user_id = v_other_user
      and c.type = 'direct'
      and (select count(*) from public.conversation_participants where conversation_id = c.id) = 2
    limit 1;

    -- If found, return existing conversation
    if v_convo_id is not null then
      return v_convo_id;
    end if;
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
$function$;

-- Set search_path for security
ALTER FUNCTION public.create_conversation(uuid[], text, text) SET search_path = 'public';

-- Add comment for documentation
COMMENT ON FUNCTION public.create_conversation(uuid[], text, text) IS
  'Creates a conversation or returns existing one. For direct conversations between two users, finds existing conversation if one exists (find-or-create pattern).';
