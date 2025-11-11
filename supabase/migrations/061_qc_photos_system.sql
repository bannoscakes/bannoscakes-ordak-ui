-- Migration: Task 14 - QC Photo System (Backend Only)
-- Purpose: Fix order_photos table for current system and add QC RPCs

BEGIN;

-- ============================================================================
-- FIX order_photos TABLE
-- ============================================================================

-- Drop old foreign key constraints (references non-existent 'orders' table)
ALTER TABLE public.order_photos DROP CONSTRAINT IF EXISTS order_photos_order_id_fkey;
ALTER TABLE public.order_photos DROP CONSTRAINT IF EXISTS order_photos_uploaded_by_fkey;

-- Change order_id from UUID to TEXT (current system uses text IDs)
ALTER TABLE public.order_photos ALTER COLUMN order_id TYPE text;

-- Drop old stage enum column and add simple text
ALTER TABLE public.order_photos DROP COLUMN IF EXISTS stage;
ALTER TABLE public.order_photos 
  ADD COLUMN stage text NOT NULL DEFAULT 'Packing'
  CHECK (stage IN ('Filling','Covering','Decorating','Packing','Complete'));

-- Add store column (required to identify bannos vs flourlane)
ALTER TABLE public.order_photos 
  ADD COLUMN IF NOT EXISTS store text NOT NULL DEFAULT 'bannos'
  CHECK (store IN ('bannos','flourlane'));

-- Add QC-specific columns
ALTER TABLE public.order_photos 
  ADD COLUMN IF NOT EXISTS qc_status text NOT NULL DEFAULT 'ok'
  CHECK (qc_status IN ('ok','needs_review','rejected'));

ALTER TABLE public.order_photos 
  ADD COLUMN IF NOT EXISTS qc_issue text;

ALTER TABLE public.order_photos 
  ADD COLUMN IF NOT EXISTS qc_comments text;

-- Add updated_at for tracking changes
ALTER TABLE public.order_photos 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Update uploaded_by to reference staff_shared instead of users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_photos_uploaded_by_fkey_staff'
  ) THEN
    ALTER TABLE public.order_photos
      ADD CONSTRAINT order_photos_uploaded_by_fkey_staff
      FOREIGN KEY (uploaded_by)
      REFERENCES staff_shared(user_id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_photos_order_store 
  ON public.order_photos(store, order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_photos_qc_status 
  ON public.order_photos(qc_status) 
  WHERE qc_status != 'ok';

CREATE INDEX IF NOT EXISTS idx_order_photos_stage 
  ON public.order_photos(store, stage, created_at DESC);

-- Comments
COMMENT ON TABLE public.order_photos IS 'Photos of orders for QC tracking. Compatible with orders_bannos/orders_flourlane.';
COMMENT ON COLUMN public.order_photos.qc_status IS 'QC result: ok (passed), needs_review (flagged), rejected (failed)';
COMMENT ON COLUMN public.order_photos.qc_issue IS 'Type of issue: Damaged Cake, Wrong spelling, Missing decoration, etc.';
COMMENT ON COLUMN public.order_photos.qc_comments IS 'Optional QC notes from staff';

-- ============================================================================
-- RPC 1: upload_order_photo
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upload_order_photo(
  p_order_id text,
  p_store text,
  p_url text,
  p_stage text DEFAULT 'Packing',
  p_qc_status text DEFAULT 'ok',
  p_qc_issue text DEFAULT NULL,
  p_qc_comments text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_photo_id uuid;
BEGIN
  -- Validate inputs
  IF p_store NOT IN ('bannos', 'flourlane') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;
  
  IF p_stage NOT IN ('Filling','Covering','Decorating','Packing','Complete') THEN
    RAISE EXCEPTION 'Invalid stage: %', p_stage;
  END IF;
  
  IF p_qc_status NOT IN ('ok','needs_review','rejected') THEN
    RAISE EXCEPTION 'Invalid QC status: %', p_qc_status;
  END IF;
  
  -- Insert photo
  INSERT INTO public.order_photos (
    order_id,
    store,
    url,
    stage,
    qc_status,
    qc_issue,
    qc_comments,
    uploaded_by
  ) VALUES (
    p_order_id,
    p_store,
    p_url,
    p_stage,
    p_qc_status,
    p_qc_issue,
    p_qc_comments,
    auth.uid()
  ) RETURNING id INTO v_photo_id;
  
  -- Log to audit
  INSERT INTO public.audit_log (action, performed_by, source, meta)
  VALUES (
    'photo_uploaded',
    auth.uid(),
    'upload_order_photo',
    jsonb_build_object(
      'order_id', p_order_id,
      'store', p_store,
      'photo_id', v_photo_id,
      'qc_status', p_qc_status
    )
  );
  
  RETURN v_photo_id;
END;
$function$;

-- ============================================================================
-- RPC 2: get_order_photos
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_order_photos(
  p_order_id text,
  p_store text
) RETURNS TABLE(
  id uuid,
  url text,
  stage text,
  qc_status text,
  qc_issue text,
  qc_comments text,
  uploaded_by uuid,
  uploader_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.url,
    p.stage,
    p.qc_status,
    p.qc_issue,
    p.qc_comments,
    p.uploaded_by,
    s.full_name as uploader_name,
    p.created_at
  FROM public.order_photos p
  LEFT JOIN staff_shared s ON s.user_id = p.uploaded_by
  WHERE p.order_id = p_order_id
    AND p.store = p_store
  ORDER BY p.created_at DESC;
END;
$function$;

-- ============================================================================
-- RPC 3: get_qc_review_queue (for QC Photo Check modal)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_qc_review_queue(
  p_store text DEFAULT NULL,
  p_qc_status text DEFAULT NULL
) RETURNS TABLE(
  photo_id uuid,
  order_id text,
  order_number integer,
  store text,
  customer_name text,
  product_title text,
  url text,
  qc_status text,
  qc_issue text,
  qc_comments text,
  uploaded_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Return photos from bannos
  RETURN QUERY
  SELECT 
    p.id as photo_id,
    p.order_id,
    o.shopify_order_number::integer as order_number,
    p.store,
    o.customer_name,
    o.product_title,
    p.url,
    p.qc_status,
    p.qc_issue,
    p.qc_comments,
    p.created_at as uploaded_at
  FROM public.order_photos p
  INNER JOIN orders_bannos o ON o.id = p.order_id
  WHERE (p_store IS NULL OR p.store = 'bannos')
    AND (p_qc_status IS NULL OR p.qc_status = p_qc_status)
    AND DATE(p.created_at) = CURRENT_DATE
  
  UNION ALL
  
  -- Return photos from flourlane
  SELECT 
    p.id as photo_id,
    p.order_id,
    o.shopify_order_number::integer as order_number,
    p.store,
    o.customer_name,
    o.product_title,
    p.url,
    p.qc_status,
    p.qc_issue,
    p.qc_comments,
    p.created_at as uploaded_at
  FROM public.order_photos p
  INNER JOIN orders_flourlane o ON o.id = p.order_id
  WHERE (p_store IS NULL OR p.store = 'flourlane')
    AND (p_qc_status IS NULL OR p.qc_status = p_qc_status)
    AND DATE(p.created_at) = CURRENT_DATE
  
  ORDER BY uploaded_at DESC;
END;
$function$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.upload_order_photo(text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_photos(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_qc_review_queue(text, text) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.upload_order_photo IS 'Upload QC photo metadata for an order. Actual file upload happens via Supabase Storage.';
COMMENT ON FUNCTION public.get_order_photos IS 'Get all photos for a specific order.';
COMMENT ON FUNCTION public.get_qc_review_queue IS 'Get today''s photos needing QC review. Powers QC Photo Check modal.';

COMMIT;

