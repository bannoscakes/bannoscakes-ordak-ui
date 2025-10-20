import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteDirect() {
  try {
    console.log('🗑️  Attempting direct SQL deletion...');
    
    // Try using RPC to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: "DELETE FROM public.orders_bannos WHERE id = 'bannos-12345';"
    });

    if (error) {
      console.error('❌ RPC Error:', error);
      
      // Fallback: try the regular delete again with more details
      console.log('🔄 Trying regular delete with more details...');
      const { data: deleteData, error: deleteError } = await supabase
        .from('orders_bannos')
        .delete()
        .eq('id', 'bannos-12345')
        .select();

      if (deleteError) {
        console.error('❌ Delete Error:', deleteError);
      } else {
        console.log('✅ Delete result:', deleteData);
      }
    } else {
      console.log('✅ RPC Delete successful:', data);
    }
    
    // Check remaining orders
    const { data: remaining, error: fetchError } = await supabase
      .from('orders_bannos')
      .select('id, customer_name, product_title');

    if (fetchError) {
      console.error('❌ Error fetching remaining:', fetchError);
    } else {
      console.log('📊 Remaining orders after deletion:');
      remaining.forEach(order => {
        console.log(`  - ${order.id}: ${order.customer_name} - ${order.product_title}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

deleteDirect();
