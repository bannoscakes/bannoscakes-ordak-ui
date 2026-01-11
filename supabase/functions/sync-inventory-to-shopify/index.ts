// Edge Function: sync-inventory-to-shopify
// Purpose: Process inventory_sync_queue and set items out of stock in Shopify
// Called by: Database webhook on INSERT (instant) or pg_cron (legacy fallback)
// Multi-store: Tries BOTH Bannos and Flourlane for every item
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_API_VERSION = "2025-01";

// Store configurations (domain only - tokens retrieved from env at runtime)
const STORES = {
  bannos: { domain: "bannos.myshopify.com" },
  flourlane: { domain: "flour-lane.myshopify.com" },
};

interface QueueItem {
  id: string;
  item_type: "accessory" | "cake_topper";
  item_id: string;
  sync_action: string;
  shopify_ids: {
    sku?: string;          // NEW: For accessories (SKU-based lookup)
    variant_id?: string;   // OLD: For accessories (legacy, backward compat)
    product_id_1?: string; // For cake toppers
    product_id_2?: string; // For cake toppers
  };
}

interface StoreResult {
  store: string;
  success: boolean;
  skipped?: boolean;
  error?: string;
  inventoryItemId?: string;
  variantCount?: number;
}

// Pre-fetched store configuration with cached location ID
interface StoreConfig {
  name: string;
  domain: string;
  token: string;
  locationId: string;
}

interface ProcessResult {
  queue_id: string;
  success: boolean;
  error?: string;
  shopify_response?: unknown;
}

// Timeout for Shopify API requests (30 seconds)
const SHOPIFY_REQUEST_TIMEOUT_MS = 30000;

// Retry configuration for critical operations
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 100, // Exponential backoff: 100ms, 300ms, 900ms
  backoffMultiplier: 3,
};

// Helper for retrying async operations with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ success: true; result: T } | { success: false; lastError: Error }> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      const result = await operation();
      return { success: true, result };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[sync-inventory-to-shopify] ${operationName} attempt ${attempt}/${RETRY_CONFIG.maxAttempts} failed: ${lastError.message}`
      );

      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delayMs = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  return { success: false, lastError };
}

// Helper to make Shopify GraphQL requests with proper error handling
async function shopifyGraphQL(
  storeDomain: string,
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<{ data: any; errors?: any[] }> {
  // Use AbortController to prevent indefinite hangs if Shopify is slow
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SHOPIFY_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(`Shopify GraphQL errors: ${result.errors.map((e: any) => e.message).join(", ")}`);
    }

    return result;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Shopify API timeout after ${SHOPIFY_REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Get inventory item ID from variant ID
async function getInventoryItemId(
  storeDomain: string,
  token: string,
  variantId: string
): Promise<string | null> {
  const query = `
    query getInventoryItemFromVariant($id: ID!) {
      productVariant(id: $id) {
        inventoryItem {
          id
        }
      }
    }
  `;

  const result = await shopifyGraphQL(storeDomain, token, query, {
    id: `gid://shopify/ProductVariant/${variantId}`,
  });

  return result?.data?.productVariant?.inventoryItem?.id || null;
}

// Escape SKU for Shopify search query syntax
// Special characters can break queries or be interpreted as operators
// Wrap in quotes and escape special chars to treat as literal string
function escapeSkuForSearch(sku: string): string {
  // Order matters: escape backslashes first, then other special chars
  const escaped = sku
    .replace(/\\/g, "\\\\")              // Escape existing backslashes first
    .replace(/"/g, '\\"')                 // Escape double quotes
    .replace(/[:()\[\]{}*?|]/g, "\\$&");  // Escape Shopify operators: colons, parens, brackets, wildcards, OR
  return `"${escaped}"`;
}

// Get variant by SKU - returns null if SKU not found, throws on API errors
async function getVariantBySku(
  storeDomain: string,
  token: string,
  sku: string
): Promise<{ variantId: string; inventoryItemId: string } | null> {
  const query = `
    query getVariantBySku($query: String!) {
      productVariants(first: 1, query: $query) {
        edges {
          node {
            id
            inventoryItem {
              id
            }
          }
        }
      }
    }
  `;

  // Let API errors (rate limiting, 5xx, network) propagate - caller will handle
  // Only return null for actual "not found" (successful query with empty results)
  const result = await shopifyGraphQL(storeDomain, token, query, {
    query: `sku:${escapeSkuForSearch(sku)}`,
  });

  const variant = result?.data?.productVariants?.edges?.[0]?.node;
  if (!variant || !variant.inventoryItem?.id) {
    return null; // SKU genuinely not found in this store
  }

  return {
    variantId: variant.id,
    inventoryItemId: variant.inventoryItem.id,
  };
}

// Get all variant inventory item IDs for a product
async function getProductInventoryItems(
  storeDomain: string,
  token: string,
  productId: string
): Promise<Array<{ variantId: string; inventoryItemId: string }>> {
  const query = `
    query getProductVariants($id: ID!) {
      product(id: $id) {
        variants(first: 100) {
          edges {
            node {
              id
              inventoryItem {
                id
              }
            }
          }
        }
      }
    }
  `;

  const result = await shopifyGraphQL(storeDomain, token, query, {
    id: `gid://shopify/Product/${productId}`,
  });

  const variants = result?.data?.product?.variants?.edges || [];

  return variants.map((edge: any) => ({
    variantId: edge.node.id,
    inventoryItemId: edge.node.inventoryItem?.id,
  })).filter((v: any) => v.inventoryItemId);
}

// Get location ID (we need this for inventory updates)
async function getLocationId(
  storeDomain: string,
  token: string
): Promise<string | null> {
  const query = `
    query getLocations {
      locations(first: 1) {
        edges {
          node {
            id
          }
        }
      }
    }
  `;

  const result = await shopifyGraphQL(storeDomain, token, query);
  return result?.data?.locations?.edges?.[0]?.node?.id || null;
}

// Set inventory to 0 for a single inventory item
async function setInventoryToZero(
  storeDomain: string,
  token: string,
  inventoryItemId: string,
  locationId: string
): Promise<{ success: boolean; error?: string }> {
  const mutation = `
    mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
      inventorySetOnHandQuantities(input: $input) {
        inventoryAdjustmentGroup {
          reason
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const result = await shopifyGraphQL(storeDomain, token, mutation, {
      input: {
        reason: "correction",
        setQuantities: [
          {
            inventoryItemId,
            locationId,
            quantity: 0,
          },
        ],
      },
    });

    const userErrors = result?.data?.inventorySetOnHandQuantities?.userErrors || [];

    if (userErrors.length > 0) {
      return {
        success: false,
        error: userErrors.map((e: any) => e.message).join(", "),
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `${err}`,
    };
  }
}

// Process accessory - tries all stores, handles both SKU and variant_id formats
async function processAccessory(
  item: QueueItem,
  stores: StoreConfig[]
): Promise<ProcessResult> {
  // NEW format: SKU-based (multi-store)
  if (item.shopify_ids.sku) {
    return processAccessoryBySku(item, item.shopify_ids.sku, stores);
  }

  // OLD format: variant_id (legacy - backward compatibility)
  if (item.shopify_ids.variant_id) {
    return processAccessoryByVariantId(item, item.shopify_ids.variant_id, stores);
  }

  return {
    queue_id: item.id,
    success: false,
    error: "No sku or variant_id in shopify_ids",
  };
}

// Process accessory by SKU - tries all configured stores
// NOTE: Sequential processing is intentional to avoid Shopify rate limiting.
// With only 2 stores and low queue volume, latency impact is minimal.
async function processAccessoryBySku(
  item: QueueItem,
  sku: string,
  stores: StoreConfig[]
): Promise<ProcessResult> {
  const results: StoreResult[] = [];

  for (const store of stores) {
    const storeResult = await syncAccessoryToStore(sku, store);
    results.push(storeResult);
  }

  // Determine overall success - require ALL non-skipped stores to succeed
  // This prevents cross-store inventory inconsistency (e.g., out of stock in Bannos but available in Flourlane)
  // If any store fails, the entire item fails and will be retried (setInventoryToZero is idempotent)
  const failedCount = results.filter(r => !r.success).length;

  // Success only if no stores failed (all succeeded or were skipped)
  const overallSuccess = failedCount === 0;

  return {
    queue_id: item.id,
    success: overallSuccess,
    error: overallSuccess ? undefined : results.filter(r => r.error).map(r => `${r.store}: ${r.error}`).join("; "),
    shopify_response: { sku, results },
  };
}

// Sync accessory to a single store by SKU (location ID pre-cached in StoreConfig)
async function syncAccessoryToStore(
  sku: string,
  store: StoreConfig
): Promise<StoreResult> {
  try {
    // Look up variant by SKU
    const variant = await getVariantBySku(store.domain, store.token, sku);

    if (!variant) {
      console.log(`[sync-inventory] SKU ${sku} not found in ${store.name} - skipping`);
      return { store: store.name, success: true, skipped: true };
    }

    // Set inventory to 0 (locationId already cached)
    const result = await setInventoryToZero(store.domain, store.token, variant.inventoryItemId, store.locationId);

    return {
      store: store.name,
      success: result.success,
      error: result.error,
      inventoryItemId: variant.inventoryItemId,
    };
  } catch (err) {
    return {
      store: store.name,
      success: false,
      error: `Exception: ${err}`,
    };
  }
}

// Process accessory by variant_id (legacy - backward compatibility, tries all stores)
async function processAccessoryByVariantId(
  item: QueueItem,
  variantId: string,
  stores: StoreConfig[]
): Promise<ProcessResult> {
  const results: StoreResult[] = [];

  for (const store of stores) {
    const storeResult = await syncAccessoryByVariantIdToStore(variantId, store);
    results.push(storeResult);
  }

  // Determine overall success - require ALL non-skipped stores to succeed
  // This prevents cross-store inventory inconsistency
  // If any store fails, the entire item fails and will be retried (setInventoryToZero is idempotent)
  const failedCount = results.filter(r => !r.success).length;

  // Success only if no stores failed (all succeeded or were skipped)
  const overallSuccess = failedCount === 0;

  return {
    queue_id: item.id,
    success: overallSuccess,
    error: overallSuccess ? undefined : results.filter(r => r.error).map(r => `${r.store}: ${r.error}`).join("; "),
    shopify_response: { variantId, results },
  };
}

// Sync accessory by variant_id to a single store (legacy, location ID pre-cached)
async function syncAccessoryByVariantIdToStore(
  variantId: string,
  store: StoreConfig
): Promise<StoreResult> {
  try {
    // Get inventory item ID from variant
    const inventoryItemId = await getInventoryItemId(store.domain, store.token, variantId);

    if (!inventoryItemId) {
      console.log(`[sync-inventory] Variant ${variantId} not found in ${store.name} - skipping`);
      return { store: store.name, success: true, skipped: true };
    }

    // Set inventory to 0 (locationId already cached)
    const result = await setInventoryToZero(store.domain, store.token, inventoryItemId, store.locationId);

    return {
      store: store.name,
      success: result.success,
      error: result.error,
      inventoryItemId,
    };
  } catch (err) {
    return {
      store: store.name,
      success: false,
      error: `Exception: ${err}`,
    };
  }
}

// Process cake topper - tries all stores for each product ID
async function processCakeTopper(
  item: QueueItem,
  stores: StoreConfig[]
): Promise<ProcessResult> {
  const productIds = [
    item.shopify_ids.product_id_1,
    item.shopify_ids.product_id_2,
  ].filter(Boolean) as string[];

  if (productIds.length === 0) {
    return {
      queue_id: item.id,
      success: false,
      error: "No product_ids in shopify_ids",
    };
  }

  const allResults: { productId: string; store: string; success: boolean; skipped?: boolean; error?: string; variantCount?: number }[] = [];

  for (const productId of productIds) {
    for (const store of stores) {
      const storeResult = await syncCakeToppersToStore(productId, store);
      allResults.push({ productId, ...storeResult });
    }
  }

  // Determine overall success - require ALL non-skipped stores to succeed
  // This prevents cross-store inventory inconsistency
  // If any store fails, the entire item fails and will be retried (setInventoryToZero is idempotent)
  const failedCount = allResults.filter(r => !r.success).length;

  // Success only if no stores failed (all succeeded or were skipped)
  const overallSuccess = failedCount === 0;

  return {
    queue_id: item.id,
    success: overallSuccess,
    error: overallSuccess ? undefined : allResults.filter(r => r.error).map(r => `${r.store}/${r.productId}: ${r.error}`).join("; "),
    shopify_response: { productIds, results: allResults },
  };
}

// Sync cake topper product to a single store (location ID pre-cached)
async function syncCakeToppersToStore(
  productId: string,
  store: StoreConfig
): Promise<StoreResult> {
  try {
    // Get all variants for this product
    const variants = await getProductInventoryItems(store.domain, store.token, productId);

    if (variants.length === 0) {
      console.log(`[sync-inventory] Product ${productId} not found in ${store.name} - skipping`);
      return { store: store.name, success: true, skipped: true };
    }

    // Set each variant's inventory to 0 (locationId already cached)
    // All-or-nothing: if ANY variant fails, mark entire sync as failed so queue retries
    // This ensures atomic "out of stock" state (all variants = 0, not partial)
    // NOTE: Sequential processing is intentional to avoid Shopify rate limiting.
    // Products typically have few variants; parallelism would add complexity for minimal gain.
    const errors: string[] = [];
    let successCount = 0;

    for (const variant of variants) {
      const result = await setInventoryToZero(store.domain, store.token, variant.inventoryItemId, store.locationId);
      if (result.success) {
        successCount++;
      } else {
        errors.push(`${variant.inventoryItemId}: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      return { store: store.name, success: false, error: errors.join("; "), variantCount: variants.length };
    }

    return { store: store.name, success: true, variantCount: successCount };
  } catch (err) {
    return { store: store.name, success: false, error: `Exception: ${err}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Environment checks
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const bannosToken = Deno.env.get("SHOPIFY_ADMIN_TOKEN_BANNOS");
    const flourlaneToken = Deno.env.get("SHOPIFY_ADMIN_TOKEN_FLOURLANE");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[sync-inventory-to-shopify] Missing Supabase env vars");
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bannosToken && !flourlaneToken) {
      console.error("[sync-inventory-to-shopify] Missing all Shopify tokens");
      return new Response(
        JSON.stringify({ error: "Missing Shopify Admin tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Atomically claim pending items using RPC (prevents race conditions)
    const { data: claimedItems, error: claimError } = await supabase
      .rpc("claim_inventory_sync_items", { p_limit: 10 });

    if (claimError) {
      console.error("[sync-inventory-to-shopify] Failed to claim items:", claimError);
      return new Response(
        JSON.stringify({ error: "Failed to claim queue items", details: claimError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!claimedItems || claimedItems.length === 0) {
      console.log("[sync-inventory-to-shopify] No pending items in queue");
      return new Response(
        JSON.stringify({ message: "No pending items", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-inventory-to-shopify] Claimed ${claimedItems.length} items for processing`);

    // Pre-fetch location IDs for each store (cached for all items)
    // This reduces API calls from O(items * stores) to O(stores)
    // Uses retry with exponential backoff to handle transient Shopify issues
    const stores: StoreConfig[] = [];
    const locationErrors: string[] = [];

    if (bannosToken) {
      const retryResult = await withRetry(
        async () => {
          const locationId = await getLocationId(STORES.bannos.domain, bannosToken);
          if (!locationId) throw new Error("No locations returned from Shopify");
          return locationId;
        },
        "Bannos location ID fetch"
      );

      if (retryResult.success) {
        stores.push({ name: "bannos", domain: STORES.bannos.domain, token: bannosToken, locationId: retryResult.result });
      } else {
        const errorMsg = `Bannos: ${retryResult.lastError.message}`;
        locationErrors.push(errorMsg);
        console.error(`[sync-inventory-to-shopify] CRITICAL: Failed to get Bannos location ID after ${RETRY_CONFIG.maxAttempts} attempts - store will not sync`);
      }
    }

    if (flourlaneToken) {
      const retryResult = await withRetry(
        async () => {
          const locationId = await getLocationId(STORES.flourlane.domain, flourlaneToken);
          if (!locationId) throw new Error("No locations returned from Shopify");
          return locationId;
        },
        "Flourlane location ID fetch"
      );

      if (retryResult.success) {
        stores.push({ name: "flourlane", domain: STORES.flourlane.domain, token: flourlaneToken, locationId: retryResult.result });
      } else {
        const errorMsg = `Flourlane: ${retryResult.lastError.message}`;
        locationErrors.push(errorMsg);
        console.error(`[sync-inventory-to-shopify] CRITICAL: Failed to get Flourlane location ID after ${RETRY_CONFIG.maxAttempts} attempts - store will not sync`);
      }
    }

    console.log(`[sync-inventory-to-shopify] Stores configured: ${stores.map(s => s.name).join(", ") || "NONE"}`);

    if (stores.length === 0) {
      // CRITICAL: All stores failed - reset claimed items back to pending for retry
      // Without this, items would be stuck in 'processing' status forever
      const itemIds = (claimedItems as QueueItem[]).map((item) => item.id);
      const { error: rollbackError } = await supabase
        .from("inventory_sync_queue")
        .update({ status: "pending", error_message: "Store initialization failed - will retry" })
        .in("id", itemIds);

      if (rollbackError) {
        console.error(`[sync-inventory-to-shopify] CRITICAL: Failed to rollback items to pending: ${rollbackError.message}`);
      } else {
        console.log(`[sync-inventory-to-shopify] Rolled back ${itemIds.length} items to pending status`);
      }

      console.error(
        `[sync-inventory-to-shopify] CRITICAL: No stores available after retries. Location errors: ${locationErrors.join("; ")}`
      );
      return new Response(
        JSON.stringify({
          error: "No stores available - all location ID fetches failed after retries",
          details: locationErrors,
          rolledBack: itemIds.length,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: ProcessResult[] = [];

    for (const item of claimedItems as QueueItem[]) {
      let result: ProcessResult;

      try {
        if (item.item_type === "accessory") {
          result = await processAccessory(item, stores);
        } else if (item.item_type === "cake_topper") {
          result = await processCakeTopper(item, stores);
        } else {
          result = {
            queue_id: item.id,
            success: false,
            error: `Unknown item_type: ${item.item_type}`,
          };
        }
      } catch (err) {
        result = {
          queue_id: item.id,
          success: false,
          error: `Exception: ${err}`,
        };
      }

      // Update queue item status
      const { error: updateError } = await supabase
        .from("inventory_sync_queue")
        .update({
          status: result.success ? "completed" : "failed",
          error_message: result.error || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      // Log if database update fails after Shopify operation completed
      // This is a critical issue: Shopify state changed but queue won't reflect it
      if (updateError) {
        console.error(
          `[sync-inventory-to-shopify] CRITICAL: Failed to update queue status for ${item.id} after Shopify sync`,
          `Shopify result: ${result.success ? "succeeded" : "failed"}`,
          `DB error: ${updateError.message}`
        );
      }

      results.push(result);

      console.log(
        `[sync-inventory-to-shopify] ${result.success ? "OK" : "FAILED"} ${item.item_type} ${item.item_id}`,
        result.success ? "" : result.error
      );
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(`[sync-inventory-to-shopify] Complete: ${successCount} succeeded, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        processed: results.length,
        succeeded: successCount,
        failed: failedCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync-inventory-to-shopify] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: `${error}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
