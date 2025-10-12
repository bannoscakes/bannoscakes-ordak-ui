-- Create get_staff_member RPC function
-- This function is needed for authentication to work

-- =============================================
-- STEP 1: Create get_staff_member function
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
-- STEP 2: Grant permissions
-- =============================================

GRANT EXECUTE ON FUNCTION public.get_staff_member(uuid) TO authenticated;

-- =============================================
-- STEP 3: Test the function
-- =============================================

-- Get a real user ID to test with
SELECT 'Testing get_staff_member function...' as status;

-- Test with a real user ID (replace with actual user ID from auth.users)
-- SELECT * FROM get_staff_member('REPLACE_WITH_ACTUAL_USER_ID');

SELECT 'get_staff_member function created successfully!' as result;
