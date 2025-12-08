-- ============================================================================
-- Migration: Fix accessories RLS policies
-- Issue: Only Admin users can update accessories due to restrictive RLS
-- Fix: Allow all authenticated users to UPDATE accessories
-- ============================================================================

-- Drop the admin-only policy
DROP POLICY IF EXISTS "accessories_admin_all" ON public.accessories;

-- Create separate policies for each operation (more explicit)

-- INSERT: All authenticated users can insert
DROP POLICY IF EXISTS "accessories_insert" ON public.accessories;
CREATE POLICY "accessories_insert" ON public.accessories
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: All authenticated users can update
DROP POLICY IF EXISTS "accessories_update" ON public.accessories;
CREATE POLICY "accessories_update" ON public.accessories
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: All authenticated users can delete (for future use, currently we soft-delete)
DROP POLICY IF EXISTS "accessories_delete" ON public.accessories;
CREATE POLICY "accessories_delete" ON public.accessories
  FOR DELETE TO authenticated
  USING (true);

-- Ensure grants are in place
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accessories TO authenticated;
