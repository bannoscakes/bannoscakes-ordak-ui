-- Simple check for Panos account
-- Run each query separately to see the results

-- Query 1: Check if Panos exists in auth.users
SELECT 
  'auth.users check' as table_name,
  id, 
  email, 
  email_confirmed_at IS NOT NULL as email_confirmed,
  encrypted_password IS NOT NULL as has_password,
  created_at
FROM auth.users
WHERE email = 'panos@bannos.com.au';

-- Query 2: Check if Panos exists in staff_shared
SELECT 
  'staff_shared check' as table_name,
  user_id, 
  full_name, 
  email, 
  role, 
  store, 
  is_active
FROM public.staff_shared
WHERE email = 'panos@bannos.com.au';

-- Query 3: Check all users in auth.users (to see what exists)
SELECT 
  'All auth.users' as table_name,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at
FROM auth.users
ORDER BY created_at;

-- Query 4: Check all users in staff_shared
SELECT 
  'All staff_shared' as table_name,
  email,
  full_name,
  role,
  is_active
FROM public.staff_shared
ORDER BY created_at;
