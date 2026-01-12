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
  locationsUpdated?: number;
}

// Pre-fetched store configuration with cached location IDs (ALL active locations)
interface StoreConfig {
  name: string;
  domain: string;
  token: string;
  locationIds: string[]; // All active locations - inventory must be set to 0 at ALL
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

  const searchQuery = `sku:${escapeSkuForSearch(sku)}`;
  console.log(`[sync-inventory] SKU lookup for "${sku}" in ${storeDomain}, query: ${searchQuery}`);

  // Let API errors (rate limiting, 5xx, network) propagate - caller will handle
  // Only return null for actual "not found" (successful query with empty results)
  const result = await shopifyGraphQL(storeDomain, token, query, {
    query: searchQuery,
  });

  const variant = result?.data?.productVariants?.edges?.[0]?.node;
  if (!variant || !variant.inventoryItem?.id) {
    console.log(`[sync-inventory] SKU "${sku}" NOT FOUND in ${storeDomain}. Response: ${JSON.stringify(result?.data?.productVariants)}`);
    return null; // SKU genuinely not found in this store
  }

  console.info(`[sync-inventory] SKU "${sku}" FOUND in ${storeDomain}: variantId=${variant.id}, inventoryItemId=${variant.inventoryItem.id}`);
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

// Get ALL active location IDs (we need to set inventory to 0 at all locations)
// LIMITATION: Fetches up to 50 locations. Pagination not implemented as typical Shopify
// stores have far fewer locations. If a store exceeds 50 active locations, inventory
// won't be zeroed at all of them - would need cursor-based pagination to fix.
async function getLocationIds(
  storeDomain: string,
  token: string
): Promise<string[]> {
  const query = `
    query getLocations {
      locations(first: 50) {
        edges {
          node {
            id
            name
            isActive
          }
        }
      }
    }
  `;

  const result = await shopifyGraphQL(storeDomain, token, query);
  const locations = result?.data?.locations?.edges || [];

  // Log full location details at debug level (verbose)
  console.debug(`[sync-inventory] All locations in ${storeDomain}: ${JSON.stringify(locations.map((e: any) => ({ id: e.node.id, name: e.node.name, isActive: e.node.isActive })))}`);

  // Return ALL active location IDs (not just the first one!)
  const activeLocationIds = locations
    .filter((e: any) => e.node.isActive !== false) // Include if isActive is true or undefined
    .map((e: any) => e.node.id);

  // Log count at info level for quick visibility
  console.info(`[sync-inventory] ${storeDomain}: ${activeLocationIds.length} active locations`);

  return activeLocationIds;
}

// High inventory value used to mark items as "in stock" in Shopify
const IN_STOCK_QUANTITY = 999;

// Valid sync actions and their target quantities
const SYNC_ACTION_QUANTITIES: Record<string, number> = {
  set_out_of_stock: 0,
  set_in_stock: IN_STOCK_QUANTITY,
};

// Get target quantity for a sync_action, throws if unknown action
function getQuantityForSyncAction(syncAction: string): number {
  const quantity = SYNC_ACTION_QUANTITIES[syncAction];
  if (quantity === undefined) {
    throw new Error(`Unknown sync_action: "${syncAction}". Valid actions: ${Object.keys(SYNC_ACTION_QUANTITIES).join(", ")}`);
  }
  return quantity;
}

// Set inventory for a single inventory item at ALL locations
// Uses inventorySetQuantities (the new API, replacing deprecated inventorySetOnHandQuantities)
async function setInventoryAtAllLocations(
  storeDomain: string,
  token: string,
  inventoryItemId: string,
  locationIds: string[],
  quantity: number
): Promise<{ success: boolean; error?: string; locationsUpdated?: number }> {
  if (locationIds.length === 0) {
    return { success: false, error: "No location IDs provided", locationsUpdated: 0 };
  }

  // Use inventorySetQuantities (new API) instead of inventorySetOnHandQuantities (deprecated)
  const mutation = `
    mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
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

  console.log(`[sync-inventory] Setting inventory to ${quantity} at ALL ${locationIds.length} locations: store=${storeDomain}, inventoryItemId=${inventoryItemId}, locationIds=${locationIds.join(", ")}`);

  // Build quantities array - one entry per location
  const quantities = locationIds.map(locationId => ({
    inventoryItemId,
    locationId,
    quantity,
  }));

  try {
    const result = await shopifyGraphQL(storeDomain, token, mutation, {
      input: {
        name: "available",           // Which quantity to set (available = sellable stock)
        reason: "correction",
        ignoreCompareQuantity: true, // Skip compare-and-set since we always want to set to 0
        quantities,
      },
    });

    const userErrors = result?.data?.inventorySetQuantities?.userErrors || [];

    if (userErrors.length > 0) {
      console.error(`[sync-inventory] Inventory update failed with userErrors: ${JSON.stringify(userErrors)}`);
      return {
        success: false,
        error: userErrors.map((e: any) => e.message).join(", "),
        locationsUpdated: 0,
      };
    }

    console.info(`[sync-inventory] Inventory update SUCCESS for ${inventoryItemId} at ${locationIds.length} locations`);
    return { success: true, locationsUpdated: locationIds.length };
  } catch (err) {
    console.error(`[sync-inventory] Inventory update EXCEPTION: ${err}`);
    return {
      success: false,
      error: `${err}`,
      locationsUpdated: 0,
    };
  }
}

// Process accessory - tries all stores, handles both SKU and variant_id formats
async function processAccessory(
  item: QueueItem,
  stores: StoreConfig[]
): Promise<ProcessResult> {
  // Validate sync_action and get target quantity
  let quantity: number;
  try {
    quantity = getQuantityForSyncAction(item.sync_action);
  } catch (err) {
    return {
      queue_id: item.id,
      success: false,
      error: `${err}`,
    };
  }

  // NEW format: SKU-based (multi-store)
  if (item.shopify_ids.sku) {
    return processAccessoryBySku(item, item.shopify_ids.sku, stores, quantity);
  }

  // OLD format: variant_id (legacy - backward compatibility)
  if (item.shopify_ids.variant_id) {
    return processAccessoryByVariantId(item, item.shopify_ids.variant_id, stores, quantity);
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
  stores: StoreConfig[],
  quantity: number
): Promise<ProcessResult> {
  const results: StoreResult[] = [];

  for (const store of stores) {
    const storeResult = await syncAccessoryToStore(sku, store, quantity);
    results.push(storeResult);
  }

  // Count results by type
  const failedCount = results.filter(r => !r.success).length;
  const skippedCount = results.filter(r => r.skipped).length;
  const successCount = results.filter(r => r.success && !r.skipped).length;

  console.log(`[sync-inventory] SKU ${sku} results: ${successCount} synced, ${skippedCount} skipped (not found), ${failedCount} failed`);

  // Determine overall success:
  // - If ANY store failed → fail (retry needed)
  // - If ALL stores skipped → fail (SKU not found anywhere - likely a data issue)
  // - If at least one store succeeded → success
  const allSkipped = skippedCount === results.length && results.length > 0;

  if (allSkipped) {
    console.warn(`[sync-inventory] SKU ${sku} NOT FOUND in any store - marking as failed`);
    return {
      queue_id: item.id,
      success: false,
      error: `SKU "${sku}" not found in any Shopify store (checked: ${stores.map(s => s.name).join(", ")})`,
      shopify_response: { sku, results },
    };
  }

  const overallSuccess = failedCount === 0;

  return {
    queue_id: item.id,
    success: overallSuccess,
    error: overallSuccess ? undefined : results.filter(r => r.error).map(r => `${r.store}: ${r.error}`).join("; "),
    shopify_response: { sku, results },
  };
}

// Sync accessory to a single store by SKU (location IDs pre-cached in StoreConfig)
async function syncAccessoryToStore(
  sku: string,
  store: StoreConfig,
  quantity: number
): Promise<StoreResult> {
  try {
    // Look up variant by SKU
    const variant = await getVariantBySku(store.domain, store.token, sku);

    if (!variant) {
      console.log(`[sync-inventory] SKU ${sku} not found in ${store.name} - skipping`);
      return { store: store.name, success: true, skipped: true };
    }

    // Set inventory at ALL locations (not just one!)
    const result = await setInventoryAtAllLocations(store.domain, store.token, variant.inventoryItemId, store.locationIds, quantity);

    return {
      store: store.name,
      success: result.success,
      error: result.error,
      inventoryItemId: variant.inventoryItemId,
      locationsUpdated: result.locationsUpdated,
    };
  } catch (err) {
    return {
      store: store.name,
      success: false,
      error: `Exception: ${err}`,
      locationsUpdated: 0,
    };
  }
}

// Process accessory by variant_id (legacy - backward compatibility, tries all stores)
// NOTE: variant_id is store-specific, so "all skipped" is treated the same as SKU path
// (fail if not found anywhere) to maintain consistent behavior across both code paths.
async function processAccessoryByVariantId(
  item: QueueItem,
  variantId: string,
  stores: StoreConfig[],
  quantity: number
): Promise<ProcessResult> {
  const results: StoreResult[] = [];

  for (const store of stores) {
    const storeResult = await syncAccessoryByVariantIdToStore(variantId, store, quantity);
    results.push(storeResult);
  }

  // Count results by type (aligned with SKU path for consistency)
  const failedCount = results.filter(r => !r.success).length;
  const skippedCount = results.filter(r => r.skipped).length;

  // Determine overall success (same logic as SKU path):
  // - If ANY store failed → fail (retry needed)
  // - If ALL stores skipped → fail (variant not found anywhere - likely stale data)
  // - If at least one store succeeded → success
  const allSkipped = skippedCount === results.length && results.length > 0;

  if (allSkipped) {
    console.warn(`[sync-inventory] Variant ${variantId} NOT FOUND in any store - marking as failed`);
    return {
      queue_id: item.id,
      success: false,
      error: `Variant "${variantId}" not found in any Shopify store (checked: ${stores.map(s => s.name).join(", ")})`,
      shopify_response: { variantId, results },
    };
  }

  const overallSuccess = failedCount === 0;

  return {
    queue_id: item.id,
    success: overallSuccess,
    error: overallSuccess ? undefined : results.filter(r => r.error).map(r => `${r.store}: ${r.error}`).join("; "),
    shopify_response: { variantId, results },
  };
}

// Sync accessory by variant_id to a single store (legacy, location IDs pre-cached)
async function syncAccessoryByVariantIdToStore(
  variantId: string,
  store: StoreConfig,
  quantity: number
): Promise<StoreResult> {
  try {
    // Get inventory item ID from variant
    const inventoryItemId = await getInventoryItemId(store.domain, store.token, variantId);

    if (!inventoryItemId) {
      console.log(`[sync-inventory] Variant ${variantId} not found in ${store.name} - skipping`);
      return { store: store.name, success: true, skipped: true };
    }

    // Set inventory at ALL locations (not just one!)
    const result = await setInventoryAtAllLocations(store.domain, store.token, inventoryItemId, store.locationIds, quantity);

    return {
      store: store.name,
      success: result.success,
      error: result.error,
      inventoryItemId,
      locationsUpdated: result.locationsUpdated,
    };
  } catch (err) {
    return {
      store: store.name,
      success: false,
      error: `Exception: ${err}`,
      locationsUpdated: 0,
    };
  }
}

// Process cake topper - tries all stores for each product ID
async function processCakeTopper(
  item: QueueItem,
  stores: StoreConfig[]
): Promise<ProcessResult> {
  // Validate sync_action and get target quantity
  let quantity: number;
  try {
    quantity = getQuantityForSyncAction(item.sync_action);
  } catch (err) {
    return {
      queue_id: item.id,
      success: false,
      error: `${err}`,
    };
  }

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
      const storeResult = await syncCakeToppersToStore(productId, store, quantity);
      allResults.push({ productId, ...storeResult });
    }
  }

  // Count results by type (aligned with accessory paths for consistency)
  const failedCount = allResults.filter(r => !r.success).length;
  const skippedCount = allResults.filter(r => r.skipped).length;

  // Determine overall success (same logic as accessory paths):
  // - If ANY store failed → fail (retry needed)
  // - If ALL stores skipped → fail (products not found anywhere - likely stale data)
  // - If at least one store succeeded → success
  const allSkipped = skippedCount === allResults.length && allResults.length > 0;

  if (allSkipped) {
    console.warn(`[sync-inventory] Product IDs ${productIds.join(", ")} NOT FOUND in any store - marking as failed`);
    return {
      queue_id: item.id,
      success: false,
      error: `Product IDs "${productIds.join(", ")}" not found in any Shopify store (checked: ${stores.map(s => s.name).join(", ")})`,
      shopify_response: { productIds, results: allResults },
    };
  }

  const overallSuccess = failedCount === 0;

  return {
    queue_id: item.id,
    success: overallSuccess,
    error: overallSuccess ? undefined : allResults.filter(r => r.error).map(r => `${r.store}/${r.productId}: ${r.error}`).join("; "),
    shopify_response: { productIds, results: allResults },
  };
}

// Sync cake topper product to a single store (location IDs pre-cached)
async function syncCakeToppersToStore(
  productId: string,
  store: StoreConfig,
  quantity: number
): Promise<StoreResult> {
  try {
    // Get all variants for this product
    const variants = await getProductInventoryItems(store.domain, store.token, productId);

    if (variants.length === 0) {
      console.log(`[sync-inventory] Product ${productId} not found in ${store.name} - skipping`);
      return { store: store.name, success: true, skipped: true };
    }

    // Set each variant's inventory at ALL locations
    // All-or-nothing: if ANY variant fails, mark entire sync as failed so queue retries
    // This ensures atomic stock state (all variants = same quantity, not partial)
    // NOTE: Sequential processing is intentional to avoid Shopify rate limiting.
    // Products typically have few variants; parallelism would add complexity for minimal gain.
    const errors: string[] = [];
    let successCount = 0;
    let totalLocationsUpdated = 0;

    for (const variant of variants) {
      const result = await setInventoryAtAllLocations(store.domain, store.token, variant.inventoryItemId, store.locationIds, quantity);
      if (result.success) {
        successCount++;
        totalLocationsUpdated += result.locationsUpdated || 0;
      } else {
        errors.push(`${variant.inventoryItemId}: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      return { store: store.name, success: false, error: errors.join("; "), variantCount: variants.length, locationsUpdated: totalLocationsUpdated };
    }

    return { store: store.name, success: true, variantCount: successCount, locationsUpdated: totalLocationsUpdated };
  } catch (err) {
    return { store: store.name, success: false, error: `Exception: ${err}`, locationsUpdated: 0 };
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

    // Pre-fetch ALL location IDs for each store (cached for all items)
    // This reduces API calls from O(items * stores) to O(stores)
    // Uses retry with exponential backoff to handle transient Shopify issues
    const stores: StoreConfig[] = [];
    const locationErrors: string[] = [];

    if (bannosToken) {
      const retryResult = await withRetry(
        async () => {
          const locationIds = await getLocationIds(STORES.bannos.domain, bannosToken);
          if (locationIds.length === 0) throw new Error("No locations returned from Shopify");
          return locationIds;
        },
        "Bannos location IDs fetch"
      );

      if (retryResult.success) {
        stores.push({ name: "bannos", domain: STORES.bannos.domain, token: bannosToken, locationIds: retryResult.result });
        console.log(`[sync-inventory-to-shopify] Bannos configured with ${retryResult.result.length} locations`);
      } else {
        const errorMsg = `Bannos: ${retryResult.lastError.message}`;
        locationErrors.push(errorMsg);
        console.error(`[sync-inventory-to-shopify] CRITICAL: Failed to get Bannos location IDs after ${RETRY_CONFIG.maxAttempts} attempts - store will not sync`);
      }
    }

    if (flourlaneToken) {
      const retryResult = await withRetry(
        async () => {
          const locationIds = await getLocationIds(STORES.flourlane.domain, flourlaneToken);
          if (locationIds.length === 0) throw new Error("No locations returned from Shopify");
          return locationIds;
        },
        "Flourlane location IDs fetch"
      );

      if (retryResult.success) {
        stores.push({ name: "flourlane", domain: STORES.flourlane.domain, token: flourlaneToken, locationIds: retryResult.result });
        console.log(`[sync-inventory-to-shopify] Flourlane configured with ${retryResult.result.length} locations`);
      } else {
        const errorMsg = `Flourlane: ${retryResult.lastError.message}`;
        locationErrors.push(errorMsg);
        console.error(`[sync-inventory-to-shopify] CRITICAL: Failed to get Flourlane location IDs after ${RETRY_CONFIG.maxAttempts} attempts - store will not sync`);
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
