import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDelete() {
  try {
    console.log('🔍 Debugging deletion process...');
    
    // First, let's check if we can read the specific order
    console.log('1. Checking if we can read the specific order...');
    const { data: readData, error: readError } = await supabase
      .from('orders_bannos')
      .select('*')
      .eq('id', 'bannos-12345');

    if (readError) {
      console.error('❌ Read Error:', readError);
    } else {
      console.log('✅ Read successful:', readData);
    }

    // Try to update first (to test permissions)
    console.log('2. Testing update permissions...');
    const { data: updateData, error: updateError } = await supabase
      .from('orders_bannos')
      .update({ customer_name: 'John Doe Updated' })
      .eq('id', 'bannos-12345')
      .select();

    if (updateError) {
      console.error('❌ Update Error:', updateError);
    } else {
      console.log('✅ Update successful:', updateData);
    }

    // Now try delete
    console.log('3. Attempting delete...');
    const { data: deleteData, error: deleteError } = await supabase
      .from('orders_bannos')
      .delete()
      .eq('id', 'bannos-12345')
      .select();

    if (deleteError) {
      console.error('❌ Delete Error:', deleteError);
    } else {
      console.log('✅ Delete successful:', deleteData);
    }

    // Check final state
    console.log('4. Checking final state...');
    const { data: finalData, error: finalError } = await supabase
      .from('orders_bannos')
      .select('id, customer_name, product_title');

    if (finalError) {
      console.error('❌ Final check error:', finalError);
    } else {
      console.log('📊 Final orders:');
      finalData.forEach(order => {
        console.log(`  - ${order.id}: ${order.customer_name} - ${order.product_title}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

debugDelete();
