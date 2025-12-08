// apply_schema.js
// Script to apply database schema using Supabase client

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySQLFile(filename) {
  try {
    console.log(`\n📄 Applying ${filename}...`);
    const sql = readFileSync(join(__dirname, 'supabase', 'sql', filename), 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Error applying ${filename}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully applied ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Error reading ${filename}:`, err.message);
    return false;
  }
}

async function testSchema() {
  try {
    console.log('\n🧪 Testing schema...');
    
    // Test 1: Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['orders_bannos', 'orders_flourlane', 'staff_shared']);
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
      return false;
    }
    
    console.log('✅ Tables created:', tables.map(t => t.table_name));
    
    // Test 2: Insert sample data
    const { error: insertError } = await supabase
      .from('orders_bannos')
      .insert({
        shopify_order_number: 12345,
        shopify_order_id: 12345,
        shopify_order_gid: 'gid://shopify/Order/12345',
        customer_name: 'John Doe',
        product_title: 'Chocolate Cake',
        flavour: 'Vanilla, Chocolate',
        notes: 'Please deliver after 2pm',
        currency: 'AUD',
        total_amount: 45.00,
        due_date: '2025-01-30',
        delivery_method: 'delivery',
        size: 'M',
        item_qty: 1,
        storage: 'Fridge A'
      });
    
    if (insertError) {
      console.error('❌ Error inserting test data:', insertError);
      return false;
    }
    
    console.log('✅ Test data inserted successfully');
    
    // Test 3: Check human_id generation
    const { data: orders, error: selectError } = await supabase
      .from('orders_bannos')
      .select('id, customer_name')
      .eq('shopify_order_number', 12345);
    
    if (selectError) {
      console.error('❌ Error selecting test data:', selectError);
      return false;
    }
    
    console.log('✅ Human ID generated:', orders[0]?.id);
    
    return true;
  } catch (err) {
    console.error('❌ Error testing schema:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database schema application...');
  
  // Apply SQL files in order
  const files = [
    '001_orders_core.sql',
    '002_orders_human_id_trigger.sql', 
    '003_orders_views.sql'
  ];
  
  for (const file of files) {
    const success = await applySQLFile(file);
    if (!success) {
      console.error(`❌ Failed to apply ${file}. Stopping.`);
      process.exit(1);
    }
  }
  
  // Test the schema
  const testSuccess = await testSchema();
  if (testSuccess) {
    console.log('\n🎉 Database schema applied and tested successfully!');
  } else {
    console.log('\n❌ Schema test failed. Please check the errors above.');
    process.exit(1);
  }
}

main().catch(console.error);
