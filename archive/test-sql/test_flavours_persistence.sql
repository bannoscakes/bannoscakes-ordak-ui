-- Test script to verify flavours persistence
-- Run this in Supabase SQL editor

-- 1. Check if flavours RPC functions exist
SELECT 'Checking RPC functions...' as step;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('get_flavours', 'set_flavours') 
AND routine_schema = 'public';

-- 2. Test set_flavours with simple data
SELECT 'Testing set_flavours...' as step;
SELECT set_flavours('bannos', ARRAY['Test Vanilla', 'Test Chocolate', 'Test Strawberry']) as set_result;

-- 3. Check if data was inserted into settings table
SELECT 'Checking settings table...' as step;
SELECT store, key, value, created_at
FROM public.settings 
WHERE store = 'bannos' AND key = 'flavours';

-- 4. Test get_flavours function
SELECT 'Testing get_flavours...' as step;
SELECT get_flavours('bannos') as get_result;

-- 5. Test with different store
SELECT 'Testing with flourlane store...' as step;
SELECT set_flavours('flourlane', ARRAY['Test Matcha', 'Test Salted Caramel']) as set_result_flourlane;
SELECT get_flavours('flourlane') as get_result_flourlane;

-- 6. Check both stores in settings table
SELECT 'Final check - all flavour settings...' as step;
SELECT store, key, value, created_at
FROM public.settings 
WHERE key = 'flavours'
ORDER BY store, created_at DESC;

-- 7. Clean up test data
SELECT 'Cleaning up test data...' as step;
DELETE FROM public.settings 
WHERE store IN ('bannos', 'flourlane') AND key = 'flavours' AND value::text LIKE '%Test%';

-- 8. Final verification
SELECT 'Final verification - no test data...' as step;
SELECT store, key, value, created_at
FROM public.settings 
WHERE key = 'flavours'
ORDER BY store, created_at DESC;
