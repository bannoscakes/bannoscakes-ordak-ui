-- Check if get_staff_member function exists
-- This is the missing piece for authentication

-- =============================================
-- STEP 1: Check if get_staff_member function exists
-- =============================================

SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_staff_member';

-- =============================================
-- STEP 2: Check function parameters
-- =============================================

SELECT 
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters 
WHERE specific_schema = 'public' 
  AND specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name = 'get_staff_member'
  )
ORDER BY ordinal_position;

-- =============================================
-- STEP 3: Test the function if it exists
-- =============================================

-- This will only work if the function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name = 'get_staff_member'
  ) THEN
    RAISE NOTICE 'get_staff_member function EXISTS - testing it...';
    -- Test with a sample user ID (this will fail if no user is authenticated)
    PERFORM public.get_staff_member('00000000-0000-0000-0000-000000000000'::uuid);
    RAISE NOTICE 'get_staff_member function test completed';
  ELSE
    RAISE NOTICE 'get_staff_member function DOES NOT EXIST - this is the problem!';
  END IF;
END $$;

SELECT 'Function check completed!' as status;
