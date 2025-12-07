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

  const response = await fetch(
    `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        query,
        variables: { id: `gid://shopify/ProductVariant/${variantId}` },
      }),
    }
  );

  const result = await response.json();
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

  const response = await fetch(
    `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        query,
        variables: { id: `gid://shopify/Product/${productId}` },
      }),
    }
  );

  const result = await response.json();
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

  const response = await fetch(
    `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query }),
    }
  );

  const result = await response.json();
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

  const response = await fetch(
    `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
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
        },
      }),
    }
  );

  const result = await response.json();
  const userErrors = result?.data?.inventorySetOnHandQuantities?.userErrors || [];

  if (userErrors.length > 0) {
    return {
      success: false,
      error: userErrors.map((e: any) => e.message).join(", "),
    };
  }

  return { success: true };
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

    // Get pending items from queue (limit to 10 per run)
    const { data: queueItems, error: fetchError } = await supabase
      .from("inventory_sync_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("[sync-inventory-to-shopify] Failed to fetch queue:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch queue", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("[sync-inventory-to-shopify] No pending items in queue");
      return new Response(
        JSON.stringify({ message: "No pending items", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-inventory-to-shopify] Processing ${queueItems.length} items`);

    // For now, use Bannos store (inventory is unified across both stores)
    // The same physical inventory serves both Bannos and Flourlane
    const storeDomain = STORES.bannos.domain;
    const token = bannosToken || flourlaneToken;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "No Shopify token available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get location ID (cached per store, but we only call once per run)
    const locationId = await getLocationId(storeDomain, token);

    if (!locationId) {
      console.error("[sync-inventory-to-shopify] Could not get location ID");
      return new Response(
        JSON.stringify({ error: "Could not get Shopify location ID" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: ProcessResult[] = [];

    for (const item of queueItems as QueueItem[]) {
      // Mark as processing
      await supabase
        .from("inventory_sync_queue")
        .update({ status: "processing" })
        .eq("id", item.id);

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
