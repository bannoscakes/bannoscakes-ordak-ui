// Deno/Edge function: verify Shopify HMAC and store idempotency marker (per shop).
// Topics handled now: orders/create, orders/updated (no-op body save; real splitting later).

import { serve } from "std/http/server.ts";

const APP_SECRET = Deno.env.get("SHOPIFY_APP_SECRET") ?? ""; // set in Supabase secrets

function signHmac(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  ).then((k) =>
    crypto.subtle.sign("HMAC", k, encoder.encode(body)).then((buf) =>
      btoa(String.fromCharCode(...new Uint8Array(buf)))
    )
  );
}

async function verifyHmac(body: string, provided: string | null) {
  if (!provided) return { ok: false, expected: "(missing)" };
  if (!APP_SECRET) return { ok: false, expected: "(no secret)" };
  const expected = await signHmac(body, APP_SECRET);
  const ok = crypto.timingSafeEqual(
    new TextEncoder().encode(provided),
    new TextEncoder().encode(expected),
  );
  return { ok, expected };
}

serve(async (req) => {
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  const topic = req.headers.get("X-Shopify-Topic") ?? "unknown";
  const hookId = req.headers.get("X-Shopify-Webhook-Id");
  const hmac = req.headers.get("X-Shopify-Hmac-Sha256");
  const shopDomain = req.headers.get("X-Shopify-Shop-Domain") ?? "unknown";

  // Early validation: must have webhook id and shop domain
  if (!hookId) {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/dead_letter`, {
      method: "POST",
      headers: {
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        created_at: new Date().toISOString(),
        payload: { topic, shop_domain: shopDomain },
        reason: "missing_webhook_id",
      }),
    });
    return new Response("missing webhook id", { status: 400 });
  }
  if (shopDomain === "unknown") {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/dead_letter`, {
      method: "POST",
      headers: {
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        created_at: new Date().toISOString(),
        payload: { topic },
        reason: "missing_shop_domain",
      }),
    });
    return new Response("missing shop domain", { status: 400 });
  }

  try {
    // Idempotency check by (id, shop_domain); fail fast on REST error.
    const existsRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/processed_webhooks?id=eq.${encodeURIComponent(hookId)}&shop_domain=eq.${encodeURIComponent(shopDomain)}&select=id`,
      {
        headers: {
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
        },
      }
    );
    if (!existsRes.ok) {
      throw new Error(`Idempotency check failed: ${existsRes.status}`);
    }
    const rows = await existsRes.json();
    if (Array.isArray(rows) && rows.length > 0) {
      // Already processed → fast 200
      return new Response("ok", { status: 200 });
    }

    // Read body only after idempotency check passes
    const raw = await req.text();

    const { ok: hmacOk, expected } = await verifyHmac(raw, hmac);
    if (!hmacOk) {
      // record rejection (per store) — no random UUID fallback
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/rest/v1/processed_webhooks`,
        {
          method: "POST",
          headers: {
            apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            id: hookId,
            shop_domain: shopDomain,
            topic,
            status: "rejected",
            http_hmac: hmac,
            note: "HMAC invalid; expected " + expected,
          }),
        }
      );
      return new Response("unauthorized", { status: 401 });
    }

    // Parse JSON only after HMAC ok (kept for future splitting)
    let body: unknown = {};
    try { body = JSON.parse(raw); } catch { /* ignore */ }

    // Mark processed — no random UUID fallback
    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/processed_webhooks`,
      {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          id: hookId,
          shop_domain: shopDomain,
          topic,
          status: "ok",
          http_hmac: hmac,
        }),
      }
    );

    return new Response("ok", { status: 200 });
  } catch (e) {
    // dead_letter fallback
    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/dead_letter`,
      {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          created_at: new Date().toISOString(),
          payload: { topic, shop_domain: shopDomain, error: String(e) },
          reason: "webhook_unhandled",
        }),
      }
    );
    return new Response("error", { status: 500 });
  }
});
