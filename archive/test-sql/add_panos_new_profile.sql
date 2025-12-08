-- Add Panos new profile to staff_shared with correct store value
-- First check what store values are used, then add your profile

-- =============================================
-- STEP 1: Check what store values are used by other staff
-- =============================================

SELECT DISTINCT 
  'Existing store values:' as info,
  store 
FROM public.staff_shared
WHERE store IS NOT NULL;

-- =============================================
-- STEP 2: Add your new profile to staff_shared
-- =============================================

INSERT INTO public.staff_shared (
  user_id, 
  email, 
  full_name, 
  role, 
  store,
  is_active,
  phone
)
VALUES (
  'ccb70029-5193-4af9-9b83-07d237050e7d'::uuid,
  'panos@bannos.com.au',
  'Panos Panayi',
  'Admin',
  'both',  -- Using 'both' since you're Admin and can access both stores
  true,
  null
)
ON CONFLICT (user_id) DO UPDATE 
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    store = EXCLUDED.store,
    is_active = EXCLUDED.is_active,
    phone = EXCLUDED.phone,
    updated_at = now();

-- =============================================
-- STEP 3: Verify your profile was added correctly
-- =============================================

SELECT 
  'Your new profile:' as info,
  user_id,
  email,
  full_name,
  role,
  store,
  is_active
FROM public.staff_shared
WHERE email = 'panos@bannos.com.au';

-- =============================================
-- STEP 4: Test the get_staff_member function
-- =============================================

SELECT 
  'Testing get_staff_member function:' as info,
  user_id,
  full_name,
  role,
  store,
  is_active
FROM public.get_staff_member('ccb70029-5193-4af9-9b83-07d237050e7d'::uuid);

SELECT 'Panos profile added successfully! You can now login with your new account.' as result;
