-- Migration: Add soft delete RPCs for accessories and cake_toppers
-- Fixes: Issue #517 - Replace direct table writes with SECURITY DEFINER RPCs

CREATE OR REPLACE FUNCTION public.soft_delete_accessory(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.accessories SET is_active = false WHERE id = p_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_accessory(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.soft_delete_cake_topper(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.cake_toppers SET is_active = false WHERE id = p_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_cake_topper(uuid) TO authenticated;
