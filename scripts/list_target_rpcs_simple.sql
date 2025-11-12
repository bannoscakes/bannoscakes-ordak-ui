-- Simple script to list all public functions
-- This will show us what RPC functions exist in production

SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'  -- Only functions
  AND p.proname NOT LIKE 'pg_%'  -- Exclude PostgreSQL internals
  AND p.proname NOT LIKE 'uuid_%'  -- Exclude UUID functions
ORDER BY p.proname;

-- Count total functions
SELECT COUNT(*) as total_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE 'uuid_%';

