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
      body: JSON.stringify({ normalized }),
    });
  } catch { /* swallow */ }
}

serve(async (req) => {
  const url = new URL(req.url);
feat/functions-orders-transform
  if (req.method === "GET" && url.pathname.endsWith("/health")) {
    return new Response("ok", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const raw = new Uint8Array(await req.arrayBuffer());
  const secret =
    Deno.env.get("SHOPIFY_WEBHOOK_SECRET_FLOURLANE") ||
    Deno.env.get("SHOPIFY_WEBHOOK_SECRET") ||
    "";
  if (req.method === "GET" && url.pathname.endsWith("/health")) return new Response("ok", { status: 200 });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const raw = new Uint8Array(await req.arrayBuffer());
  const secret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET_FLOURLANE") || Deno.env.get("SHOPIFY_WEBHOOK_SECRET") || "";
  const ok = await verifyShopifyHmac(req.headers, raw, secret);
  if (!ok) return new Response("unauthorized", { status: 401 });

  let payload: any;
  try {
    const bodyText = new TextDecoder("utf-8").decode(raw);
    payload = JSON.parse(bodyText);
  } catch {
    return new Response(JSON.stringify({ ok: false, errors: [{ path: "json", message: "invalid" }] }), {
feat/functions-orders-transform
      status: 422,
      headers: { "content-type": "application/json" },
    });
  }

  const result = normalizeShopifyOrder(payload, 'flourlane');
  if ((result as any).ok) { await tryIngest((result as any).normalized); }
      status: 422, headers: { "content-type": "application/json" }
    });
  }

  const result = normalizeShopifyOrder(payload, "flourlane");
  if ((result as any).ok) await tryIngest((result as any).normalized);
  const status = (result as any).ok ? 200 : 422;
  return new Response(JSON.stringify(result), { status, headers: { "content-type": "application/json" } });
