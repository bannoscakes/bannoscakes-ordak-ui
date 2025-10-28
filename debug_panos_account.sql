-- Debug Panos account login issue
-- Check why panos@bannos.com.au can't login while staff accounts work

-- =============================================
-- STEP 1: Check if Panos exists in auth.users
-- =============================================

SELECT 
  'Checking auth.users for panos@bannos.com.au:' as step,
  id, 
  email, 
  aud, 
  role, 
  email_confirmed_at, 
  last_sign_in_at, 
  created_at, 
  updated_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE email = 'panos@bannos.com.au';

-- =============================================
-- STEP 2: Check if Panos exists in staff_shared
-- =============================================

SELECT 
  'Checking staff_shared for panos@bannos.com.au:' as step,
  user_id, 
  full_name, 
  email, 
  role, 
  store, 
  is_active, 
  created_at, 
  updated_at
FROM public.staff_shared
WHERE email = 'panos@bannos.com.au';

-- =============================================
-- STEP 3: Check if user_id matches between tables
-- =============================================

SELECT 
  'Checking user_id match between tables:' as step,
  au.id as auth_user_id,
  ss.user_id as staff_user_id,
  au.email as auth_email,
  ss.email as staff_email,
  CASE 
    WHEN au.id = ss.user_id THEN 'MATCH' 
    ELSE 'MISMATCH' 
  END as id_match
FROM auth.users au
FULL OUTER JOIN public.staff_shared ss ON au.email = ss.email
WHERE au.email = 'panos@bannos.com.au' OR ss.email = 'panos@bannos.com.au';

-- =============================================
-- STEP 4: Test get_staff_member function with Panos user ID
-- =============================================

SELECT 
  'Testing get_staff_member for Panos:' as step,
  user_id, 
  full_name, 
  role, 
  store, 
  is_active, 
  phone, 
  email
FROM public.get_staff_member(
  (SELECT id FROM auth.users WHERE email = 'panos@bannos.com.au' LIMIT 1)
);

-- =============================================
-- STEP 5: Compare with working staff account
-- =============================================

SELECT 
  'Comparing with working staff account:' as step,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  ss.is_active,
  ss.role
FROM auth.users au
LEFT JOIN public.staff_shared ss ON au.id = ss.user_id
WHERE au.email IN ('panos@bannos.com.au', 'staff@bannos.com')
ORDER BY au.email;

SELECT 'Panos account debug completed!' as status;
