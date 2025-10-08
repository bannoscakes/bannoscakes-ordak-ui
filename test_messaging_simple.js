import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iwavciibrspfjezujydc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3YXZjaWlicnNwZmplenVqeWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjEyNDgsImV4cCI6MjA3MzYzNzI0OH0.38Z23XIXV3lOOE7Bzq-L0_BipY1wfdXu07hMzN4I6Ec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessaging() {
  console.log('🔍 Testing messaging system...');
  
  try {
    // Test 1: Check if get_conversations RPC exists
    console.log('\n1. Testing get_conversations RPC...');
    const { data: conversations, error: conversationsError } = await supabase
      .rpc('get_conversations', { p_limit: 10, p_offset: 0 });
    
    if (conversationsError) {
      console.error('❌ get_conversations failed:', conversationsError.message);
      console.error('Error code:', conversationsError.code);
      console.error('Error details:', conversationsError.details);
    } else {
      console.log('✅ get_conversations works!');
      console.log('Conversations:', conversations);
    }
    
    // Test 2: Check if create_conversation RPC exists
    console.log('\n2. Testing create_conversation RPC...');
    const { data: newConv, error: createError } = await supabase
      .rpc('create_conversation', { 
        p_participants: ['test-user-id'], 
        p_name: 'Test Conversation',
        p_type: 'direct'
      });
    
    if (createError) {
      console.error('❌ create_conversation failed:', createError.message);
      console.error('Error code:', createError.code);
    } else {
      console.log('✅ create_conversation works!');
      console.log('New conversation ID:', newConv);
    }
    
    // Test 3: Check if send_message RPC exists
    console.log('\n3. Testing send_message RPC...');
    const { data: messageId, error: sendError } = await supabase
      .rpc('send_message', { 
        p_conversation_id: 'test-conv-id',
        p_content: 'Test message'
      });
    
    if (sendError) {
      console.error('❌ send_message failed:', sendError.message);
      console.error('Error code:', sendError.code);
    } else {
      console.log('✅ send_message works!');
      console.log('Message ID:', messageId);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testMessaging();
