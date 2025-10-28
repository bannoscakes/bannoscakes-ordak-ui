-- Simple test to verify flavours are saved and loaded correctly
-- Run this in Supabase SQL editor

-- 1. Clear any existing test data
DELETE FROM public.settings WHERE store = 'bannos' AND key = 'flavours';

-- 2. Set flavours directly in database
INSERT INTO public.settings (store, key, value) 
VALUES ('bannos', 'flavours', '["Chocolate", "Vanilla", "Strawberry"]'::jsonb);

-- 3. Check what was saved
SELECT 'What was saved:' as step;
SELECT store, key, value, created_at
FROM public.settings 
WHERE store = 'bannos' AND key = 'flavours';

-- 4. Test get_flavours function
SELECT 'get_flavours result:' as step;
SELECT get_flavours('bannos') as result;

-- 5. Test set_flavours function
SELECT 'set_flavours result:' as step;
SELECT set_flavours('bannos', ARRAY['Chocolate', 'Vanilla', 'Strawberry', 'Caramel']) as result;

-- 6. Check what was saved after set_flavours
SELECT 'After set_flavours:' as step;
SELECT store, key, value, created_at
FROM public.settings 
WHERE store = 'bannos' AND key = 'flavours';

-- 7. Test get_flavours again
SELECT 'get_flavours after set:' as step;
SELECT get_flavours('bannos') as result;
