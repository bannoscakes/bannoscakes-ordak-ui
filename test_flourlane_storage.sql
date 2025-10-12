-- Check default locations for Flourlane
SELECT get_storage_locations('flourlane') as result_flourlane_default;

-- Set some test locations for Flourlane  
SELECT set_storage_locations('flourlane', ARRAY['Flourlane Fridge', 'Flourlane Freezer']) as set_result_flourlane;

-- Get locations for Flourlane after setting them
SELECT get_storage_locations('flourlane') as result_flourlane_after_set;

-- Verify directly in the settings table
SELECT store, key, value FROM public.settings WHERE store = 'flourlane' AND key = 'storage_locations';
