-- =============================================
-- CHECK MESSAGES TABLE COLUMNS ONLY
-- =============================================

-- Check all columns in messages table
SELECT 
  'MESSAGES TABLE - ALL COLUMNS:' as info,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
ORDER BY ordinal_position;

-- Check specifically for message content column
SELECT 
  'MESSAGES TABLE - CONTENT COLUMN SEARCH:' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
  AND column_name IN ('body', 'content', 'text', 'message', 'message_text', 'message_content');

-- Show sample data structure
SELECT 
  'SAMPLE MESSAGE STRUCTURE (if any exist):' as info,
  *
FROM public.messages
LIMIT 1;
