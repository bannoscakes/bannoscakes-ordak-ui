-- Check if get_staff_member RPC function exists and works
-- Run this to debug the authentication issue

-- =============================================
-- STEP 1: Check if get_staff_member function exists
-- =============================================

SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_staff_member';

-- =============================================
-- STEP 2: Test get_staff_member with a real user ID
-- =============================================

-- Get a real user ID from auth.users
SELECT 
  id,
  email
FROM auth.users 
WHERE email IN (
  'panos@bannos.com.au',
  'maria.angelaa4303@gmail.com',
  'josephsaliba533@gmail.com'
)
LIMIT 1;

-- =============================================
-- STEP 3: Test the function if it exists
-- =============================================

-- This will only work if the function exists and we have a user ID
-- Replace 'USER_ID_HERE' with an actual user ID from step 2
-- SELECT * FROM get_staff_member('USER_ID_HERE');

-- =============================================
-- STEP 4: Check staff_shared table structure
-- =============================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'staff_shared' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
