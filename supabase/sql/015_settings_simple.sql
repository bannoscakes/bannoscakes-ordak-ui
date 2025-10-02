-- 015_settings_simple.sql
-- Simplified settings RPCs without authentication for development

-- =============================================
-- SIMPLIFIED SETTINGS RPCs (NO AUTH)
-- =============================================

-- Get flavours for a store
CREATE OR REPLACE FUNCTION public.get_flavours(
  p_store text
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return default flavours for now
  IF p_store = 'bannos' THEN
    RETURN ARRAY['Vanilla', 'Chocolate', 'Strawberry', 'Red Velvet', 'Lemon', 'Coffee'];
  ELSIF p_store = 'flourlane' THEN
    RETURN ARRAY['Plain', 'Whole Wheat', 'Sourdough', 'Multigrain', 'Rye', 'Brioche'];
  ELSE
    RETURN ARRAY['Default'];
  END IF;
END;
$$;

-- Get storage locations for a store
CREATE OR REPLACE FUNCTION public.get_storage_locations(
  p_store text
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return default storage locations
  IF p_store = 'bannos' THEN
    RETURN ARRAY['Store Fridge', 'Store Freezer', 'Kitchen Coolroom', 'Kitchen Freezer'];
  ELSIF p_store = 'flourlane' THEN
    RETURN ARRAY['Bread Rack', 'Cool Room', 'Freezer', 'Display Case'];
  ELSE
    RETURN ARRAY['Default Storage'];
  END IF;
END;
$$;

-- Get printing settings for a store
CREATE OR REPLACE FUNCTION public.get_printing_settings(
  p_store text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return default printing settings
  RETURN jsonb_build_object(
    'printer_name', 'Default Printer',
    'paper_size', 'A4',
    'orientation', 'portrait',
    'auto_print', true,
    'print_barcodes', true,
    'print_labels', true
  );
END;
$$;

-- Get monitor density for a store
CREATE OR REPLACE FUNCTION public.get_monitor_density(
  p_store text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return default monitor density
  RETURN 'comfortable';
END;
$$;

-- Set flavours for a store (placeholder)
CREATE OR REPLACE FUNCTION public.set_flavours(
  p_store text,
  p_flavours text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, just return success
  RETURN true;
END;
$$;

-- Set storage locations for a store (placeholder)
CREATE OR REPLACE FUNCTION public.set_storage_locations(
  p_store text,
  p_locations text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, just return success
  RETURN true;
END;
$$;

-- Set printing settings for a store (placeholder)
CREATE OR REPLACE FUNCTION public.set_printing_settings(
  p_store text,
  p_settings jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, just return success
  RETURN true;
END;
$$;

-- Set monitor density for a store (placeholder)
CREATE OR REPLACE FUNCTION public.set_monitor_density(
  p_store text,
  p_density text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, just return success
  RETURN true;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_flavours(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_locations(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_printing_settings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monitor_density(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_flavours(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_storage_locations(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_printing_settings(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_monitor_density(text, text) TO authenticated;
