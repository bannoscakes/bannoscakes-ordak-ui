-- 051_set_storage_rpc.sql
-- Implement set_storage RPC to persist storage location on orders

CREATE OR REPLACE FUNCTION set_storage(
  p_store text,
  p_order_id text,
  p_storage text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_name text;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Normalize empty string to NULL
  IF p_storage IS NOT NULL AND p_storage = '' THEN
    p_storage := NULL;
  END IF;

  -- Dynamic table name
  v_table_name := 'orders_' || p_store;

  -- Update order storage
  EXECUTE format(
    'UPDATE %I SET storage = $1, updated_at = now() WHERE id = $2',
    v_table_name
  ) USING p_storage, p_order_id;

  -- Ensure order exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Optional audit log if table exists
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    INSERT INTO audit_log (action, performed_by, source, meta)
    VALUES (
      'set_storage',
      auth.uid(),
      'set_storage_rpc',
      jsonb_build_object(
        'store', p_store,
        'order_id', p_order_id,
        'storage', p_storage
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_storage(text, text, text) TO authenticated;

COMMENT ON FUNCTION set_storage(text, text, text)
  IS 'Set storage location for an order (validates store, normalizes empty to NULL, updates updated_at).';


