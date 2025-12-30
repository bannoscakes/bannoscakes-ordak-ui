-- Migration: Add soft delete RPCs for accessories and cake_toppers
-- Fixes: Issue #517 - Replace direct table writes with SECURITY DEFINER RPCs

CREATE OR REPLACE FUNCTION public.soft_delete_accessory(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only Admin users can delete accessories
  IF NOT EXISTS (
    SELECT 1 FROM staff_shared
    WHERE user_id = auth.uid() AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only Admin can delete accessories';
  END IF;

  UPDATE accessories SET is_active = false WHERE id = p_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_accessory(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.soft_delete_cake_topper(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only Admin users can delete cake toppers
  IF NOT EXISTS (
    SELECT 1 FROM staff_shared
    WHERE user_id = auth.uid() AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only Admin can delete cake toppers';
  END IF;

  UPDATE cake_toppers SET is_active = false WHERE id = p_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_cake_topper(uuid) TO authenticated;
