SELECT get_storage_locations('bannos') as result;
SELECT set_storage_locations('bannos', ARRAY['Test Location 1', 'Test Location 2']) as set_result;
SELECT get_storage_locations('bannos') as get_result;
