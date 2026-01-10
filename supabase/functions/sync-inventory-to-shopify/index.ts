// Edge Function: sync-inventory-to-shopify
// Purpose: Set items out of stock in Shopify when inventory hits zero
// Called by: Trigger via pg_net (real-time) when stock crosses from positive to zero
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

// Store configurations
const STORES: Record<string, { domain: string; tokenEnvVar: string }> = {
  bannos: {
    domain: "bannos.myshopify.com",
    tokenEnvVar: "SHOPIFY_ADMIN_TOKEN_BANNOS",
  },
  flourlane: {
    domain: "flour-lane.myshopify.com",
    tokenEnvVar: "SHOPIFY_ADMIN_TOKEN_FLOURLANE",
  },
};

// Payload from trigger (real-time sync)
interface SyncPayload {
  queue_id?: string;
  item_type: "accessory" | "cake_topper";
  item_id: string;
  sku?: string;
  product_id_1?: string;
  product_id_2?: string;
}

interface StoreResult {
  store: string;
  found: boolean;
  synced: boolean;
  error?: string;
  details?: unknown;
}

interface ProcessResult {
  item_id: string;
  item_type: string;
  success: boolean;
  stores: StoreResult[];
  error?: string;
}

// Helper to make Shopify GraphQL requests with proper error handling
async function shopifyGraphQL(
  storeDomain: string,
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<{ data: any; errors?: any[] }> {
  const response = await fetch(
    `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
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
}

// Find variant by SKU - returns null if not found (not an error)
async function findVariantBySku(
  storeDomain: string,
  token: string,
  sku: string
): Promise<{ variantId: string; inventoryItemId: string } | null> {
  const query = `
    query findVariantBySku($query: String!) {
      productVariants(first: 1, query: $query) {
        edges {
          node {
            id
            sku
            inventoryItem {
              id
            }
          }
        }
      }
    }
  `;

  try {
    const result = await shopifyGraphQL(storeDomain, token, query, {
      query: `sku:${sku}`,
    });

    const variant = result?.data?.productVariants?.edges?.[0]?.node;
    if (!variant || !variant.inventoryItem?.id) {
      return null; // Not found - this is normal, not an error
    }

    return {
      variantId: variant.id,
      inventoryItemId: variant.inventoryItem.id,
    };
  } catch (err) {
    // Log but don't throw - treat as "not found"
    console.log(`[findVariantBySku] SKU "${sku}" not found in ${storeDomain}: ${err}`);
    return null;
  }
}

// Get all variant inventory item IDs for a product - returns empty array if not found
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

  try {
    const result = await shopifyGraphQL(storeDomain, token, query, {
      id: `gid://shopify/Product/${productId}`,
    });

    const variants = result?.data?.product?.variants?.edges || [];

    return variants.map((edge: any) => ({
      variantId: edge.node.id,
      inventoryItemId: edge.node.inventoryItem?.id,
    })).filter((v: any) => v.inventoryItemId);
  } catch (err) {
    // Log but don't throw - treat as "not found"
    console.log(`[getProductInventoryItems] Product "${productId}" not found in ${storeDomain}: ${err}`);
    return [];
  }
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

// Cache for location IDs (they don't change)
const locationCache: Record<string, string> = {};

async function getCachedLocationId(
  storeDomain: string,
  token: string
): Promise<string | null> {
  if (locationCache[storeDomain]) {
    return locationCache[storeDomain];
  }
  const locationId = await getLocationId(storeDomain, token);
  if (locationId) {
    locationCache[storeDomain] = locationId;
  }
  return locationId;
}

// Process accessory: Try SKU in both stores, sync wherever found
async function processAccessoryInStore(
  storeDomain: string,
  token: string,
  sku: string
): Promise<StoreResult> {
  const storeName = Object.keys(STORES).find(k => STORES[k].domain === storeDomain) || storeDomain;

  // Find variant by SKU
  const variant = await findVariantBySku(storeDomain, token, sku);

  if (!variant) {
    return { store: storeName, found: false, synced: false };
  }

  // Get location ID
  const locationId = await getCachedLocationId(storeDomain, token);
  if (!locationId) {
    return { store: storeName, found: true, synced: false, error: "Could not get location ID" };
  }

  // Set inventory to 0
  const result = await setInventoryToZero(storeDomain, token, variant.inventoryItemId, locationId);

  return {
    store: storeName,
    found: true,
    synced: result.success,
    error: result.error,
    details: { sku, variantId: variant.variantId, inventoryItemId: variant.inventoryItemId },
  };
}

// Process cake topper: Try product IDs in both stores, sync wherever found
async function processCakeTopperInStore(
  storeDomain: string,
  token: string,
  productIds: string[]
): Promise<StoreResult> {
  const storeName = Object.keys(STORES).find(k => STORES[k].domain === storeDomain) || storeDomain;

  let foundAny = false;
  let syncedCount = 0;
  const errors: string[] = [];
  const details: any[] = [];

  // Get location ID once
  const locationId = await getCachedLocationId(storeDomain, token);
  if (!locationId) {
    return { store: storeName, found: false, synced: false, error: "Could not get location ID" };
  }

  for (const productId of productIds) {
    // Get all variants for this product
    const variants = await getProductInventoryItems(storeDomain, token, productId);

    if (variants.length === 0) {
      // Product not found in this store - normal, not an error
      continue;
    }

    foundAny = true;

    // Set each variant's inventory to 0
    for (const variant of variants) {
      const result = await setInventoryToZero(storeDomain, token, variant.inventoryItemId, locationId);

      if (result.success) {
        syncedCount++;
        details.push({ productId, variantId: variant.variantId });
      } else {
        errors.push(`${productId}/${variant.variantId}: ${result.error}`);
      }
    }
  }

  return {
    store: storeName,
    found: foundAny,
    synced: foundAny && errors.length === 0,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    details: { productIds, syncedCount, details },
  };
}

// Main processing function - tries both stores
async function processItem(
  payload: SyncPayload,
  tokens: Record<string, string>
): Promise<ProcessResult> {
  const storeResults: StoreResult[] = [];

  // Build list of stores to try (only those with valid tokens)
  const storesToTry = Object.entries(STORES)
    .filter(([name]) => tokens[name])
    .map(([name, config]) => ({
      name,
      domain: config.domain,
      token: tokens[name],
    }));

  if (storesToTry.length === 0) {
    return {
      item_id: payload.item_id,
      item_type: payload.item_type,
      success: false,
      stores: [],
      error: "No Shopify tokens available",
    };
  }

  // Process in each store
  for (const store of storesToTry) {
    try {
      let result: StoreResult;

      if (payload.item_type === "accessory") {
        if (!payload.sku) {
          result = { store: store.name, found: false, synced: false, error: "No SKU provided" };
        } else {
          result = await processAccessoryInStore(store.domain, store.token, payload.sku);
        }
      } else if (payload.item_type === "cake_topper") {
        const productIds = [payload.product_id_1, payload.product_id_2].filter(Boolean) as string[];
        if (productIds.length === 0) {
          result = { store: store.name, found: false, synced: false, error: "No product IDs provided" };
        } else {
          result = await processCakeTopperInStore(store.domain, store.token, productIds);
        }
      } else {
        result = { store: store.name, found: false, synced: false, error: `Unknown item_type: ${payload.item_type}` };
      }

      storeResults.push(result);
    } catch (err) {
      storeResults.push({
        store: store.name,
        found: false,
        synced: false,
        error: `Exception: ${err}`,
      });
    }
  }

  // Determine success:
  // - Success if at least one store synced
  // - Success if item wasn't found in any store (nothing to do - not sold online)
  // - FAIL if any store had an error (including API errors, location ID failures, exceptions)
  const anySynced = storeResults.some(r => r.synced);
  const anyFound = storeResults.some(r => r.found);
  const anyError = storeResults.some(r => r.error); // Any error = failure (not just found+!synced)

  // If we have errors, it's a failure - we want retry
  // If nothing found and no errors, it's success (item not in Shopify)
  // If something synced, it's success
  const isSuccess = anyError ? false : (anySynced || !anyFound);

  return {
    item_id: payload.item_id,
    item_type: payload.item_type,
    success: isSuccess,
    stores: storeResults,
    error: anyError ? storeResults.filter(r => r.error).map(r => `${r.store}: ${r.error}`).join("; ") : undefined,
  };
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

    const tokens: Record<string, string> = {};
    if (bannosToken) tokens.bannos = bannosToken;
    if (flourlaneToken) tokens.flourlane = flourlaneToken;

    if (Object.keys(tokens).length === 0) {
      console.error("[sync-inventory-to-shopify] Missing all Shopify tokens");
      return new Response(
        JSON.stringify({ error: "Missing Shopify Admin tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body - can be direct payload OR empty (for queue processing)
    let payload: SyncPayload | null = null;
    try {
      const body = await req.json();
      if (body && body.item_type) {
        payload = body as SyncPayload;
      }
    } catch {
      // Empty body or invalid JSON - will process queue instead
    }

    // If we have a direct payload, process it immediately
    if (payload) {
      console.log(`[sync-inventory-to-shopify] Direct call: ${payload.item_type} ${payload.item_id}`);

      const result = await processItem(payload, tokens);

      // Update queue status if queue_id was provided
      if (payload.queue_id) {
        await supabase
          .from("inventory_sync_queue")
          .update({
            status: result.success ? "completed" : "failed",
            error_message: result.error || null,
            processed_at: new Date().toISOString(),
          })
          .eq("id", payload.queue_id);
      }

      console.log(
        `[sync-inventory-to-shopify] ${result.success ? "OK" : "FAILED"} ${payload.item_type} ${payload.item_id}`,
        JSON.stringify(result.stores)
      );

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No direct payload - process queue (fallback/retry mechanism)
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

    console.log(`[sync-inventory-to-shopify] Processing ${claimedItems.length} queued items`);

    const results: ProcessResult[] = [];

    for (const item of claimedItems) {
      // Convert queue item to payload format
      const queuePayload: SyncPayload = {
        queue_id: item.id,
        item_type: item.item_type,
        item_id: item.item_id,
        sku: item.shopify_ids?.sku,
        product_id_1: item.shopify_ids?.product_id_1,
        product_id_2: item.shopify_ids?.product_id_2,
      };

      const result = await processItem(queuePayload, tokens);

      // Update queue item status
      await supabase
        .from("inventory_sync_queue")
        .update({
          status: result.success ? "completed" : "failed",
          error_message: result.error || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", item.id);

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
