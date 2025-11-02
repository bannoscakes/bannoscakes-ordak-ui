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
import { normalizeShopifyOrder } from "./normalize.ts";

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

// --- Order ingestion helpers -----------------------------------------------

/**
 * Check if an order with the given GID already exists (idempotency).
 * 
 * @param table - Target table (orders_bannos or orders_flourlane)
 * @param gid - Shopify order GID (admin_graphql_api_id)
 * @returns true if order already exists
 */
async function existsByGid(table: "orders_bannos" | "orders_flourlane", gid: string): Promise<boolean> {
  const params = new URLSearchParams({ 
    select: "shopify_order_gid", 
    shopify_order_gid: `eq.${gid}`, 
    limit: "1" 
  });
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
      Accept: "application/json",
    },
  });
  const data = await res.json().catch(() => []);
  return Array.isArray(data) && data.length > 0;
}

/**
 * Insert normalized order into the appropriate table.
 * Uses resolution=ignore-duplicates to handle race conditions gracefully.
 * 
 * @param table - Target table (orders_bannos or orders_flourlane)
 * @param row - Normalized order data
 * @returns true if inserted, false if duplicate (race condition)
 */
async function insertOrder(table: "orders_bannos" | "orders_flourlane", row: any): Promise<boolean> {
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=ignore-duplicates",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    throw new Error(`Failed to insert order: ${res.status}`);
  }
  // If response body is empty, it was a duplicate (gracefully ignored)
  const data = await res.json().catch(() => null);
  return data !== null && (Array.isArray(data) ? data.length > 0 : !!data);
}

/**
 * Call the stock deduction RPC after order insert.
 * 
 * @param order_gid - Shopify order GID
 * @param payload - Full order JSON payload
 * @param topic - Actual webhook topic (orders/create or orders/updated)
 * @param hookId - Webhook ID for dead_letter logging
 * @param shopDomain - Shop domain for dead_letter logging
 * @returns Promise<boolean> - true if successful, false if failed
 */
async function deductOnCreate(
  order_gid: string, 
  payload: unknown, 
  topic: string,
  hookId: string, 
  shopDomain: string
): Promise<boolean> {
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/deduct_on_order_create`, {
      method: "POST",
      headers: {
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ order_gid, payload }),
    });
    
    if (!res.ok) {
      // Log stock deduction failure to dead_letter for manual intervention
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
            topic,  // Use actual topic from webhook header
            shop_domain: shopDomain, 
            hook_id: hookId, 
            order_gid,
            rpc_status: res.status 
          },
          reason: "stock_deduction_failed",
        }),
      }).catch(() => {}); // best-effort logging
      return false;
    }
    
    return true;
  } catch (error) {
    // Network error or other exception
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
          topic,  // Use actual topic from webhook header
          shop_domain: shopDomain, 
          hook_id: hookId, 
          order_gid,
          error: String(error)
        },
        reason: "stock_deduction_exception",
      }),
    }).catch(() => {}); // best-effort logging
    return false;
  }
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

    // Resolve store secret - MUST use shopDomain from header, not query param (security)
    const secret = resolveStoreSecret(shopDomain);

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
          payload: { topic, shop_domain: shopDomain },
          reason: `missing_secret_for_${shopDomain}`,
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
      await fetch(
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
      ).catch(() => {}); // best-effort: webhook already rejected, don't retry
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

    // --- Order Ingestion Pipeline -------------------------------------------
    // Normalize order using kitchen-docket parity rules
    // SECURITY: Pass authenticated shopDomain from header, not payload
    const norm = normalizeShopifyOrder(body, shopDomain);
    const table = norm.shopPrefix === "bannos" ? "orders_bannos" : "orders_flourlane";

    // Idempotency: check if order already exists by GID
    if (!norm.shopify_order_gid) {
      // Update webhook status to error before returning
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
            note: "missing_order_gid",
          }),
        }
      ).catch(() => {}); // best-effort

      // Also log to dead_letter for investigation
      await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/dead_letter`, {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          created_at: new Date().toISOString(),
          payload: { topic, shop_domain: shopDomain, hook_id: hookId },
          reason: "missing_order_gid",
        }),
      }).catch(() => {});
      return new Response("missing order_gid", { status: 400 });
    }

    if (await existsByGid(table, norm.shopify_order_gid)) {
      // Order already ingested, mark webhook as processed (idempotent)
      const dupParams = new URLSearchParams();
      dupParams.set("id", `eq.${hookId}`);
      dupParams.set("shop_domain", `eq.${shopDomain}`);
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/rest/v1/processed_webhooks?${dupParams}`,
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
            note: "duplicate_order_gid",
          }),
        }
      ).catch(() => {}); // best-effort
      return new Response("ok", { status: 200 });
    }

    // Insert normalized order (race-safe with resolution=ignore-duplicates)
    const wasInserted = await insertOrder(table, {
      id: norm.id,
      shopify_order_id: norm.shopify_order_id,
      shopify_order_gid: norm.shopify_order_gid,
      shopify_order_number: norm.shopify_order_number,
      customer_name: norm.customer_name,
      product_title: norm.product_title,
      flavour: norm.flavour,
      notes: norm.notes,
      currency: norm.currency,
      total_amount: norm.total_amount,
      order_json: norm.order_json,
      stage: "Filling",
      priority: null,
      due_date: norm.due_date,
      delivery_method: norm.delivery_method
    });

    // If duplicate detected at insert time (race condition), mark as processed and exit
    if (!wasInserted) {
      const raceParams = new URLSearchParams();
      raceParams.set("id", `eq.${hookId}`);
      raceParams.set("shop_domain", `eq.${shopDomain}`);
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/rest/v1/processed_webhooks?${raceParams}`,
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
            note: "duplicate_order_gid_race",
          }),
        }
      ).catch(() => {}); // best-effort
      return new Response("ok", { status: 200 });
    }

    // Stock deduction + queue work (only if actually inserted)
    const stockDeducted = await deductOnCreate(
      norm.shopify_order_gid, 
      norm.order_json, 
      topic,  // Pass actual topic (orders/create or orders/updated)
      hookId, 
      shopDomain
    );

    // Enqueue split work (best-effort: order already persisted above)
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
    ).catch(() => null);

    if (!rpcRes || !rpcRes.ok) {
      // Best-effort: log failure but don't fail the webhook (order already inserted)
      await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/dead_letter`, {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          created_at: new Date().toISOString(),
          payload: { topic, shop_domain: shopDomain, hook_id: hookId, rpc_status: rpcRes?.status },
          reason: "enqueue_failed",
        }),
      }).catch(() => {}); // best-effort logging
      // Note: we don't update processed_webhooks to "error" or return 500
      // because the order was successfully ingested (the critical operation succeeded)
    }

    // Update status to ok (or ok with warning if stock deduction failed)
    // Use URLSearchParams to safely build query (prevents injection)
    const markParams = new URLSearchParams();
    markParams.set("id", `eq.${hookId}`);
    markParams.set("shop_domain", `eq.${shopDomain}`);
    await fetch(
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
          note: stockDeducted ? undefined : "warning: stock_deduction_failed (see dead_letter)",
        }),
      }
    ).catch(() => {}); // best-effort: processing already succeeded, don't retry

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
