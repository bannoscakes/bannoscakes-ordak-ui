-- 011_settings_management_rpcs.sql
-- Phase 7: Settings Management RPCs
-- Implements application settings, configuration, and store-specific preferences

-- =============================================
-- SETTINGS MANAGEMENT RPCs
-- =============================================

-- Get all settings for a store
CREATE OR REPLACE FUNCTION public.get_settings(
  p_store text
)
RETURNS TABLE (
  id uuid,
  store text,
  key text,
  value jsonb,
  description text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view settings
  IF NOT public.check_user_role('Supervisor') THEN
    RAISE EXCEPTION 'Insufficient permissions to view settings';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.store,
    s.key,
    s.value,
    s.description,
    s.is_active,
    s.created_at,
    s.updated_at
  FROM public.settings s
  WHERE s.store = p_store
    AND s.is_active = true
  ORDER BY s.key;
END;
$$;

-- Get single setting by key
CREATE OR REPLACE FUNCTION public.get_setting(
  p_store text,
  p_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_value jsonb;
BEGIN
  -- Check if user has permission to view settings
  IF NOT public.check_user_role('Supervisor') THEN
    RAISE EXCEPTION 'Insufficient permissions to view settings';
  END IF;

  SELECT value INTO v_value
  FROM public.settings
  WHERE store = p_store
    AND key = p_key
    AND is_active = true;

  RETURN v_value;
END;
$$;

-- Set/update a setting
CREATE OR REPLACE FUNCTION public.set_setting(
  p_store text,
  p_key text,
  p_value jsonb,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_setting_id uuid;
  v_user_id uuid;
BEGIN
  -- Check if user has permission to manage settings
  IF NOT public.check_user_role('Admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to manage settings';
  END IF;

  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Get user ID for audit log
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  -- Upsert setting
  INSERT INTO public.settings (store, key, value, description, is_active)
  VALUES (p_store, p_key, p_value, p_description, true)
  ON CONFLICT (store, key)
  DO UPDATE SET
    value = p_value,
    description = COALESCE(p_description, settings.description),
    updated_at = now()
  RETURNING id INTO v_setting_id;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, new_values, actor_id, store, order_id
  ) VALUES (
    'settings', v_setting_id::text, 'set_setting',
    jsonb_build_object(
      'store', p_store,
      'key', p_key,
      'value', p_value
    ),
    v_user_id, p_store, 'N/A'
  );

  RETURN v_setting_id;
END;
$$;

-- Get printing configuration
CREATE OR REPLACE FUNCTION public.get_settings_printing(
  p_store text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.get_setting(p_store, 'printing');
END;
$$;

-- Set printing configuration
CREATE OR REPLACE FUNCTION public.set_settings_printing(
  p_store text,
  p_config jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.set_setting(p_store, 'printing', p_config, 'Printing configuration');
END;
$$;

-- Get available flavours
CREATE OR REPLACE FUNCTION public.get_flavours(
  p_store text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.get_setting(p_store, 'flavours');
END;
$$;

-- Set available flavours
CREATE OR REPLACE FUNCTION public.set_flavours(
  p_store text,
  p_flavours jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.set_setting(p_store, 'flavours', p_flavours, 'Available flavours');
END;
$$;

-- Get storage locations
CREATE OR REPLACE FUNCTION public.get_storage_locations(
  p_store text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.get_setting(p_store, 'storage_locations');
END;
$$;

-- Set storage locations
CREATE OR REPLACE FUNCTION public.set_storage_locations(
  p_store text,
  p_locations jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.set_setting(p_store, 'storage_locations', p_locations, 'Storage locations');
END;
$$;

-- Get monitor density setting
CREATE OR REPLACE FUNCTION public.get_monitor_density(
  p_store text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.get_setting(p_store, 'monitor_density');
END;
$$;

-- Set monitor density setting
CREATE OR REPLACE FUNCTION public.set_monitor_density(
  p_store text,
  p_density jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.set_setting(p_store, 'monitor_density', p_density, 'Monitor density setting');
END;
$$;

-- Delete/deactivate a setting
CREATE OR REPLACE FUNCTION public.delete_setting(
  p_store text,
  p_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user has permission to manage settings
  IF NOT public.check_user_role('Admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to delete settings';
  END IF;

  -- Get user ID for audit log
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  -- Deactivate setting
  UPDATE public.settings
  SET is_active = false, updated_at = now()
  WHERE store = p_store AND key = p_key;

  -- Log the action
  INSERT INTO public.audit_log (
    table_name, record_id, action, old_values, actor_id, store, order_id
  ) VALUES (
    'settings', p_key, 'delete_setting',
    jsonb_build_object('store', p_store, 'key', p_key),
    v_user_id, p_store, 'N/A'
  );

  RETURN FOUND;
END;
$$;

-- =============================================
-- GRANTS
-- =============================================

-- Grant execute permissions on all settings management functions
GRANT EXECUTE ON FUNCTION public.get_settings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_setting(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_setting(text, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_settings_printing(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_settings_printing(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_flavours(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_flavours(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_locations(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_storage_locations(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monitor_density(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_monitor_density(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_setting(text, text) TO authenticated;
