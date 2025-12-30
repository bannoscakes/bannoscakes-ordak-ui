-- Fix auth_rls_initplan warnings: Change auth.uid() to (select auth.uid())
-- This optimization ensures auth.uid() is evaluated once per query instead of per-row
-- Identified by Supabase Performance Advisor (22 policies)

-- ============================================
-- HELPER FUNCTIONS: Optimize auth.uid() calls
-- ============================================

-- current_user_role() - Used by many RLS policies
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM staff_shared
  WHERE user_id = (select auth.uid())
  LIMIT 1;
$$;

-- is_conversation_participant() - Used by messaging RLS policies
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = (select auth.uid())
  );
$$;

-- ============================================
-- breaks table
-- ============================================
DROP POLICY IF EXISTS "breaks_select_policy" ON public.breaks;
CREATE POLICY "breaks_select_policy" ON public.breaks
  FOR SELECT TO authenticated USING (
    (shift_id IN (
      SELECT shifts.id FROM shifts WHERE shifts.staff_id = (select auth.uid())
    ))
    OR (EXISTS (
      SELECT 1 FROM staff_shared
      WHERE staff_shared.user_id = (select auth.uid()) AND staff_shared.role = 'Admin'
    ))
  );

-- ============================================
-- conversation_participants table
-- ============================================
DROP POLICY IF EXISTS "conversation_participants_select_own" ON public.conversation_participants;
CREATE POLICY "conversation_participants_select_own" ON public.conversation_participants
  FOR SELECT TO authenticated USING (
    user_id = (select auth.uid())
    OR is_conversation_participant(conversation_id)
    OR current_user_role() = 'Admin'
  );

DROP POLICY IF EXISTS "participants_delete" ON public.conversation_participants;
CREATE POLICY "participants_delete" ON public.conversation_participants
  FOR DELETE TO public USING (
    EXISTS (
      SELECT 1 FROM conversation_participants p
      WHERE p.conversation_id = conversation_participants.conversation_id
        AND p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "participants_insert" ON public.conversation_participants;
CREATE POLICY "participants_insert" ON public.conversation_participants
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants p
      WHERE p.conversation_id = conversation_participants.conversation_id
        AND p.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "participants_select" ON public.conversation_participants;
CREATE POLICY "participants_select" ON public.conversation_participants
  FOR SELECT TO public USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM conversation_participants p
      WHERE p.conversation_id = conversation_participants.conversation_id
        AND p.user_id = (select auth.uid())
    )
  );

-- ============================================
-- conversations table
-- ============================================
DROP POLICY IF EXISTS "conversations_select_participants" ON public.conversations;
CREATE POLICY "conversations_select_participants" ON public.conversations
  FOR SELECT TO authenticated USING (
    created_by = (select auth.uid())
    OR is_conversation_participant(id)
    OR current_user_role() = 'Admin'
  );

DROP POLICY IF EXISTS "convo_insert" ON public.conversations;
CREATE POLICY "convo_insert" ON public.conversations
  FOR INSERT TO public WITH CHECK (
    created_by = (select auth.uid())
  );

-- Drop duplicate SELECT policy (consolidated into conversations_select_participants above)
DROP POLICY IF EXISTS "convo_select" ON public.conversations;

-- ============================================
-- message_reads table
-- ============================================
DROP POLICY IF EXISTS "message_reads_select_participants" ON public.message_reads;
CREATE POLICY "message_reads_select_participants" ON public.message_reads
  FOR SELECT TO authenticated USING (
    user_id = (select auth.uid())
    OR is_conversation_participant(conversation_id)
    OR current_user_role() = 'Admin'
  );

DROP POLICY IF EXISTS "reads_insert" ON public.message_reads;
CREATE POLICY "reads_insert" ON public.message_reads
  FOR INSERT TO public WITH CHECK (
    user_id = (select auth.uid())
  );

-- Drop duplicate SELECT policy (consolidated into message_reads_select_participants above)
DROP POLICY IF EXISTS "reads_select" ON public.message_reads;

DROP POLICY IF EXISTS "reads_update" ON public.message_reads;
CREATE POLICY "reads_update" ON public.message_reads
  FOR UPDATE TO public USING (
    user_id = (select auth.uid())
  );

-- ============================================
-- messages table
-- ============================================
DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
CREATE POLICY "messages_select_participants" ON public.messages
  FOR SELECT TO authenticated USING (
    sender_id = (select auth.uid())
    OR is_conversation_participant(conversation_id)
    OR current_user_role() = 'Admin'
  );

DROP POLICY IF EXISTS "msg_insert" ON public.messages;
CREATE POLICY "msg_insert" ON public.messages
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants p
      WHERE p.conversation_id = messages.conversation_id
        AND p.user_id = (select auth.uid())
    )
  );

-- Drop duplicate SELECT policy (consolidated into messages_select_participants above)
DROP POLICY IF EXISTS "msg_select" ON public.messages;

-- ============================================
-- orders_bannos table
-- ============================================
DROP POLICY IF EXISTS "orders_select_by_role" ON public.orders_bannos;
CREATE POLICY "orders_select_by_role" ON public.orders_bannos
  FOR SELECT TO authenticated USING (
    current_user_role() IN ('Admin', 'Supervisor')
    OR assignee_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "orders_update_by_role" ON public.orders_bannos;
CREATE POLICY "orders_update_by_role" ON public.orders_bannos
  FOR UPDATE TO authenticated USING (
    current_user_role() IN ('Admin', 'Supervisor')
    OR assignee_id = (select auth.uid())
  );

-- ============================================
-- orders_flourlane table
-- ============================================
DROP POLICY IF EXISTS "orders_select_by_role" ON public.orders_flourlane;
CREATE POLICY "orders_select_by_role" ON public.orders_flourlane
  FOR SELECT TO authenticated USING (
    current_user_role() IN ('Admin', 'Supervisor')
    OR assignee_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "orders_update_by_role" ON public.orders_flourlane;
CREATE POLICY "orders_update_by_role" ON public.orders_flourlane
  FOR UPDATE TO authenticated USING (
    current_user_role() IN ('Admin', 'Supervisor')
    OR assignee_id = (select auth.uid())
  );

-- ============================================
-- shifts table
-- ============================================
DROP POLICY IF EXISTS "shifts_select_policy" ON public.shifts;
CREATE POLICY "shifts_select_policy" ON public.shifts
  FOR SELECT TO authenticated USING (
    staff_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM staff_shared
      WHERE staff_shared.user_id = (select auth.uid()) AND staff_shared.role = 'Admin'
    )
  );

-- ============================================
-- staff_shared table
-- ============================================
DROP POLICY IF EXISTS "staff_select_own_or_admin" ON public.staff_shared;
CREATE POLICY "staff_select_own_or_admin" ON public.staff_shared
  FOR SELECT TO authenticated USING (
    user_id = (select auth.uid())
    OR current_user_role() = 'Admin'
  );

-- Fix users table policy (conditional - table may not exist in preview)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    DROP POLICY IF EXISTS "users_select_own_or_admin" ON public.users;
    CREATE POLICY "users_select_own_or_admin" ON public.users
      FOR SELECT TO authenticated USING (
        id = (select auth.uid()) OR current_user_role() = 'Admin'
      );
  END IF;
END $$;
