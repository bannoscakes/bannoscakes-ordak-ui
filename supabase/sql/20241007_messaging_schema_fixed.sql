-- Messaging System Tables - FIXED VERSION
-- Supports: individual chats, custom groups, broadcasts
-- Uses staff_shared table (not staff)

CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('individual', 'group', 'broadcast')),
  name TEXT, -- null for individual chats, custom name for groups
  created_by UUID NOT NULL REFERENCES staff_shared(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES staff_shared(user_id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_by JSONB DEFAULT '{}' -- track read receipts
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES staff_shared(user_id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, participant_id)
);

-- Indexes for performance
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_participants_participant_id ON conversation_participants(participant_id);

-- Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;  
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies (participants can see their conversations/messages)
CREATE POLICY "Users can see their conversations" ON conversations
  FOR SELECT USING (
    id IN (SELECT conversation_id FROM conversation_participants WHERE participant_id = auth.uid())
  );

CREATE POLICY "Users can see messages in their conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE participant_id = auth.uid())
  );

CREATE POLICY "Users can see conversation participants" ON conversation_participants
  FOR SELECT USING (participant_id = auth.uid() OR conversation_id IN (
    SELECT conversation_id FROM conversation_participants WHERE participant_id = auth.uid()
  ));
