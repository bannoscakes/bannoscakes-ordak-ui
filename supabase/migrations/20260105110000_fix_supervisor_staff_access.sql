-- Fix: Allow Supervisors to see all staff (not just themselves)
-- Previously only Admins could see all staff, Supervisors saw only their own record

DROP POLICY IF EXISTS "staff_select_own_or_admin" ON public.staff_shared;

CREATE POLICY "staff_select_own_or_admin_supervisor" ON public.staff_shared
  FOR SELECT TO authenticated USING (
    user_id = (SELECT auth.uid())
    OR current_user_role() IN ('Admin', 'Supervisor')
  );

COMMENT ON POLICY "staff_select_own_or_admin_supervisor" ON public.staff_shared IS
  'Users see own record, Admin and Supervisor see all staff';
