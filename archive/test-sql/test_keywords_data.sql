-- Test Accessory Keywords data for UI integration
-- First, let's create some test keywords

-- Get some component IDs first
SELECT id, sku, name FROM components LIMIT 5;

-- Create test keywords for existing components
-- (Replace component IDs with actual ones from the query above)

-- Example keywords (you'll need to replace the component IDs with real ones)
-- SELECT public.upsert_accessory_keyword(
--   'Spiderman',
--   'COMPONENT_ID_HERE',
--   NULL,
--   1,
--   'contains',
--   true
-- );

-- Test the get_accessory_keywords function
SELECT * FROM public.get_accessory_keywords(NULL, false, NULL);
