import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
  try {
    console.log('🔍 Checking all orders in bannos table...');
    
    const { data, error } = await supabase
      .from('orders_bannos')
      .select('*')
      .order('id');

    if (error) {
      console.error('❌ Error fetching orders:', error);
      return;
    }

    console.log(`📊 Total orders: ${data.length}`);
    console.log('📋 All orders:');
    data.forEach((order, index) => {
      console.log(`  ${index + 1}. ID: "${order.id}" | Customer: "${order.customer_name}" | Product: "${order.product_title}"`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkOrders();
