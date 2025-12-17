-- RPC function to get all active staff with their current shift status
-- Returns: staff info + shift_status (On Shift, On Break, Off Shift) + current store

CREATE OR REPLACE FUNCTION public.get_staff_with_shift_status()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  email text,
  phone text,
  store text,
  is_active boolean,
  shift_status text,
  shift_store text,
  shift_start timestamptz
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT
    st.user_id,
    st.full_name,
    st.role,
    st.email,
    st.phone,
    st.store,
    st.is_active,
    CASE
      WHEN s.id IS NULL THEN 'Off Shift'
      WHEN b.id IS NOT NULL THEN 'On Break'
      ELSE 'On Shift'
    END as shift_status,
    s.store as shift_store,
    s.start_ts as shift_start
  FROM public.staff_shared st
  LEFT JOIN public.shifts s ON s.staff_id = st.user_id AND s.end_ts IS NULL
  LEFT JOIN public.breaks b ON b.shift_id = s.id AND b.end_ts IS NULL
  WHERE st.is_active = true
  ORDER BY
    CASE
      WHEN s.id IS NOT NULL AND b.id IS NULL THEN 1  -- On Shift first
      WHEN b.id IS NOT NULL THEN 2                    -- On Break second
      ELSE 3                                          -- Off Shift last
    END,
    st.full_name;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_staff_with_shift_status() TO authenticated;
