-- Fix ambiguous column reference in claim_inventory_sync_items RPC
--
-- Problem: The function returns a table with column names that match the
-- inventory_sync_queue table columns. In the RETURNING clause, even with
-- table-qualified references like "q.status", PostgreSQL gets confused
-- between the output column "status" and the table column "q.status".
--
-- Error: "column reference 'status' is ambiguous"
--
-- Solution: Use explicit column aliasing in the RETURNING clause to
-- disambiguate between the table columns and the function's output columns.

CREATE OR REPLACE FUNCTION public.claim_inventory_sync_items(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  item_type text,
  item_id uuid,
  sync_action text,
  shopify_ids jsonb,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
BEGIN
  -- First, recover any items stuck in 'processing' for more than 10 minutes
  -- These are likely orphaned by edge function crashes
  UPDATE public.inventory_sync_queue isq
  SET status = 'pending'
  WHERE isq.status = 'processing'
    AND isq.created_at < now() - interval '10 minutes';

  -- Then claim pending items
  -- Use explicit column selection from the UPDATE result to avoid ambiguity
  RETURN QUERY
  WITH claimed AS (
    SELECT isq.id AS claimed_id
    FROM public.inventory_sync_queue isq
    WHERE isq.status = 'pending'
    ORDER BY isq.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.inventory_sync_queue isq
    SET status = 'processing'
    FROM claimed c
    WHERE isq.id = c.claimed_id
    RETURNING
      isq.id AS out_id,
      isq.item_type AS out_item_type,
      isq.item_id AS out_item_id,
      isq.sync_action AS out_sync_action,
      isq.shopify_ids AS out_shopify_ids,
      isq.status AS out_status,
      isq.created_at AS out_created_at
  )
  SELECT
    u.out_id,
    u.out_item_type,
    u.out_item_id,
    u.out_sync_action,
    u.out_shopify_ids,
    u.out_status,
    u.out_created_at
  FROM updated u;
END;
$$;

COMMENT ON FUNCTION public.claim_inventory_sync_items IS 'Atomically claim pending inventory sync items for processing. Uses FOR UPDATE SKIP LOCKED to prevent race conditions.';
