import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteBannos12345() {
  try {
    console.log('🗑️  Deleting order: bannos-12345');
    
    // Delete the specific order
    const { data, error } = await supabase
      .from('orders_bannos')
      .delete()
      .eq('id', 'bannos-12345');

    if (error) {
      console.error('❌ Error deleting order:', error);
      return false;
    }

    console.log('✅ Order bannos-12345 deleted successfully');
    
    // Verify deletion by counting remaining orders
    const { count, error: countError } = await supabase
      .from('orders_bannos')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting remaining orders:', countError);
      return false;
    }

    console.log(`📊 Remaining orders in database: ${count}`);
    
    // Show remaining orders
    const { data: remainingOrders, error: fetchError } = await supabase
      .from('orders_bannos')
      .select('id, customer_name, product_title')
      .order('id');

    if (fetchError) {
      console.error('❌ Error fetching remaining orders:', fetchError);
      return false;
    }

    console.log('📋 Remaining orders:');
    remainingOrders.forEach(order => {
      console.log(`  - ${order.id}: ${order.customer_name} - ${order.product_title}`);
    });
    
    return true;
    
  } catch (err) {
    console.error('❌ Error during deletion:', err);
    return false;
  }
}

deleteBannos12345();
