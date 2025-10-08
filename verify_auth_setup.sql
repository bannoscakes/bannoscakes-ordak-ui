-- Verify authentication setup
-- Check if staff_shared table exists and has correct structure

-- 1. Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'staff_shared' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if demo accounts exist
SELECT 
  u.email,
  s.full_name,
  s.role,
  s.store,
  s.is_active
FROM auth.users u
JOIN public.staff_shared s ON u.id = s.user_id
WHERE u.email IN ('staff@bannos.com', 'supervisor@bannos.com', 'admin@bannos.com')
ORDER BY s.role;

-- 3. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'staff_shared';

-- 4. Test get_staff_member function
SELECT * FROM public.get_staff_member('11111111-1111-1111-1111-111111111111'::uuid);

-- 5. Test check_user_role function
SELECT public.check_user_role('Staff', '11111111-1111-1111-1111-111111111111'::uuid) as staff_role_check;
SELECT public.check_user_role('Supervisor', '22222222-2222-2222-2222-222222222222'::uuid) as supervisor_role_check;
SELECT public.check_user_role('Admin', '33333333-3333-3333-3333-333333333333'::uuid) as admin_role_check;
