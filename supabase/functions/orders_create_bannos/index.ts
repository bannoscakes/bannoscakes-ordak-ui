import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyShopifyHmac } from "../_shared/hmac.ts";
import { normalizeShopifyOrder } from "../_shared/order_transform.ts";

serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/health")) return new Response("ok", { status: 200 });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const raw = new Uint8Array(await req.arrayBuffer()); // read ONCE
  const secret =
    Deno.env.get("SHOPIFY_WEBHOOK_SECRET_BANNOS") ||
    Deno.env.get("SHOPIFY_WEBHOOK_SECRET") || "";
  const ok = await verifyShopifyHmac(req.headers, raw, secret);
  if (!ok) return new Response("unauthorized", { status: 401 });

  let payload: any;
  try {
    const bodyText = new TextDecoder("utf-8").decode(raw); // decode SAME bytes
    payload = JSON.parse(bodyText);
  } catch {
    return new Response(JSON.stringify({ ok: false, errors: [{ path: "json", message: "invalid" }] }), {
      status: 422, headers: { "content-type": "application/json" }
    });
  }

  const result = normalizeShopifyOrder(payload, "bannos");
  const status = (result as any).ok ? 200 : 422;
  return new Response(JSON.stringify(result), { status, headers: { "content-type": "application/json" } });
});
  
