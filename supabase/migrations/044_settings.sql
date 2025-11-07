-- Migration: Settings management RPCs
-- Generated: 2025-11-07T05:15:46.196Z
-- Functions: 13

-- Function 1/13: get_due_date_settings
CREATE OR REPLACE FUNCTION public.get_due_date_settings(p_store text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_default_due text;
  v_allowed_days jsonb;
  v_blackout_dates jsonb;
  v_result jsonb;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Get default due date (extract raw string from JSONB)
  SELECT value#>>'{}' INTO v_default_due
  FROM settings 
  WHERE store = p_store AND key = 'dueDates.defaultDue'
  LIMIT 1;

  -- Get allowed days
  SELECT value INTO v_allowed_days
  FROM settings 
  WHERE store = p_store AND key = 'dueDates.allowedDays'
  LIMIT 1;

  -- Get blackout dates
  SELECT value INTO v_blackout_dates
  FROM settings 
  WHERE store = p_store AND key = 'dueDates.blackoutDates'
  LIMIT 1;

  -- Build result object with defaults
  v_result := jsonb_build_object(
    'defaultDue', COALESCE(v_default_due, '+1 day'),
    'allowedDays', COALESCE(v_allowed_days, '[true, true, true, true, true, true, false]'::jsonb),
    'blackoutDates', COALESCE(v_blackout_dates, '["2024-12-25", "2024-01-01"]'::jsonb)
  );

  RETURN v_result;
END;
$function$


-- Function 2/13: get_flavours
CREATE OR REPLACE FUNCTION public.get_flavours(p_store text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_flavours text[];
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Get flavours from settings table
  SELECT COALESCE(
    (SELECT ARRAY(
      SELECT jsonb_array_elements_text(value)
      FROM settings 
      WHERE store = p_store AND key = 'flavours'
      -- REMOVED LIMIT 1 - this was causing only the first flavour to be returned
    )),
    CASE 
      WHEN p_store = 'bannos' THEN ARRAY['Vanilla', 'Chocolate', 'Strawberry', 'Red Velvet', 'Lemon', 'Coffee']
      WHEN p_store = 'flourlane' THEN ARRAY['Vanilla', 'Chocolate', 'Strawberry', 'Red Velvet', 'Lemon', 'Coffee', 'Matcha', 'Salted Caramel']
      ELSE ARRAY['Vanilla', 'Chocolate', 'Strawberry']
    END
  ) INTO v_flavours;

  RETURN v_flavours;
END;
$function$


-- Function 3/13: get_monitor_density
CREATE OR REPLACE FUNCTION public.get_monitor_density(p_store text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_density text;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Get monitor density from settings table
  SELECT COALESCE(
    (SELECT value#>>'{}'  -- Extract raw string from JSONB
     FROM settings 
     WHERE store = p_store AND key = 'monitor.density'
     LIMIT 1),
    'cozy' -- Default value
  ) INTO v_density;

  RETURN v_density;
END;
$function$


-- Function 4/13: get_printing_settings
CREATE OR REPLACE FUNCTION public.get_printing_settings(p_store text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$


-- Function 5/13: get_setting
CREATE OR REPLACE FUNCTION public.get_setting(p_store text, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_value jsonb;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Get setting value
  SELECT value INTO v_value
  FROM public.settings
  WHERE store = p_store AND key = p_key
  LIMIT 1;

  RETURN v_value;
END;
$function$


-- Function 6/13: get_settings
CREATE OR REPLACE FUNCTION public.get_settings(p_store text)
 RETURNS TABLE(store text, key text, value jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  RETURN QUERY
  SELECT 
    s.store,
    s.key,
    s.value,
    s.created_at
  FROM public.settings s
  WHERE s.store = p_store
  ORDER BY s.key;
END;
$function$


-- Function 7/13: get_storage_locations
CREATE OR REPLACE FUNCTION public.get_storage_locations(p_store text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_locations text[];
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Get storage locations from settings table
  SELECT COALESCE(
    (SELECT ARRAY(
      SELECT jsonb_array_elements_text(value)
      FROM settings 
      WHERE store = p_store AND key = 'storage_locations'
      -- Removed LIMIT 1 here
    )),
    CASE 
      WHEN p_store = 'bannos' THEN ARRAY['Store Fridge', 'Store Freezer', 'Kitchen Coolroom', 'Kitchen Freezer', 'Basement Coolroom']
      WHEN p_store = 'flourlane' THEN ARRAY['Store Fridge', 'Store Freezer', 'Kitchen Coolroom', 'Kitchen Freezer', 'Basement Coolroom', 'Display Case']
      ELSE ARRAY['General Storage', 'Cold Storage', 'Freezer Storage']
    END
  ) INTO v_locations;

  RETURN v_locations;
END;
$function$


-- Function 8/13: set_due_date_settings
CREATE OR REPLACE FUNCTION public.set_due_date_settings(p_store text, p_settings jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_default_due text;
  v_allowed_days jsonb;
  v_blackout_dates jsonb;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Validate settings object
  IF p_settings IS NULL THEN
    RAISE EXCEPTION 'Settings object cannot be null';
  END IF;

  -- Extract values from settings object
  v_default_due := p_settings->>'defaultDue';
  v_allowed_days := p_settings->'allowedDays';
  v_blackout_dates := p_settings->'blackoutDates';

  -- Validate required fields
  IF v_default_due IS NULL OR v_default_due = '' THEN
    RAISE EXCEPTION 'defaultDue is required';
  END IF;

  IF v_allowed_days IS NULL OR jsonb_typeof(v_allowed_days) != 'array' THEN
    RAISE EXCEPTION 'allowedDays must be a JSON array';
  END IF;

  IF v_blackout_dates IS NULL OR jsonb_typeof(v_blackout_dates) != 'array' THEN
    RAISE EXCEPTION 'blackoutDates must be a JSON array';
  END IF;

  -- Insert or update settings
  INSERT INTO public.settings (store, key, value)
  VALUES 
    (p_store, 'dueDates.defaultDue', to_jsonb(v_default_due)),
    (p_store, 'dueDates.allowedDays', v_allowed_days),
    (p_store, 'dueDates.blackoutDates', v_blackout_dates)
  ON CONFLICT (store, key) 
  DO UPDATE SET value = EXCLUDED.value;
  
  RETURN true;
END;
$function$


-- Function 9/13: set_flavours
CREATE OR REPLACE FUNCTION public.set_flavours(p_store text, p_flavours text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_flavours_json jsonb;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Validate flavours array
  IF p_flavours IS NULL OR array_length(p_flavours, 1) = 0 THEN
    RAISE EXCEPTION 'Flavours array cannot be empty';
  END IF;

  -- Convert text array to JSONB array
  v_flavours_json := to_jsonb(p_flavours);

  -- Insert or update flavours in settings table
  INSERT INTO public.settings (store, key, value)
  VALUES (p_store, 'flavours', v_flavours_json)
  ON CONFLICT (store, key) 
  DO UPDATE SET value = v_flavours_json;
  
  RETURN true;
END;
$function$


-- Function 10/13: set_monitor_density
CREATE OR REPLACE FUNCTION public.set_monitor_density(p_store text, p_density text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Validate density value
  IF p_density NOT IN ('compact', 'cozy') THEN
    RAISE EXCEPTION 'Invalid density value: %. Must be "compact" or "cozy"', p_density;
  END IF;

  -- Insert or update monitor density in settings table
  INSERT INTO public.settings (store, key, value)
  VALUES (p_store, 'monitor.density', to_jsonb(p_density))
  ON CONFLICT (store, key) 
  DO UPDATE SET value = to_jsonb(p_density);
  
  RETURN true;
END;
$function$


-- Function 11/13: set_printing_settings
CREATE OR REPLACE FUNCTION public.set_printing_settings(p_store text, p_settings jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- For now, just return success
  RETURN true;
END;
$function$


-- Function 12/13: set_setting
CREATE OR REPLACE FUNCTION public.set_setting(p_store text, p_key text, p_value jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Validate key
  IF p_key IS NULL OR p_key = '' THEN
    RAISE EXCEPTION 'Setting key cannot be empty';
  END IF;

  -- Insert or update setting
  INSERT INTO public.settings (store, key, value)
  VALUES (p_store, p_key, p_value)
  ON CONFLICT (store, key) 
  DO UPDATE SET value = p_value;
  
  RETURN true;
END;
$function$


-- Function 13/13: set_storage_locations
CREATE OR REPLACE FUNCTION public.set_storage_locations(p_store text, p_locations text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_locations_json jsonb;
BEGIN
  -- Validate store
  IF p_store NOT IN ('bannos', 'flourlane', 'global') THEN
    RAISE EXCEPTION 'Invalid store: %', p_store;
  END IF;

  -- Validate locations array
  IF p_locations IS NULL OR array_length(p_locations, 1) = 0 THEN
    RAISE EXCEPTION 'Storage locations array cannot be empty';
  END IF;

  -- Convert text array to JSONB array
  v_locations_json := to_jsonb(p_locations);

  -- Insert or update storage locations in settings table
  INSERT INTO public.settings (store, key, value)
  VALUES (p_store, 'storage_locations', v_locations_json)
  ON CONFLICT (store, key) 
  DO UPDATE SET value = v_locations_json;
  
  RETURN true;
END;
$function$


