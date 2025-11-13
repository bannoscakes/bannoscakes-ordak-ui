-- Update staff_shared with real user IDs from auth.users
-- Run this after creating all auth users

-- =============================================
-- STEP 1: Get the real user IDs from auth.users
-- =============================================

-- First, let's see what user IDs we have in auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE email IN (
  'panos@bannos.com.au',
  'info@flourlane.com.au',
  'josephsaliba533@gmail.com',
  'gabriella.fimmano@gmail.com',
  'maria.angelaa4303@gmail.com',
  'sandipbk75@gmail.com',
  'fatemehsatvati7068@gmail.com',
  'ellie_henson@outlook.com',
  'ximena.mosquera9311@gmail.com'
)
ORDER BY created_at;

-- =============================================
-- STEP 2: Update staff_shared with real user IDs
-- =============================================

-- Update Panos Panayi
UPDATE public.staff_shared 
SET user_id = (SELECT id FROM auth.users WHERE email = 'panos@bannos.com.au')
WHERE email = 'panos@bannos.com.au';

-- Update Theresa Panayi
UPDATE public.staff_shared 
SET user_id = (SELECT id FROM auth.users WHERE email = 'info@flourlane.com.au')
WHERE email = 'info@flourlane.com.au';

-- Update Joseph Saliba
UPDATE public.staff_shared 
SET user_id = (SELECT id FROM auth.users WHERE email = 'josephsaliba533@gmail.com')
WHERE email = 'josephsaliba533@gmail.com';

-- Update Gabriella Fimmano
UPDATE public.staff_shared 
SET user_id = (SELECT id FROM auth.users WHERE email = 'gabriella.fimmano@gmail.com')
WHERE email = 'gabriella.fimmano@gmail.com';

-- Update Maria-Angela Amodeo
UPDATE public.staff_shared 
SET user_id = (SELECT id FROM auth.users WHERE email = 'maria.angelaa4303@gmail.com')
WHERE email = 'maria.angelaa4303@gmail.com';

-- Update Sandip BK
UPDATE public.staff_shared 
SET user_id = (SELECT id FROM auth.users WHERE email = 'sandipbk75@gmail.com')
WHERE email = 'sandipbk75@gmail.com';

-- Update Fatemeh Satvati
UPDATE public.staff_shared 
SET user_id = (SELECT id FROM auth.users WHERE email = 'fatemehsatvati7068@gmail.com')
WHERE email = 'fatemehsatvati7068@gmail.com';

-- Update Ellie Henson
UPDATE public.staff_shared 
SET user_id = (SELECT id FROM auth.users WHERE email = 'ellie_henson@outlook.com')
WHERE email = 'ellie_henson@outlook.com';

-- Update Ximena Alexandra Mosquera
UPDATE public.staff_shared 
SET user_id = (SELECT id FROM auth.users WHERE email = 'ximena.mosquera9311@gmail.com')
WHERE email = 'ximena.mosquera9311@gmail.com';

-- =============================================
-- STEP 3: Verify the updates
-- =============================================

SELECT 
  s.full_name,
  s.email,
  s.role,
  s.store,
  s.user_id,
  CASE 
    WHEN s.user_id = '00000000-0000-0000-0000-000000000001' THEN '❌ Still using placeholder ID'
    WHEN s.user_id IS NULL THEN '❌ No user_id'
    ELSE '✅ Real user_id'
  END as status
FROM public.staff_shared s
ORDER BY 
  CASE s.role 
    WHEN 'Admin' THEN 1
    WHEN 'Supervisor' THEN 2
    WHEN 'Staff' THEN 3
  END,
  s.full_name;

-- =============================================
-- STEP 4: Test authentication
-- =============================================

SELECT 'Real user accounts setup completed!' as status;
SELECT 'All users can now log in with their email and TempPass123!' as login_info;
SELECT 'Next step: Test login in the application' as next_step;
