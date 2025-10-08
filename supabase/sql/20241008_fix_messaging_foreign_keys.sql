-- Fix missing foreign key constraints in messaging tables
-- This migration adds the missing foreign key constraints that should have been
-- created with the original messaging schema but were missing

-- Add foreign key constraint for conversations.created_by -> staff_shared.user_id
ALTER TABLE conversations 
ADD CONSTRAINT fk_conversations_created_by 
FOREIGN KEY (created_by) REFERENCES staff_shared(user_id);

-- Add foreign key constraint for messages.sender_id -> staff_shared.user_id  
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_sender_id 
FOREIGN KEY (sender_id) REFERENCES staff_shared(user_id);

-- Add foreign key constraint for conversation_participants.user_id -> staff_shared.user_id
ALTER TABLE conversation_participants 
ADD CONSTRAINT fk_conversation_participants_user_id 
FOREIGN KEY (user_id) REFERENCES staff_shared(user_id);

-- Verify the constraints were added
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('conversations', 'messages', 'conversation_participants')
ORDER BY tc.table_name, kcu.column_name;
