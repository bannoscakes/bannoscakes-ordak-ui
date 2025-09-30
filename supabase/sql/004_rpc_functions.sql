-- 004_rpc_functions.sql
-- RPC functions for UI data access (PR #2)

-- RPC: Get queue minimal data (matches UI expectations)
CREATE OR REPLACE FUNCTION public.get_queue_minimal(
  p_store text DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id text,
  human_id text,
  title text,
  stage stage_type,
  priority smallint,
  due_date date,
  assignee_id uuid,
  storage_location text,
  store text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.human_id,
    v.title,
    v.stage,
    v.priority,
    v.due_date,
    v.assignee_id,
    v.storage_location,
    v.store,
    v.created_at
  FROM public.vw_queue_minimal v
  WHERE 
    (p_store IS NULL OR v.store = p_store)
    AND (p_stage IS NULL OR v.stage::text = p_stage)
  ORDER BY v.priority DESC, v.due_date ASC, v.created_at ASC
  LIMIT p_limit;
END;
$$;

-- RPC: Get unassigned counts by store and stage
CREATE OR REPLACE FUNCTION public.get_unassigned_counts(
  p_store text DEFAULT NULL
)
RETURNS TABLE (
  store text,
  stage stage_type,
  count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.store,
    v.stage,
    v.count
  FROM public.vw_unassigned_counts v
  WHERE (p_store IS NULL OR v.store = p_store)
  ORDER BY v.store, v.stage;
END;
$$;

-- RPC: Get complete orders minimal data
CREATE OR REPLACE FUNCTION public.get_complete_minimal(
  p_store text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id text,
  human_id text,
  title text,
  storage_location text,
  store text,
  packing_complete_ts timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.human_id,
    v.title,
    v.storage_location,
    v.store,
    v.packing_complete_ts,
    v.created_at
  FROM public.vw_complete_minimal v
  WHERE (p_store IS NULL OR v.store = p_store)
  ORDER BY v.packing_complete_ts DESC, v.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_queue_minimal(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unassigned_counts(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_complete_minimal(text, integer) TO authenticated;
