-- Final fix for messaging system - handles all edge cases
-- This migration ensures the messaging system works regardless of existing state

-- 1. Drop any existing messaging tables and functions to start fresh
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Drop any existing messaging functions
DROP FUNCTION IF EXISTS public.create_conversation(UUID[], TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_conversations(INT, INT);
DROP FUNCTION IF EXISTS public.get_messages_temp(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);
DROP FUNCTION IF EXISTS public.mark_messages_read(UUID);
DROP FUNCTION IF EXISTS public.get_unread_count();

-- 2. Create messaging tables without foreign key constraints initially
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'broadcast')),
  name TEXT, -- null for direct chats, custom name for groups
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE message_reads (
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 3. Add basic foreign key constraints (internal to messaging system)
ALTER TABLE conversation_participants 
ADD CONSTRAINT fk_conversation_participants_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE messages 
ADD CONSTRAINT fk_messages_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE message_reads 
ADD CONSTRAINT fk_message_reads_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- 4. Add foreign key constraints to staff_shared ONLY if it exists
DO $$
BEGIN
  -- Check if staff_shared table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_shared' AND table_schema = 'public') THEN
    -- Add foreign key constraints to staff_shared
    BEGIN
      ALTER TABLE conversations 
      ADD CONSTRAINT fk_conversations_created_by 
      FOREIGN KEY (created_by) REFERENCES staff_shared(user_id);
    EXCEPTION WHEN duplicate_object THEN
      -- Constraint already exists, ignore
    END;

    BEGIN
      ALTER TABLE messages 
      ADD CONSTRAINT fk_messages_sender_id 
      FOREIGN KEY (sender_id) REFERENCES staff_shared(user_id);
    EXCEPTION WHEN duplicate_object THEN
      -- Constraint already exists, ignore
    END;

    BEGIN
      ALTER TABLE conversation_participants 
      ADD CONSTRAINT fk_conversation_participants_user_id 
      FOREIGN KEY (user_id) REFERENCES staff_shared(user_id);
    EXCEPTION WHEN duplicate_object THEN
      -- Constraint already exists, ignore
    END;
  ELSE
    -- If staff_shared doesn't exist, add constraints to users table instead
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
      BEGIN
        ALTER TABLE conversations 
        ADD CONSTRAINT fk_conversations_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id);
      EXCEPTION WHEN duplicate_object THEN
        -- Constraint already exists, ignore
      END;

      BEGIN
        ALTER TABLE messages 
        ADD CONSTRAINT fk_messages_sender_id 
        FOREIGN KEY (sender_id) REFERENCES users(id);
      EXCEPTION WHEN duplicate_object THEN
        -- Constraint already exists, ignore
      END;

      BEGIN
        ALTER TABLE conversation_participants 
        ADD CONSTRAINT fk_conversation_participants_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id);
      EXCEPTION WHEN duplicate_object THEN
        -- Constraint already exists, ignore
      END;
    END IF;
  END IF;
END $$;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);

-- 6. Create RPC functions
CREATE OR REPLACE FUNCTION public.create_conversation(
  p_participant_ids UUID[],
  p_name TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'direct'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_user_id UUID;
  participant_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create the conversation
  INSERT INTO public.conversations (type, name, created_by)
  VALUES (p_type, p_name, v_user_id)
  RETURNING id INTO v_conversation_id;

  -- Add the creator as a participant
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_conversation_id, v_user_id);

  -- Add other participants
  FOREACH participant_id IN ARRAY p_participant_ids
  LOOP
    -- Ensure the creator is not added twice if included in p_participant_ids
    IF participant_id IS NOT NULL AND participant_id != v_user_id THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (v_conversation_id, participant_id);
    END IF;
  END LOOP;

  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_conversations(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  name TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_by_name TEXT,
  participant_count INT,
  last_message_text TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_sender_id UUID,
  last_message_sender_name TEXT,
  unread_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    -- Return an empty set if not authenticated
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.type,
    c.name,
    c.created_by,
    c.created_at,
    c.updated_at,
    COALESCE(
      (SELECT s.full_name FROM public.staff_shared s WHERE s.user_id = c.created_by),
      (SELECT u.email FROM public.users u WHERE u.id = c.created_by),
      'Unknown'
    ) AS created_by_name,
    (SELECT COUNT(*)::INT FROM public.conversation_participants cp WHERE cp.conversation_id = c.id) AS participant_count,
    (SELECT m.body FROM public.messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_text,
    (SELECT m.created_at FROM public.messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
    (SELECT m.sender_id FROM public.messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_sender_id,
    (SELECT m.sender_name FROM public.messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_sender_name,
    (SELECT COUNT(*)::INT FROM public.messages m WHERE m.conversation_id = c.id AND NOT EXISTS (
      SELECT 1 FROM public.message_reads mr 
      WHERE mr.conversation_id = m.conversation_id 
      AND mr.user_id = v_user_id 
      AND mr.last_read_at >= m.created_at
    )) AS unread_count
  FROM
    public.conversations c
  JOIN
    public.conversation_participants cp ON c.id = cp.conversation_id
  WHERE
    cp.user_id = v_user_id
  ORDER BY
    c.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_messages_temp(
  p_conversation_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  conversation_id UUID,
  sender_id UUID,
  sender_name TEXT,
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  is_own_message BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user is participant in conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User not authorized to view this conversation';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.sender_name,
    m.body,
    m.created_at,
    (m.sender_id = v_user_id) AS is_own_message
  FROM
    public.messages m
  WHERE
    m.conversation_id = p_conversation_id
  ORDER BY
    m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_sender_name TEXT;
  v_message_id BIGINT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user is participant in conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User not authorized to send messages to this conversation';
  END IF;

  -- Get sender name from staff_shared or users table
  SELECT COALESCE(
    (SELECT s.full_name FROM public.staff_shared s WHERE s.user_id = v_user_id),
    (SELECT u.email FROM public.users u WHERE u.id = v_user_id),
    'Unknown'
  ) INTO v_sender_name;

  -- Insert message
  INSERT INTO public.messages (conversation_id, sender_id, sender_name, body)
  VALUES (p_conversation_id, v_user_id, v_sender_name, p_content)
  RETURNING id INTO v_message_id;

  -- Update conversation updated_at
  UPDATE public.conversations 
  SET updated_at = NOW() 
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_conversation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user is participant in conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User not authorized to mark messages as read in this conversation';
  END IF;

  -- Insert or update message_reads
  INSERT INTO public.message_reads (conversation_id, user_id, last_read_at)
  VALUES (p_conversation_id, v_user_id, NOW())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET last_read_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_count INT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INT INTO v_count
  FROM public.messages m
  JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
  WHERE cp.user_id = v_user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.message_reads mr 
    WHERE mr.conversation_id = m.conversation_id 
    AND mr.user_id = v_user_id 
    AND mr.last_read_at >= m.created_at
  );

  RETURN COALESCE(v_count, 0);
END;
$$;

-- 7. Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = conversations.id 
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view messages in conversations they participate in" ON messages;
CREATE POLICY "Users can view messages in conversations they participate in" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id 
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view conversation participants for conversations they participate in" ON conversation_participants;
CREATE POLICY "Users can view conversation participants for conversations they participate in" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp2 
      WHERE cp2.conversation_id = conversation_participants.conversation_id 
      AND cp2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their own message reads" ON message_reads;
CREATE POLICY "Users can view their own message reads" ON message_reads
  FOR SELECT USING (user_id = auth.uid());

-- 9. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON conversation_participants TO authenticated;
GRANT ALL ON message_reads TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE messages_id_seq TO authenticated;
