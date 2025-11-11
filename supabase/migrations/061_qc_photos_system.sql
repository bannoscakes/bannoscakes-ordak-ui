-- Migration: Task 14 - QC Photo System (Backend Only)
-- Purpose: Fix order_photos table for current system and add QC RPCs

BEGIN;

-- ============================================================================
-- FIX/CREATE order_photos TABLE
-- ============================================================================

-- Check if table exists and fix it, or create fresh
DO $$
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_photos') THEN
    CREATE TABLE public.order_photos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id text NOT NULL,
      store text NOT NULL CHECK (store IN ('bannos','flourlane')),
      stage text NOT NULL DEFAULT 'Packing' CHECK (stage IN ('Filling','Covering','Decorating','Packing','Complete')),
      url text NOT NULL,
      qc_status text NOT NULL DEFAULT 'ok' CHECK (qc_status IN ('ok','needs_review','rejected')),
      qc_issue text,
      qc_comments text,
      uploaded_by uuid REFERENCES staff_shared(user_id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  ELSE
    -- Table exists - fix it for current system
    
    -- Drop old foreign key constraints
    ALTER TABLE public.order_photos DROP CONSTRAINT IF EXISTS order_photos_order_id_fkey;
    ALTER TABLE public.order_photos DROP CONSTRAINT IF EXISTS order_photos_uploaded_by_fkey;
    
    -- Change order_id from UUID to TEXT (if it's UUID)
    DO $inner$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'order_photos' AND column_name = 'order_id' AND data_type = 'uuid'
      ) THEN
        ALTER TABLE public.order_photos ALTER COLUMN order_id TYPE text USING order_id::text;
      END IF;
    END $inner$;
    
    -- Add stage column if missing (don't drop if exists - preserve data)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_photos' AND column_name = 'stage') THEN
      ALTER TABLE public.order_photos ADD COLUMN stage text NOT NULL DEFAULT 'Packing' CHECK (stage IN ('Filling','Covering','Decorating','Packing','Complete'));
    END IF;
    
    -- Add store column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_photos' AND column_name = 'store') THEN
      ALTER TABLE public.order_photos ADD COLUMN store text NOT NULL DEFAULT 'bannos' CHECK (store IN ('bannos','flourlane'));
    END IF;
    
    -- Add QC columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_photos' AND column_name = 'qc_status') THEN
      ALTER TABLE public.order_photos ADD COLUMN qc_status text NOT NULL DEFAULT 'ok' CHECK (qc_status IN ('ok','needs_review','rejected'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_photos' AND column_name = 'qc_issue') THEN
      ALTER TABLE public.order_photos ADD COLUMN qc_issue text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_photos' AND column_name = 'qc_comments') THEN
      ALTER TABLE public.order_photos ADD COLUMN qc_comments text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_photos' AND column_name = 'updated_at') THEN
      ALTER TABLE public.order_photos ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    END IF;
    
    -- Add uploaded_by column if missing (needed for FK)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_photos' AND column_name = 'uploaded_by') THEN
      ALTER TABLE public.order_photos ADD COLUMN uploaded_by uuid;
    END IF;
    
    -- Add FK to staff_shared
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.order_photos'::regclass AND conname = 'order_photos_uploaded_by_fkey_staff') THEN
      ALTER TABLE public.order_photos
        ADD CONSTRAINT order_photos_uploaded_by_fkey_staff
        FOREIGN KEY (uploaded_by)
        REFERENCES staff_shared(user_id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

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
  -- Validate authentication
  IF p_order_id IS NULL OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
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
  order_number bigint,
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
    o.shopify_order_number::bigint as order_number,
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
  WHERE (p_store IS NULL OR p_store = 'bannos')
    AND p.store = 'bannos'
    AND (p_qc_status IS NULL OR p.qc_status = p_qc_status)
    AND DATE(p.created_at) = CURRENT_DATE
  
  UNION ALL
  
  -- Return photos from flourlane
  SELECT 
    p.id as photo_id,
    p.order_id,
    o.shopify_order_number::bigint as order_number,
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
  WHERE (p_store IS NULL OR p_store = 'flourlane')
    AND p.store = 'flourlane'
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

