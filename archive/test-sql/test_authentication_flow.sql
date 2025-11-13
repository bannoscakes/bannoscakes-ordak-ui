-- Test authentication flow end-to-end
-- This will help us debug why login is not working

-- =============================================
-- STEP 1: Check if get_staff_member function works
-- =============================================

-- Test the function with a real user ID from your staff_shared table
SELECT 
  'Testing get_staff_member function...' as test_step,
  user_id,
  full_name,
  role,
  store,
  is_active
FROM public.get_staff_member(
  (SELECT user_id FROM public.staff_shared WHERE email = 'staff@bannos.com' LIMIT 1)
);

-- =============================================
-- STEP 2: Check all staff members in staff_shared
-- =============================================

SELECT 
  'All staff members in staff_shared:' as test_step,
  user_id,
  full_name,
  email,
  role,
  store,
  is_active
FROM public.staff_shared
ORDER BY role, full_name;

-- =============================================
-- STEP 3: Check auth.users table
-- =============================================

SELECT 
  'Users in auth.users:' as test_step,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at;

-- =============================================
-- STEP 4: Test function with different user IDs
-- =============================================

-- Test with staff user
SELECT 
  'Testing with staff user:' as test_step,
  user_id,
  full_name,
  role
FROM public.get_staff_member(
  (SELECT id FROM auth.users WHERE email = 'staff@bannos.com' LIMIT 1)
);

-- Test with supervisor user
SELECT 
  'Testing with supervisor user:' as test_step,
  user_id,
  full_name,
  role
FROM public.get_staff_member(
  (SELECT id FROM auth.users WHERE email = 'supervisor@bannos.com' LIMIT 1)
);

-- Test with admin user
SELECT 
  'Testing with admin user:' as test_step,
  user_id,
  full_name,
  role
FROM public.get_staff_member(
  (SELECT id FROM auth.users WHERE email = 'admin@bannos.com' LIMIT 1)
);

SELECT 'Authentication flow test completed!' as status;
