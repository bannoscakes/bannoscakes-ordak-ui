// deno run -A supabase/functions/_tools/normalize_preview.ts <payload.json> <bannos|flourlane>
import { normalizeShopifyOrder } from "../_shared/order_transform.ts";

const [file, storeArg] = Deno.args;
if (!file || !storeArg || !/^(bannos|flourlane)$/i.test(storeArg)) {
  console.error("Usage: deno run -A supabase/functions/_tools/normalize_preview.ts <payload.json> <bannos|flourlane>");
  Deno.exit(1);
}
const store = storeArg.toLowerCase() as "bannos" | "flourlane";
const raw = await Deno.readTextFile(file);
const payload = JSON.parse(raw);
const result = normalizeShopifyOrder(payload, store);
console.log(JSON.stringify(result, null, 2));
