import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function tryUpsertDelete() {
  try {
    console.log('🔄 Trying upsert approach to "delete"...');
    
    // Try to update the order to mark it as deleted (soft delete approach)
    const { data: updateData, error: updateError } = await supabase
      .from('orders_bannos')
      .update({ 
        customer_name: 'DELETED_ORDER',
        product_title: 'DELETED_PRODUCT',
        stage: 'DELETED'
      })
      .eq('id', 'bannos-12345')
      .select();

    if (updateError) {
      console.error('❌ Update Error:', updateError);
    } else {
      console.log('✅ Update result:', updateData);
    }

    // Check if the update worked
    const { data: checkData, error: checkError } = await supabase
      .from('orders_bannos')
      .select('id, customer_name, product_title, stage')
      .eq('id', 'bannos-12345');

    if (checkError) {
      console.error('❌ Check Error:', checkError);
    } else {
      console.log('📊 Order after update:', checkData);
    }

    // If soft delete worked, let's try the actual delete again
    if (updateData && updateData.length > 0) {
      console.log('🔄 Soft delete worked, trying hard delete...');
      const { data: deleteData, error: deleteError } = await supabase
        .from('orders_bannos')
        .delete()
        .eq('id', 'bannos-12345')
        .select();

      if (deleteError) {
        console.error('❌ Hard Delete Error:', deleteError);
      } else {
        console.log('✅ Hard Delete result:', deleteData);
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

tryUpsertDelete();
