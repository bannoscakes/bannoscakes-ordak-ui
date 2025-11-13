-- Clean up mock staff accounts
-- Remove the remaining mock accounts from staff_shared table

-- =============================================
-- STEP 1: Check what accounts exist
-- =============================================

SELECT 
  full_name,
  email,
  role,
  store,
  is_active
FROM public.staff_shared 
ORDER BY full_name;

-- =============================================
-- STEP 2: Remove mock accounts
-- =============================================

-- Remove mock accounts that shouldn't be there
DELETE FROM public.staff_shared 
WHERE email IN (
  'david.k@flourlane.com',
  'emma.thompson@bannos.com',
  'marcus.rodriguez@bannos.com',
  'sarah.chen@flourlane.com'
) OR full_name IN (
  'David Kim',
  'Emma Thompson', 
  'Marcus Rodriguez',
  'Sarah Chen'
);

-- =============================================
-- STEP 3: Verify only real accounts remain
-- =============================================

SELECT 
  full_name,
  email,
  role,
  store,
  is_active
FROM public.staff_shared 
ORDER BY 
  CASE role 
    WHEN 'Admin' THEN 1
    WHEN 'Supervisor' THEN 2
    WHEN 'Staff' THEN 3
  END,
  full_name;

-- =============================================
-- STEP 4: Count accounts by role
-- =============================================

SELECT 
  role,
  COUNT(*) as count
FROM public.staff_shared 
WHERE is_active = true
GROUP BY role
ORDER BY 
  CASE role 
    WHEN 'Admin' THEN 1
    WHEN 'Supervisor' THEN 2
    WHEN 'Staff' THEN 3
  END;

SELECT 'Mock accounts cleaned up successfully!' as status;
