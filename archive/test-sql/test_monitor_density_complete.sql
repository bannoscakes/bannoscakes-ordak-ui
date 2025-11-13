-- Test monitor density functions
SELECT get_monitor_density('bannos') as get_density_result;

-- Set monitor density to 'compact'
SELECT set_monitor_density('bannos', 'compact') as set_density_result;

-- Get monitor density after setting
SELECT get_monitor_density('bannos') as get_density_after;

-- Set monitor density to 'cozy'
SELECT set_monitor_density('bannos', 'cozy') as set_density_result_cozy;

-- Get monitor density after setting to 'cozy'
SELECT get_monitor_density('bannos') as get_density_after_cozy;

-- Check settings table for monitor data
SELECT store, key, value FROM public.settings WHERE key = 'monitor.density';
