-- =============================================
-- VERIFY MESSAGING SETUP
-- Run this after applying the schema and RPC functions
-- =============================================

-- Step 1: Verify tables exist
SELECT 'Tables check:' as step, 
       CASE WHEN COUNT(*) = 3 THEN 'PASS' ELSE 'FAIL' END as status,
       COUNT(*) as found
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'conversation_participants');

-- Step 2: Verify functions exist
SELECT 'Functions check:' as step,
       CASE WHEN COUNT(*) = 3 THEN 'PASS' ELSE 'FAIL' END as status,
       COUNT(*) as found
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND proname IN ('send_message', 'get_messages', 'get_conversations');

-- Step 3: Check real staff members
SELECT 'Staff check:' as step,
       CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status,
       COUNT(*) as staff_count
FROM public.staff_shared;

-- Step 4: Show staff details
SELECT 'Staff details:' as step, 'INFO' as status,
       user_id, full_name, email, role
FROM public.staff_shared
ORDER BY full_name;

-- Step 5: Test function signatures
SELECT 'Function signatures:' as step, 'INFO' as status,
       proname as function_name,
       pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND proname IN ('send_message', 'get_messages', 'get_conversations')
ORDER BY proname;

-- Step 6: Check RLS policies
SELECT 'RLS policies:' as step,
       CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL' END as status,
       COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'messages', 'conversation_participants');

-- Final status
SELECT 'Setup verification complete!' as message;
