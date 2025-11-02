// @ts-nocheck - Deno globals are available in Supabase Edge Functions runtime

/**
 * Shopify webhook handler for Edge Functions.
 * 
 * Verifies HMAC signatures, enforces per-store idempotency, and enqueues
 * order split work via SECURITY DEFINER RPC.
 * 
 * @module shopify-webhooks
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { timingSafeEqual } from "https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts";
import { decode as b64decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { resolveStoreSecret } from "./resolve.ts";

// --- HMAC helpers (Deno-safe) -----------------------------------------------
async function computeShopifyHmacB64(bodyBytes: Uint8Array, secret: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, bodyBytes));
  let bin = ""; for (let i = 0; i < sig.length; i++) bin += String.fromCharCode(sig[i]);
  return btoa(bin);
}

function timingSafeEqualB64(
  providedB64: string | null | undefined,
  expectedB64: string
): { ok: true } | { ok: false; note: string } {
  if (!providedB64 || typeof providedB64 !== "string") {
    return { ok: false, note: "missing or invalid X-Shopify-Hmac-Sha256" };
  }
  let provided: Uint8Array;
  let expected: Uint8Array;
  try {
    // Trim in case Shopify adds whitespace
    provided = b64decode(providedB64.trim());
    expected = b64decode(expectedB64);
  } catch {
    // Don't throw → avoid 500; mark unauthorized cleanly
    return { ok: false, note: "invalid base64 in HMAC" };
  }
  if (provided.length !== expected.length) {
    return { ok: false, note: "HMAC length mismatch" };
  }
  const ok = timingSafeEqual(provided, expected);
  return ok ? { ok: true } : { ok: false, note: "HMAC invalid" };
}

/**
 * Verify a provided Shopify HMAC against the computed HMAC for the raw request body.
 *
 * @param bodyBytes - Raw request body bytes used to compute the expected HMAC
 * @param provided - Value of the `X-Shopify-Hmac-Sha256` header (may be null)
 * @param secret - Per-store secret used to compute the HMAC
 * @returns An object with:
 *  - `ok`: `true` if the provided HMAC matches the computed HMAC, `false` otherwise.
 *  - `expected`: the computed HMAC as a base64 string, or a marker string when missing secret or header.
 *  - `note`: a short explanation when verification fails or input is missing.
 */
async function verifyHmac(bodyBytes: Uint8Array, provided: string | null, secret: string) {
  if (!provided) return { ok: false, expected: "(missing)", note: "missing or invalid X-Shopify-Hmac-Sha256" };
  if (!secret)     return { ok: false, expected: "(no secret)", note: "missing shop secret" };
  const expected = await computeShopifyHmacB64(bodyBytes, secret);
  const { ok, note } = timingSafeEqualB64(provided, expected);
  return { ok, expected, note };
}

/**
 * Check whether a Shopify webhook topic is supported for processing.
 *
 * Reads the allowlist from WEBHOOK_ALLOWLIST env var (comma-separated, lowercased).
 * Falls back to orders/create and orders/updated if not set.
 *
 * @param topic - The Shopify webhook topic header value (e.g., "orders/create")
 * @returns `true` if topic is in the allowlist, `false` otherwise.
 */
function isTopicAllowed(topic: string): boolean {
  const allowlistRaw = Deno.env.get("WEBHOOK_ALLOWLIST") ?? "orders/create,orders/updated";
  const allowlist = allowlistRaw.toLowerCase().split(",").map(t => t.trim());
  return allowlist.includes(topic.toLowerCase());
}

serve(async (req) => {
  try {
    const method = req.method.toUpperCase();
    if (method === "GET") {
      return new Response("ok", { status: 200 });
    }
    if (method !== "POST") {
      return new Response("method not allowed", {
        status: 405,
        headers: { "Allow": "GET, POST" },
      });
    }

    const topic = req.headers.get("X-Shopify-Topic") ?? "unknown";
    const hookId = req.headers.get("X-Shopify-Webhook-Id");
    const hmac = req.headers.get("X-Shopify-Hmac-Sha256");
    const shopDomain = req.headers.get("X-Shopify-Shop-Domain") ?? "unknown";

    // Resolve store secret using new resolver
    const url = new URL(req.url);
    const hint = url.searchParams.get("store") ?? req.headers.get("X-Shopify-Shop-Domain");
    const secret = resolveStoreSecret(hint);

    // Early validation: must have secret, webhook id, and shop domain
    if (!secret) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/dead_letter`, {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          created_at: new Date().toISOString(),
          payload: { topic, shop_domain: shopDomain, hint },
          reason: `missing_secret_for_${hint}`,
        }),
      }).catch(() => {}); // best-effort logging
      return new Response("missing secret", { status: 401 });
    }
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
      }).catch(() => {}); // best-effort logging
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
      }).catch(() => {}); // best-effort logging
      return new Response("missing shop domain", { status: 400 });
    }

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

    // We successfully claimed it (non-empty response) → SINGLE read of body
    const bodyBytes = new Uint8Array(await req.arrayBuffer());

    const { ok: hmacOk, note: hmacNote } = await verifyHmac(bodyBytes, hmac, secret ?? "");
    if (!hmacOk || !isTopicAllowed(topic)) {
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
            note: hmacOk ? "topic not allowed" : (hmacNote ?? "HMAC invalid"),
          }),
        }
      );
      if (!rejectRes.ok) {
        throw new Error(`Failed to record rejected webhook: ${rejectRes.status}`);
      }
      return new Response("unauthorized", { status: 401 });
    }

    // Parse JSON only AFTER HMAC ok
    let body: unknown;
    try {
      body = JSON.parse(new TextDecoder().decode(bodyBytes));
    } catch {
      // JSON parse failed: record as our error, skip enqueue, and return 200 to prevent retries
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
            http_hmac: hmac,
            note: "invalid JSON payload",
          }),
        }
      ).catch(() => {});

      // Optional: dead-letter excerpt (best-effort)
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/dead_letter`, {
          method: "POST",
          headers: {
            apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            created_at: new Date().toISOString(),
            payload: {
              hook_id: hookId,
              topic,
              shop_domain: shopDomain,
              error: "invalid JSON payload",
              excerpt: new TextDecoder().decode(bodyBytes).slice(0, 500),
            },
            reason: "invalid_json",
          }),
        });
      } catch {}

      return new Response("ok", { status: 200 });
    }

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
            http_hmac: hmac,
            note: `enqueue_failed: status ${rpcRes.status}`,
          }),
        }
      ).catch(() => {}); // best-effort update

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
      }).catch(() => {}); // best-effort logging

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
    const topic = req.headers.get("X-Shopify-Topic") ?? "unknown";
    const hookId = req.headers.get("X-Shopify-Webhook-Id");
    const shopDomain = req.headers.get("X-Shopify-Shop-Domain") ?? "unknown";

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
      ).catch(() => {});
    }

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
          payload: { webhook_id: hookId ?? "unknown", topic, shop_domain: shopDomain, error: String(e) },
          reason: "webhook_unhandled",
        }),
      }
    ).catch(() => {});
    return new Response("error", { status: 500 });
  }
});
