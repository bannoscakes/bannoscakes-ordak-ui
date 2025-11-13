-- Recreate demo accounts with proper structure

-- First, clean up any existing demo accounts
DELETE FROM public.staff_shared 
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid
);

DELETE FROM auth.users 
WHERE id IN (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid
);

-- Create demo staff account
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'staff@bannos.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  null,
  null,
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Create demo supervisor account
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'supervisor@bannos.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  null,
  null,
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Create demo admin account
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '33333333-3333-3333-3333-333333333333'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'admin@bannos.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  null,
  null,
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Create staff profiles
INSERT INTO public.staff_shared (
  user_id,
  full_name,
  role,
  store,
  is_active,
  phone,
  email
) VALUES 
(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Demo Staff Member',
  'Staff',
  'bannos',
  true,
  '+1234567890',
  'staff@bannos.com'
),
(
  '22222222-2222-2222-2222-222222222222'::uuid,
  'Demo Supervisor',
  'Supervisor',
  'both',
  true,
  '+1234567891',
  'supervisor@bannos.com'
),
(
  '33333333-3333-3333-3333-333333333333'::uuid,
  'Demo Admin',
  'Admin',
  'both',
  true,
  '+1234567892',
  'admin@bannos.com'
);

-- Verify the accounts were created
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
