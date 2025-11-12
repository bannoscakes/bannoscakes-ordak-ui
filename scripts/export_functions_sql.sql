-- Export all functions as SQL CREATE statements
-- Copy the entire result and save to a .sql file

SELECT 
    '-- Function: ' || p.proname || E'\n' ||
    pg_get_functiondef(p.oid) || E';\n\n'
    as function_sql
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE 'uuid_%'
ORDER BY p.proname;

