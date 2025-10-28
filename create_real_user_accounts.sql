-- Create Real User Accounts
-- This script creates all real user accounts and removes mock data

-- =============================================
-- STEP 1: Clean up existing mock data
-- =============================================

-- Remove existing demo accounts from staff_shared
DELETE FROM public.staff_shared WHERE email IN (
  'staff@bannos.com',
  'supervisor@bannos.com', 
  'admin@bannos.com'
);

-- =============================================
-- STEP 2: Create real user accounts in auth.users
-- =============================================

-- Note: We can't directly insert into auth.users via SQL
-- These will need to be created through Supabase Auth API or Dashboard
-- For now, we'll create the staff_shared records and provide instructions

-- =============================================
-- STEP 3: Create staff profiles in staff_shared
-- =============================================

-- Admin accounts (both stores)
INSERT INTO public.staff_shared (user_id, full_name, email, role, store, is_active, phone, created_at, updated_at) VALUES
-- Panos Panayi - Admin/Owner
('00000000-0000-0000-0000-000000000001', 'Panos Panayi', 'panos@bannos.com.au', 'Admin', 'both', true, NULL, now(), now()),

-- Theresa Panayi - Admin  
('00000000-0000-0000-0000-000000000002', 'Theresa Panayi', 'info@flourlane.com.au', 'Admin', 'both', true, NULL, now(), now()),

-- Supervisors
('00000000-0000-0000-0000-000000000003', 'Joseph Saliba', 'josephsaliba533@gmail.com', 'Supervisor', 'both', true, NULL, now(), now()),
('00000000-0000-0000-0000-000000000004', 'Gabriella Fimmano', 'gabriella.fimmano@gmail.com', 'Supervisor', 'both', true, NULL, now(), now()),

-- Staff members
('00000000-0000-0000-0000-000000000005', 'Maria-Angela Amodeo', 'maria.angelaa4303@gmail.com', 'Staff', 'both', true, NULL, now(), now()),
('00000000-0000-0000-0000-000000000006', 'Sandip BK', 'sandipbk75@gmail.com', 'Staff', 'both', true, NULL, now(), now()),
('00000000-0000-0000-0000-000000000007', 'Fatemeh Satvati', 'fatemehsatvati7068@gmail.com', 'Staff', 'both', true, NULL, now(), now()),
('00000000-0000-0000-0000-000000000008', 'Ellie Henson', 'ellie_henson@outlook.com', 'Staff', 'both', true, NULL, now(), now()),
('00000000-0000-0000-0000-000000000009', 'Ximena Alexandra Mosquera', 'ximena.mosquera9311@gmail.com', 'Staff', 'both', true, NULL, now(), now());

-- =============================================
-- STEP 4: Verify the accounts were created
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
-- STEP 5: Create a temporary password for all accounts
-- =============================================

-- Temporary password: "TempPass123!"
-- This will be used for initial testing
-- Users will be asked to change their passwords later

SELECT 'Real user accounts created successfully!' as status;
SELECT 'Temporary password for all accounts: TempPass123!' as temp_password;
SELECT 'Next step: Create auth.users accounts in Supabase Dashboard' as next_step;
