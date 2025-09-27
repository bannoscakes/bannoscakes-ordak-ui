import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyShopifyHmac } from "../_shared/hmac.ts";

// Edge secret to set later in Supabase: SHOPIFY_WEBHOOK_SECRET_FLOURLANE
const SECRET = Deno.env.get("SHOPIFY_WEBHOOK_SECRET_FLOURLANE") ?? "";

serve(async (req: Request) => {
  if (req.method === "GET") return new Response("ok", { status: 200 }); // /healthz style

  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const raw = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  const ok = await verifyShopifyHmac(SECRET, raw, hmac);
  if (!ok) return new Response("invalid hmac", { status: 401 });

  console.log("orders_create_flourlane OK");
  return new Response("ok", { status: 200 });
});
