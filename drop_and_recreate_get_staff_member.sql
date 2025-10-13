-- Drop and recreate get_staff_member function
-- This fixes the "cannot change return type" error

-- =============================================
-- STEP 1: Drop the existing function
-- =============================================

DROP FUNCTION IF EXISTS public.get_staff_member(uuid) CASCADE;

-- =============================================
-- STEP 2: Create the correct get_staff_member function
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
-- STEP 3: Grant permissions
-- =============================================

GRANT EXECUTE ON FUNCTION public.get_staff_member(uuid) TO authenticated;

-- =============================================
-- STEP 4: Test the function
-- =============================================

-- Test with a sample user ID (this will return empty if no user exists)
SELECT * FROM public.get_staff_member('00000000-0000-0000-0000-000000000000'::uuid);

SELECT 'get_staff_member function recreated successfully!' as status;
