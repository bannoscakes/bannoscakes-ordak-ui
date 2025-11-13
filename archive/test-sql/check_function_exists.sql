-- Check if create_conversation function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'create_conversation' 
  AND routine_schema = 'public';

-- If the above returns empty, the function doesn't exist
-- If it returns a row, we can check the parameters with the other script
