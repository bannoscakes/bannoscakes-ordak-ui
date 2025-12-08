-- Create missing RPC functions for staff management

-- Create get_staff_member function
CREATE OR REPLACE FUNCTION public.get_staff_member(
  p_user_id uuid
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  store text,
  is_active boolean,
  created_at timestamptz,
  last_login timestamptz,
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
    s.created_at,
    s.last_login,
    s.phone,
    s.email
  FROM public.staff_shared s
  WHERE s.user_id = p_user_id;
END;
$$;

-- Create get_staff_me function (simpler version)
CREATE OR REPLACE FUNCTION public.get_staff_me()
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
  WHERE s.user_id = auth.uid();
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_staff_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_me() TO authenticated;

-- Test the functions
SELECT 'get_staff_member function created' as status;
SELECT 'get_staff_me function created' as status;
