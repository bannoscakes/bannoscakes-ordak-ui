-- =============================================
-- CHECK CLEAN DATABASE STATUS
-- =============================================

-- Check what tables exist
SELECT 
  'Existing tables:' as info,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;

-- Check what functions exist
SELECT 
  'Existing functions:' as info,
  proname as function_name
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND (proname LIKE '%message%' OR proname LIKE '%conversation%')
ORDER BY proname;

-- Check staff_shared table (should have your real users)
SELECT 
  'Real staff members:' as info,
  COUNT(*) as count
FROM public.staff_shared;

-- Show real staff details
SELECT 
  'Staff details:' as info,
  user_id,
  full_name,
  email,
  role,
  store
FROM public.staff_shared
ORDER BY full_name;

-- Check auth.users (should have your real users)
SELECT 
  'Auth users:' as info,
  COUNT(*) as count
FROM auth.users;

-- Show auth users details
SELECT 
  'Auth user details:' as info,
  id,
  email,
  created_at
FROM auth.users
ORDER BY email;
