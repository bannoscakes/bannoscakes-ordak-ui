import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyShopifyHmac } from "../_shared/hmac.ts";
import { normalizeShopifyOrder } from "../_shared/order_transform.ts";

async function tryIngest(normalized: unknown) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    await fetch(`${url}/rest/v1/rpc/ingest_order`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: key, authorization: `Bearer ${key}` },
      body: JSON.stringify({ normalized })
    });
  } catch (_e) {
    // swallow
  }
}

// Edge secret to set later in Supabase: SHOPIFY_WEBHOOK_SECRET_FLOURLANE
const SECRET = Deno.env.get("SHOPIFY_WEBHOOK_SECRET_FLOURLANE") ?? "";

serve(async (req: Request) => {
  if (req.method === "GET") return new Response("ok", { status: 200 }); // /healthz style

  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const raw = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  const ok = await verifyShopifyHmac(SECRET, raw, hmac);
  if (!ok) return new Response("invalid hmac", { status: 401 });

  let payload: any;
  try { payload = JSON.parse(raw); }
  catch {
    return new Response(JSON.stringify({ ok: false, errors: [{ path: 'json', message: 'invalid' }] }), { status: 422, headers: { "content-type": "application/json" } });
  }
  const result = normalizeShopifyOrder(payload, 'flourlane');
  if ((result as any).ok) { await tryIngest((result as any).normalized); }
  const status = (result as any).ok ? 200 : 422;
  return new Response(JSON.stringify(result), { status, headers: { "content-type": "application/json" } });
});
