-- Direct test to see what get_flavours returns
-- Run this in Supabase SQL editor

-- 1. First, let's see what's actually in the settings table
SELECT 'Current settings data:' as step;
SELECT store, key, value, created_at
FROM public.settings 
WHERE key = 'flavours'
ORDER BY store, created_at DESC;

-- 2. Test get_flavours function directly
SELECT 'Testing get_flavours function:' as step;
SELECT get_flavours('bannos') as flavours_result;

-- 3. Test with a fresh set of flavours
SELECT 'Setting fresh flavours:' as step;
SELECT set_flavours('bannos', ARRAY['Fresh Vanilla', 'Fresh Chocolate', 'Fresh Strawberry']) as set_result;

-- 4. Check what was saved
SELECT 'Checking what was saved:' as step;
SELECT store, key, value, created_at
FROM public.settings 
WHERE store = 'bannos' AND key = 'flavours';

-- 5. Test get_flavours again
SELECT 'Testing get_flavours after save:' as step;
SELECT get_flavours('bannos') as flavours_result_after;

-- 6. Clean up
SELECT 'Cleaning up test data:' as step;
DELETE FROM public.settings 
WHERE store = 'bannos' AND key = 'flavours' AND value::text LIKE '%Fresh%';
