// Edge Function: sync-inventory-to-shopify
// Purpose: Process inventory_sync_queue and set items out of stock in Shopify
// Called by: pg_cron every 5 minutes
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
const STORES = {
  bannos: {
    domain: "bannos.myshopify.com",
    tokenEnvVar: "SHOPIFY_ADMIN_TOKEN_BANNOS",
  },
  flourlane: {
    domain: "flour-lane.myshopify.com",
    tokenEnvVar: "SHOPIFY_ADMIN_TOKEN_FLOURLANE",
  },
};

interface QueueItem {
  id: string;
  item_type: "accessory" | "cake_topper";
  item_id: string;
  sync_action: string;
  shopify_ids: {
    variant_id?: string;
    product_id_1?: string;
    product_id_2?: string;
  };
}

interface ProcessResult {
  queue_id: string;
  success: boolean;
  error?: string;
  shopify_response?: unknown;
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

// Process a single accessory (set one variant out of stock)
async function processAccessory(
  item: QueueItem,
  storeDomain: string,
  token: string,
  locationId: string
): Promise<ProcessResult> {
  const variantId = item.shopify_ids.variant_id;

  if (!variantId) {
    return {
      queue_id: item.id,
      success: false,
      error: "No variant_id in shopify_ids",
    };
  }

  try {
    // Get inventory item ID from variant
    const inventoryItemId = await getInventoryItemId(storeDomain, token, variantId);

    if (!inventoryItemId) {
      return {
        queue_id: item.id,
        success: false,
        error: `Could not find inventory item for variant ${variantId}`,
      };
    }

    // Set inventory to 0
    const result = await setInventoryToZero(storeDomain, token, inventoryItemId, locationId);

    return {
      queue_id: item.id,
      success: result.success,
      error: result.error,
      shopify_response: { inventoryItemId, variantId },
    };
  } catch (err) {
    return {
      queue_id: item.id,
      success: false,
      error: `Exception: ${err}`,
    };
  }
}

// Process a cake topper (set ALL variants of product(s) out of stock)
async function processCakeTopper(
  item: QueueItem,
  storeDomain: string,
  token: string,
  locationId: string
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

  const errors: string[] = [];
  const successes: string[] = [];

  for (const productId of productIds) {
    try {
      // Get all variants for this product
      const variants = await getProductInventoryItems(storeDomain, token, productId);

      if (variants.length === 0) {
        errors.push(`No variants found for product ${productId}`);
        continue;
      }

      // Set each variant's inventory to 0
      for (const variant of variants) {
        const result = await setInventoryToZero(
          storeDomain,
          token,
          variant.inventoryItemId,
          locationId
        );

        if (result.success) {
          successes.push(variant.inventoryItemId);
        } else {
          errors.push(`${variant.inventoryItemId}: ${result.error}`);
        }
      }
    } catch (err) {
      errors.push(`Product ${productId}: ${err}`);
    }
  }

  return {
    queue_id: item.id,
    success: errors.length === 0,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    shopify_response: { productIds, successCount: successes.length, errorCount: errors.length },
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

    // Inventory is unified - use whichever store has a valid token
    // IMPORTANT: Domain and token must match! Don't mix Bannos domain with Flourlane token
    let storeDomain: string;
    let token: string;

    if (bannosToken) {
      storeDomain = STORES.bannos.domain;
      token = bannosToken;
      console.log("[sync-inventory-to-shopify] Using Bannos store");
    } else if (flourlaneToken) {
      storeDomain = STORES.flourlane.domain;
      token = flourlaneToken;
      console.log("[sync-inventory-to-shopify] Using Flourlane store");
    } else {
      // This shouldn't happen due to earlier check, but TypeScript wants it
      return new Response(
        JSON.stringify({ error: "No Shopify token available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get location ID
    let locationId: string | null;
    try {
      locationId = await getLocationId(storeDomain, token);
    } catch (err) {
      console.error("[sync-inventory-to-shopify] Failed to get location ID:", err);
      return new Response(
        JSON.stringify({ error: "Failed to get Shopify location ID", details: `${err}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!locationId) {
      console.error("[sync-inventory-to-shopify] Could not get location ID");
      return new Response(
        JSON.stringify({ error: "Could not get Shopify location ID" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: ProcessResult[] = [];

    for (const item of claimedItems as QueueItem[]) {
      let result: ProcessResult;

      try {
        if (item.item_type === "accessory") {
          result = await processAccessory(item, storeDomain, token, locationId);
        } else if (item.item_type === "cake_topper") {
          result = await processCakeTopper(item, storeDomain, token, locationId);
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
