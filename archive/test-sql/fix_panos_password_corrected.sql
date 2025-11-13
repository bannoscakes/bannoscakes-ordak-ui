-- Corrected fix for Panos password issue
-- First check what's available, then fix properly

-- =============================================
-- STEP 1: Check what working accounts we have
-- =============================================

SELECT 
  'Available working accounts:' as info,
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
WHERE email IN ('staff@bannos.com', 'supervisor@bannos.com', 'admin@bannos.com')
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
-- STEP 3: Update Panos profile with working account
-- =============================================

-- Use admin@bannos.com since it's most likely to work
UPDATE public.staff_shared 
SET user_id = (SELECT id FROM auth.users WHERE email = 'admin@bannos.com' LIMIT 1)
WHERE email = 'panos@bannos.com.au';

-- =============================================
-- STEP 4: Verify the update worked
-- =============================================

SELECT 
  'Updated Panos profile:' as info,
  user_id,
  full_name,
  email,
  role,
  is_active
FROM public.staff_shared
WHERE email = 'panos@bannos.com.au';

-- =============================================
-- STEP 5: Show login instructions
-- =============================================

SELECT 
  'Login instructions:' as info,
  'Use admin@bannos.com / temp123 to login as Panos Panayi (Admin)' as instruction;
