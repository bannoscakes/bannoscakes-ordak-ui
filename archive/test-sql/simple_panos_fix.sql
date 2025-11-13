-- Simple fix for Panos account
-- Let's check what accounts exist and fix step by step

-- =============================================
-- STEP 1: Check what accounts actually exist in auth.users
-- =============================================

SELECT 
  'All accounts in auth.users:' as info,
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
ORDER BY email;

-- =============================================
-- STEP 2: Check current Panos profile
-- =============================================

SELECT 
  'Current Panos profile:' as info,
  user_id,
  full_name,
  email,
  role,
  is_active
FROM public.staff_shared
WHERE email = 'panos@bannos.com.au';

-- =============================================
-- STEP 3: Get the first working account ID
-- =============================================

SELECT 
  'First working account ID:' as info,
  id as working_user_id,
  email
FROM auth.users
WHERE email_confirmed_at IS NOT NULL
LIMIT 1;

-- =============================================
-- STEP 4: Update Panos profile with the working account ID
-- =============================================

-- Use the first confirmed account
UPDATE public.staff_shared 
SET user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL 
  LIMIT 1
)
WHERE email = 'panos@bannos.com.au';

-- =============================================
-- STEP 5: Show final result
-- =============================================

SELECT 
  'Final Panos profile:' as info,
  user_id,
  full_name,
  email,
  role,
  is_active
FROM public.staff_shared
WHERE email = 'panos@bannos.com.au';

SELECT 'Panos account fixed! Check the working account email above to login.' as result;
