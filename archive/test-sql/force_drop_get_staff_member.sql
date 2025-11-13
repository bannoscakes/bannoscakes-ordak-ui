-- Force drop get_staff_member function with all possible signatures
-- This handles the "cannot change return type" error

-- =============================================
-- STEP 1: Check what get_staff_member functions exist
-- =============================================

SELECT 
  routine_name,
  specific_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_staff_member';

-- =============================================
-- STEP 2: Drop ALL versions of get_staff_member function
-- =============================================

-- Drop with CASCADE to remove all dependencies
DROP FUNCTION IF EXISTS public.get_staff_member CASCADE;

-- Also try dropping with specific parameter types
DROP FUNCTION IF EXISTS public.get_staff_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_staff_member(text) CASCADE;

-- =============================================
-- STEP 3: Verify the function is completely gone
-- =============================================

SELECT 
  routine_name,
  specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_staff_member';

-- =============================================
-- STEP 4: Create the correct get_staff_member function
-- =============================================

CREATE OR REPLACE FUNCTION public.get_staff_member(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  store text,
  is_active boolean,
  phone text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user_id is provided
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Return staff member data
  RETURN QUERY
  SELECT
    s.user_id,
    s.full_name,
    s.role,
    s.store,
    s.is_active,
    s.phone,
    s.email
  FROM public.staff_shared s
  WHERE s.user_id = p_user_id
    AND s.is_active = true;
END;
$$;

-- =============================================
-- STEP 5: Grant permissions
-- =============================================

GRANT EXECUTE ON FUNCTION public.get_staff_member(uuid) TO authenticated;

-- =============================================
-- STEP 6: Test the function
-- =============================================

-- Test with a sample user ID
SELECT * FROM public.get_staff_member('00000000-0000-0000-0000-000000000000'::uuid);

SELECT 'get_staff_member function force-recreated successfully!' as status;
