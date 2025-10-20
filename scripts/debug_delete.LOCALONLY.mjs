// --- standard header (paste at line 1) ---
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('✖ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Never run mutating scripts in CI/production
if (process.env.CI === 'true' || process.env.NODE_ENV === 'production') {
  console.error('✖ Safety: script disabled in CI/production');
  process.exit(1);
}

export const supabase = createClient(url, key);
// --- /header ---

const orderId = process.argv[2]; // pass a UUID on the CLI
if (!orderId) {
  console.error('Usage: node debug_delete.mjs <order-uuid>');
  process.exit(1);
}

async function main() {
  console.log(`🗑️ Deleting order ${orderId} via RPC...`);
  const { error } = await supabase.rpc('admin_delete_order', { p_order_id: orderId });
  if (error) {
    console.error('✖ Delete error:', error);
    process.exit(1);
  }
  console.log('✅ Deleted.');
}

main();
