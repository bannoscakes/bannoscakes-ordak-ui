-- Fix: Change get_staff_with_shift_status to SECURITY DEFINER
-- Ensures all users see the full staff list regardless of RLS on staff_shared
-- Matches the pattern used by get_staff_order_counts

CREATE OR REPLACE FUNCTION public.get_staff_with_shift_status()
RETURNS TABLE(
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT DISTINCT ON (st.user_id)
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
    ORDER BY st.user_id
  ) deduplicated
  ORDER BY
    CASE shift_status
      WHEN 'On Shift' THEN 1
      WHEN 'On Break' THEN 2
      ELSE 3
    END,
    full_name;
$$;

-- Keep existing grant
GRANT EXECUTE ON FUNCTION public.get_staff_with_shift_status() TO authenticated;
