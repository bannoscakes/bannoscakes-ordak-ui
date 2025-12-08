-- =============================================
-- TEST SIMPLE MESSAGING FUNCTIONS
-- =============================================

-- First, let's check what real staff we have
SELECT 'Real staff members:' as info, COUNT(*) as count FROM public.staff_shared;

-- Show real staff details
SELECT 
  'Staff details:' as info,
  user_id,
  full_name,
  email,
  role
FROM public.staff_shared
ORDER BY full_name;

-- Check if messaging tables exist
SELECT 'Messaging tables:' as info, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'conversation_participants')
ORDER BY table_name;

-- Check if our functions exist
SELECT 'Messaging functions:' as info, proname as function_name
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND proname IN ('send_message', 'get_messages', 'get_conversations')
ORDER BY proname;

-- Test: Create a simple conversation between first 2 staff members
-- (This will only work if you're logged in as one of the real staff)
DO $$
DECLARE
  v_conv_id UUID;
  v_staff1 UUID;
  v_staff2 UUID;
BEGIN
  -- Get first two staff members
  SELECT user_id INTO v_staff1 FROM public.staff_shared ORDER BY full_name LIMIT 1;
  SELECT user_id INTO v_staff2 FROM public.staff_shared ORDER BY full_name OFFSET 1 LIMIT 1;
  
  IF v_staff1 IS NOT NULL AND v_staff2 IS NOT NULL THEN
    -- Create conversation
    INSERT INTO public.conversations (type, name, created_by)
    VALUES ('individual', 'Test Conversation', v_staff1)
    RETURNING id INTO v_conv_id;
    
    -- Add participants
    INSERT INTO public.conversation_participants (conversation_id, participant_id)
    VALUES (v_conv_id, v_staff1), (v_conv_id, v_staff2);
    
    RAISE NOTICE 'Created test conversation: %', v_conv_id;
  ELSE
    RAISE NOTICE 'No staff members found for test';
  END IF;
END $$;

-- Show test conversation
SELECT 'Test conversation created:' as info, id, type, name, created_by 
FROM public.conversations 
WHERE name = 'Test Conversation';
