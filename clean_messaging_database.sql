-- =============================================
-- CLEAN MESSAGING DATABASE - START FRESH
-- =============================================

-- Drop all messaging-related functions
DROP FUNCTION IF EXISTS public.get_messages CASCADE;
DROP FUNCTION IF EXISTS public.get_messages_temp CASCADE;
DROP FUNCTION IF EXISTS public.get_conversations CASCADE;
DROP FUNCTION IF EXISTS public.send_message CASCADE;
DROP FUNCTION IF EXISTS public.create_conversation CASCADE;
DROP FUNCTION IF EXISTS public.mark_messages_read CASCADE;
DROP FUNCTION IF EXISTS public.get_unread_count CASCADE;
DROP FUNCTION IF EXISTS public.get_conversation_participants CASCADE;
DROP FUNCTION IF EXISTS public.add_participant_to_conversation CASCADE;
DROP FUNCTION IF EXISTS public.remove_participant_from_conversation CASCADE;

-- Drop all messaging-related tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Drop the conversation_type enum
DROP TYPE IF EXISTS public.conversation_type CASCADE;

-- Clean up any remaining messaging-related data
DELETE FROM public.staff_shared WHERE user_id IN (
  SELECT user_id FROM auth.users 
  WHERE email LIKE '%mock%' OR email LIKE '%test%'
);

-- Show what's left
SELECT 'Messaging cleanup completed!' as info;

-- Show remaining tables
SELECT 
  'Remaining tables:' as info,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;

-- Show remaining functions
SELECT 
  'Remaining functions:' as info,
  proname as function_name
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND proname LIKE '%message%' OR proname LIKE '%conversation%'
ORDER BY proname;
