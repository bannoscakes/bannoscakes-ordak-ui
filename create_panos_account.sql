-- Create Panos account if it doesn't exist
-- This will create both auth.users and staff_shared entries

-- =============================================
-- STEP 1: Create auth.users entry for Panos
-- =============================================

-- Note: We can't directly insert into auth.users via SQL
-- This needs to be done through Supabase Dashboard or auth API
-- But we can check if it exists and prepare the staff_shared entry

-- =============================================
-- STEP 2: Check if we need to create staff_shared entry
-- =============================================

-- First, let's see if Panos exists in staff_shared
SELECT 
  'Current staff_shared status for Panos:' as status,
  user_id, 
  full_name, 
  email, 
  role, 
  store, 
  is_active
FROM public.staff_shared
WHERE email = 'panos@bannos.com.au';

-- =============================================
-- STEP 3: If Panos doesn't exist, we need to:
-- 1. Create auth.users account via Supabase Dashboard
-- 2. Then create staff_shared entry with the correct user_id
-- =============================================

SELECT 'Run this script to check Panos account status' as instruction;
