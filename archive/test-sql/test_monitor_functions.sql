-- Test monitor density functions
SELECT get_monitor_density('bannos') as get_density_result;

-- Set monitor density
SELECT set_monitor_density('bannos', 'compact') as set_density_result;

-- Get monitor density after setting
SELECT get_monitor_density('bannos') as get_density_after;

-- Check settings table for monitor data
SELECT store, key, value FROM public.settings WHERE key LIKE '%monitor%' OR key LIKE '%density%';
