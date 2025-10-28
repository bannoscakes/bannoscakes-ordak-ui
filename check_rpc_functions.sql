-- Check available RPC functions for staff management

-- List all functions in public schema
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%staff%'
ORDER BY routine_name;

-- Check if get_staff_member function exists
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_staff_member';

-- Check if get_staff_me function exists (alternative)
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_staff_me';
