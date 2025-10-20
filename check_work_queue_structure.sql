-- Check work_queue table structure to see what columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'work_queue' 
ORDER BY ordinal_position;
