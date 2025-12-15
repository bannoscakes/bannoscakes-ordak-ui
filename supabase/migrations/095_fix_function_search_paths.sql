-- Fix security issue: Pin search_path to 'public' for all public functions
-- This prevents search_path hijacking attacks while still allowing
-- functions to resolve unqualified table references in the public schema.
-- See: https://supabase.com/docs/guides/database/database-linter#function-search-path-mutable

-- Use a DO block to safely alter functions only if they exist
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Loop through all functions in public schema that need search_path set
  FOR r IN
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'alpha_suffix', 'app_is_service_role', 'assign_staff', 'admin_delete_order',
      'app_can_access_store', 'app_role', 'add_participant', 'auth_email',
      'is_cake_item', 'mark_messages_read', 'ingest_order', 'get_printing_settings',
      'delete_bom', 'complete_packing', '_order_lock', 'complete_decorating',
      'create_conversation', 'complete_covering', 'complete_filling', 'get_flavours',
      'get_messages', 'get_staff_stats', 'get_conversations', 'send_message',
      'set_due_date_settings', 'create_manual_order', 'adjust_accessory_stock',
      'upsert_bom', 'get_cake_topper_stock_transactions', 'upsert_cake_topper'
    )
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = %L', r.proname, r.args, 'public');
    RAISE NOTICE '%', format('Set search_path for: public.%s(%s)', r.proname, r.args);
  END LOOP;
END;
$$;
