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
  
  // timingSafeEqual requires same length; return false early if different
  if (provided.length !== expected.length) {
    return { ok: false, expected };
  }
  
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
    // Atomic idempotency: try to INSERT first (race-condition safe via PRIMARY KEY).
    // If duplicate → already processing/processed → return 200 immediately.
    const claimRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/processed_webhooks`,
      {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: hookId,
          shop_domain: shopDomain,
          topic,
          status: "pending",
        }),
      }
    );

    if (!claimRes.ok) {
      throw new Error(`Failed to claim webhook: ${claimRes.status}`);
    }

    // With ignore-duplicates: 201 always, but check response body
    // New insert = body contains row, Duplicate = empty array []
    const claimData = await claimRes.json();
    if (Array.isArray(claimData) && claimData.length === 0) {
      // Duplicate: already claimed by another request or already processed
      return new Response("ok", { status: 200 });
    }

    // We successfully claimed it (non-empty response) → read body and process
    const raw = await req.text();

    const { ok: hmacOk, expected } = await verifyHmac(raw, hmac);
    if (!hmacOk) {
      // Update status to rejected (don't leak expected HMAC)
      // Use URLSearchParams to safely build query (prevents injection)
      const rejectParams = new URLSearchParams();
      rejectParams.set("id", `eq.${hookId}`);
      rejectParams.set("shop_domain", `eq.${shopDomain}`);
      const rejectRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/rest/v1/processed_webhooks?${rejectParams}`,
        {
          method: "PATCH",
          headers: {
            apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            status: "rejected",
            http_hmac: hmac,
            note: "HMAC invalid",
          }),
        }
      );
      if (!rejectRes.ok) {
        throw new Error(`Failed to record rejected webhook: ${rejectRes.status}`);
      }
      return new Response("unauthorized", { status: 401 });
    }

    // Parse JSON only after HMAC ok (kept for future splitting)
    let body: unknown = {};
    try { body = JSON.parse(raw); } catch { /* ignore */ }

    // Enqueue split work (SECURITY DEFINER RPC)
    const rpcRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/enqueue_order_split`,
      {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_shop_domain: shopDomain,
          p_topic: topic,
          p_hook_id: hookId,
          p_body: body as unknown as Record<string, unknown>,
        }),
      }
    );

    if (!rpcRes.ok) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/dead_letter`, {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          created_at: new Date().toISOString(),
          payload: { topic, shop_domain: shopDomain, hook_id: hookId, rpc_status: rpcRes.status },
          reason: "enqueue_failed",
        }),
      });
      return new Response("enqueue failed", { status: 500 });
    }

    // Update status to ok
    // Use URLSearchParams to safely build query (prevents injection)
    const markParams = new URLSearchParams();
    markParams.set("id", `eq.${hookId}`);
    markParams.set("shop_domain", `eq.${shopDomain}`);
    const markRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/processed_webhooks?${markParams}`,
      {
        method: "PATCH",
        headers: {
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          status: "ok",
          http_hmac: hmac,
        }),
      }
    );
    if (!markRes.ok) {
      throw new Error(`Failed to mark processed: ${markRes.status}`);
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    // Mark webhook as error before logging to dead_letter
    if (hookId) {
      const errorParams = new URLSearchParams();
      errorParams.set("id", `eq.${hookId}`);
      errorParams.set("shop_domain", `eq.${shopDomain}`);
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/rest/v1/processed_webhooks?${errorParams}`,
        {
          method: "PATCH",
          headers: {
            apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            status: "error",
            note: String(e).substring(0, 500),
          }),
        }
      ).catch(() => {}); // best effort
    }

    // dead_letter fallback with hookId for correlation
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
          payload: { webhook_id: hookId, topic, shop_domain: shopDomain, error: String(e) },
          reason: "webhook_unhandled",
        }),
      }
    );
    return new Response("error", { status: 500 });
  }
});
