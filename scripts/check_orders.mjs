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

async function main() {
  console.log('🧪 Reading Bannos orders from DB...');
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, store, delivery_date, stage, created_at')
    .ilike('store', 'Bannos%')
    .order('delivery_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('✖ Read error:', error);
    process.exit(1);
  }

  console.log(`✅ Total: ${data.length}`);
  data.forEach((o, i) => {
    console.log(
      `${String(i + 1).padStart(3, '0')} | ${o.id} | #${o.order_number} | ${o.store} | ${o.delivery_date?.slice(0,10)} | stage=${o.stage}`
    );
  });
}

main();
