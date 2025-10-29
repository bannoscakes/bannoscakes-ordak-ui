// Deno/Edge function: verify Shopify HMAC and store idempotency marker (per shop).
// Topics handled now: orders/create, orders/updated (no-op body save; real splitting later).

import { serve } from "std/http/server.ts";
import { timingSafeEqual } from "https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts";
import { decode as b64decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const APP_SECRET = Deno.env.get("SHOPIFY_APP_SECRET") ?? ""; // legacy (fallback)
// Per-store secrets (set in Supabase PROD)
const SECRET_BANNOS = Deno.env.get("SHOPIFY_APP_SECRET_BANNOS") ?? "";
const SECRET_FLOUR  = Deno.env.get("SHOPIFY_APP_SECRET_FLOUR")  ?? "";

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

function resolveStoreSecret(req: Request, shopDomainHeader: string) {
  const url = new URL(req.url);
  const qs = (url.searchParams.get("store") ?? "").toLowerCase();
  if (qs === "bannos") return { store: "bannos", secret: SECRET_BANNOS };
  if (qs === "flour")  return { store: "flour",  secret: SECRET_FLOUR  };
  const domain = (shopDomainHeader || "").toLowerCase();
  if (domain.includes("bannos")) return { store: "bannos", secret: SECRET_BANNOS };
  if (domain.includes("flour"))  return { store: "flour",  secret: SECRET_FLOUR  };
  return { store: "unknown", secret: "" };
}

// --- HMAC helpers (Deno-safe) -----------------------------------------------
async function computeShopifyHmacB64(bodyBytes: Uint8Array, secret: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, bodyBytes));
  let bin = ""; for (let i = 0; i < sig.length; i++) bin += String.fromCharCode(sig[i]);
  return btoa(bin);
}

function timingSafeEqualB64(providedB64: string | null | undefined, expectedB64: string) {
  if (!providedB64 || typeof providedB64 !== "string") {
    return { ok: false, note: "missing or invalid X-Shopify-Hmac-Sha256" };
  }
  const provided = b64decode(providedB64.trim());
  const expected = b64decode(expectedB64);
  if (provided.length !== expected.length) return { ok: false, note: "HMAC length mismatch" };
  return { ok: timingSafeEqual(provided, expected), note: "HMAC invalid" };
}

async function verifyHmac(bodyBytes: Uint8Array, provided: string | null, secret: string) {
  if (!provided) return { ok: false, expected: "(missing)", note: "missing or invalid X-Shopify-Hmac-Sha256" };
  if (!secret)     return { ok: false, expected: "(no secret)", note: "missing shop secret" };
  const expected = await computeShopifyHmacB64(bodyBytes, secret);
  const { ok, note } = timingSafeEqualB64(provided, expected);
  return { ok, expected, note };
}

serve(async (req) => {
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  const topic = req.headers.get("X-Shopify-Topic") ?? "unknown";
  const hookId = req.headers.get("X-Shopify-Webhook-Id");
  const hmac = req.headers.get("X-Shopify-Hmac-Sha256");
  const shopDomain = req.headers.get("X-Shopify-Shop-Domain") ?? "unknown";
  const { store, secret } = resolveStoreSecret(req, shopDomain);

  // Early validation: must have webhook id and shop domain
  if (!hookId) {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/dead_letter`, {
      method: "POST",
      headers: {
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
    const bodyBytes = new Uint8Array(await req.arrayBuffer());

    const { ok: hmacOk, expected, note: hmacNote } = await verifyHmac(bodyBytes, hmac, secret);
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
            apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            status: "rejected",
            http_hmac: hmac,
            note: hmacNote ?? "HMAC invalid",
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
    try { body = JSON.parse(new TextDecoder().decode(bodyBytes)); } catch { /* ignore */ }

    // Enqueue split work (SECURITY DEFINER RPC)
    const rpcRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/enqueue_order_split`,
      {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
      // 1) mark processed_webhooks as error (per-store idempotency row)
      await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/processed_webhooks`, {
        method: "POST",
      headers: {
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          id: hookId,
          shop_domain: shopDomain,
          topic,
          status: "error",
          http_hmac: hmac,
          note: `enqueue_failed: status ${rpcRes.status}`,
        }),
      });

      // 2) dead-letter for investigation
      await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/dead_letter`, {
        method: "POST",
      headers: {
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
            apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
