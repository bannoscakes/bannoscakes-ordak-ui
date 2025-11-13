-- Simple test to check create_conversation function signature
SELECT 
  p.parameter_name,
  p.data_type,
  p.ordinal_position
FROM information_schema.parameters p
WHERE p.specific_name IN (
  SELECT specific_name 
  FROM information_schema.routines 
  WHERE routine_name = 'create_conversation' 
    AND routine_schema = 'public'
)
ORDER BY p.ordinal_position;

-- Also try to call the function with the expected parameters
-- This will fail if the signature is wrong
SELECT public.create_conversation(
  ARRAY['11111111-1111-1111-1111-111111111111']::text[],
  'Test Conversation',
  'direct'
) as conversation_id;
