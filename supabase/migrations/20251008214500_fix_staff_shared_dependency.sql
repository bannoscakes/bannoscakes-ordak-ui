-- Idempotent migration to ensure staff_shared exists and messaging tables reference it correctly
-- This migration works regardless of execution order and fixes the dependency issue

-- 1) Ensure staff_shared table exists (in preview and fresh DBs)
CREATE TABLE IF NOT EXISTS public.staff_shared (
  user_id UUID PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'Staff' CHECK (role IN ('Admin', 'Supervisor', 'Staff')),
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  store TEXT DEFAULT 'both' CHECK (store IN ('bannos', 'flourlane', 'both'))
);

-- 2) Ensure conversations table exists (if another migration already created it, this is a no-op)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'broadcast')),
  name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Ensure messages table exists
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Ensure conversation_participants table exists
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 5) Ensure message_reads table exists
CREATE TABLE IF NOT EXISTS public.message_reads (
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 6) Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- conversations.created_by -> staff_shared.user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_created_by_fkey'
      AND conrelid = 'public.conversations'::regclass
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.staff_shared(user_id);
  END IF;

  -- messages.conversation_id -> conversations.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_conversation_id_fkey'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
  END IF;

  -- messages.sender_id -> staff_shared.user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_sender_id_fkey'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_sender_id_fkey
      FOREIGN KEY (sender_id) REFERENCES public.staff_shared(user_id);
  END IF;

  -- conversation_participants.conversation_id -> conversations.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversation_participants_conversation_id_fkey'
      AND conrelid = 'public.conversation_participants'::regclass
  ) THEN
    ALTER TABLE public.conversation_participants
      ADD CONSTRAINT conversation_participants_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
  END IF;

  -- conversation_participants.user_id -> staff_shared.user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversation_participants_user_id_fkey'
      AND conrelid = 'public.conversation_participants'::regclass
  ) THEN
    ALTER TABLE public.conversation_participants
      ADD CONSTRAINT conversation_participants_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.staff_shared(user_id);
  END IF;

  -- message_reads.conversation_id -> conversations.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_reads_conversation_id_fkey'
      AND conrelid = 'public.message_reads'::regclass
  ) THEN
    ALTER TABLE public.message_reads
      ADD CONSTRAINT message_reads_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
  END IF;

  -- message_reads.user_id -> staff_shared.user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_reads_user_id_fkey'
      AND conrelid = 'public.message_reads'::regclass
  ) THEN
    ALTER TABLE public.message_reads
      ADD CONSTRAINT message_reads_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.staff_shared(user_id);
  END IF;
END $$;

-- 7) Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON public.message_reads(user_id);

-- 8) Remove duplicate create_conversation function with text[] signature (causes ambiguity)
DROP FUNCTION IF EXISTS public.create_conversation(text[], text, text);

-- 9) Add tables to realtime publication
DO $$
BEGIN
  -- Check if publication exists, create if not
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add tables to publication (idempotent in Postgres 15+)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.staff_shared;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.conversation_participants;
