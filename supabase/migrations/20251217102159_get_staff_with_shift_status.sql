-- Partial unique index to ensure at most one active break per shift
-- This prevents duplicate rows from the LEFT JOIN in the RPC
CREATE UNIQUE INDEX IF NOT EXISTS idx_breaks_one_active_per_shift
ON public.breaks (shift_id)
WHERE end_ts IS NULL;

-- RPC function to get all active staff with their current shift status
-- Returns: staff info + shift_status (On Shift, On Break, Off Shift) + current store
-- Uses DISTINCT ON as safeguard against duplicates until index is deployed

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_staff_with_shift_status() TO authenticated;
