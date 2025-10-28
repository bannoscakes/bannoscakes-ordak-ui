-- Fix Panos account by creating auth.users entry
-- Your staff_shared profile exists but auth.users is missing

-- =============================================
-- STEP 1: Verify the issue
-- =============================================

-- Check if Panos exists in auth.users (should return empty)
SELECT 
  'auth.users check for Panos:' as status,
  id, 
  email, 
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
WHERE email = 'panos@bannos.com.au';

-- Check if Panos exists in staff_shared (should return data)
SELECT 
  'staff_shared check for Panos:' as status,
  user_id, 
  full_name, 
  email, 
  role, 
  is_active
FROM public.staff_shared
WHERE email = 'panos@bannos.com.au';

-- =============================================
-- STEP 2: SOLUTION - Create auth.users entry
-- =============================================

-- We need to create an auth.users entry with the same user_id
-- This must be done via Supabase Dashboard or auth API
-- SQL cannot directly insert into auth.users due to security restrictions

-- =============================================
-- STEP 3: Instructions for manual fix
-- =============================================

SELECT 
  'MANUAL FIX REQUIRED:' as instruction,
  '1. Go to Supabase Dashboard → Authentication → Users' as step1,
  '2. Click "Add User"' as step2,
  '3. Enter Email: panos@bannos.com.au' as step3,
  '4. Enter Password: temp123' as step4,
  '5. Check "Email Confirmed"' as step5,
  '6. IMPORTANT: Set User ID to: ab27c890-689e-4484-a350-a08c85cb8b9f' as step6,
  '7. Click "Create User"' as step7;

-- =============================================
-- STEP 4: Alternative - Update staff_shared with new user_id
-- =============================================

-- If you can't set the User ID manually, we can update staff_shared instead
-- But this requires getting the new user_id from the created auth.users entry

SELECT 'After creating auth.users entry, run this to verify:' as next_step;
