-- Drop unused database functions after verification
-- These functions are not called from frontend, Edge Functions, or other DB functions
-- Issue: https://github.com/bannoscakes/bannoscakes-ordak-ui/issues/536

-- Deprecated functions (replaced by newer implementations)
DROP FUNCTION IF EXISTS public.get_staff();
DROP FUNCTION IF EXISTS public.assign_staff_to_order(uuid, uuid);

-- NOTE: deduct_inventory_on_order() is a TRIGGER function, NOT an RPC
-- It's used by: trg_deduct_inventory_bannos, trg_deduct_inventory_flourlane
-- DO NOT DROP

-- Unused feature functions
DROP FUNCTION IF EXISTS public.admin_delete_order(uuid);
DROP FUNCTION IF EXISTS public.ingest_order(jsonb, jsonb);
DROP FUNCTION IF EXISTS public.ingest_order(text, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.move_to_filling_with_assignment(uuid, uuid);
