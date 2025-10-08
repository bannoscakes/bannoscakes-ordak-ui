-- Check Panos account status in detail
-- This will show the exact state of your account

SELECT 
  'Panos account status:' as check_type,
  id,
  email,
  aud,
  role,
  email_confirmed_at,
  email_confirmed_at IS NOT NULL as is_email_confirmed,
  encrypted_password IS NOT NULL as has_password,
  last_sign_in_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
FROM auth.users
WHERE email = 'panos@bannos.com.au';

-- Also check if there are any issues with the account
SELECT 
  'Account validation:' as check_type,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'EMAIL NOT CONFIRMED'
    WHEN encrypted_password IS NULL THEN 'NO PASSWORD SET'
    WHEN aud != 'authenticated' THEN 'ACCOUNT NOT AUTHENTICATED'
    ELSE 'ACCOUNT LOOKS GOOD'
  END as status
FROM auth.users
WHERE email = 'panos@bannos.com.au';
