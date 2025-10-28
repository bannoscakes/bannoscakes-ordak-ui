// test_connection.mjs
// Simple test to verify Supabase connection

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wavciibrspfjezujydc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3YXZjaWlicnNwZmplenVqeWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjEyNDgsImV4cCI6MjA3MzYzNzI0OH0.38Z23XIXV3lOOE7Bzq-L0_BipY1wfdXu07hMzN4I6Ec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔌 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
    
    if (error) {
      console.error('❌ Connection failed:', error);
      return false;
    }
    
    console.log('✅ Connection successful!');
    console.log('📋 Current tables:', data.map(t => t.table_name));
    
    return true;
  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

testConnection();
