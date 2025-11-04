// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SHOP_DOMAIN = "bannoscakes.myshopify.com";

const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ADMIN_TOKEN_BANNOS");

serve(async (req) => {
  // Health check
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  try {
    const order = await req.json();
    const hookId = req.headers.get("X-Shopify-Webhook-Id") || order.id.toString();
    
    console.log("=== WEBHOOK RECEIVED ===");
    console.log("Order ID:", order.id);
    console.log("Order Number:", order.order_number);
    
    // TRY to fetch metafield, but don't fail if it doesn't exist
    let metafieldData = null;
    let metafieldError = null;
    
    try {
      console.log("Attempting to fetch metafield...");
      const metafieldRes = await fetch(
        `https://${SHOP_DOMAIN}/admin/api/2024-10/orders/${order.id}/metafields.json`,
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN ?? "",
            "Content-Type": "application/json"
          }
        }
      );
      
      console.log("Metafield API status:", metafieldRes.status);
      
      if (metafieldRes.ok) {
        const metafieldsData = await metafieldRes.json();
        const metafield = metafieldsData.metafields?.find(
          (m) => m.namespace === "ordak" && m.key === "kitchen_json"
        );
        
        if (metafield?.value) {
          console.log("✅ Metafield found!");
          metafieldData = JSON.parse(metafield.value);
        } else {
          console.log("⚠️ Metafield not found (Flow might not have created it yet)");
        }
      } else {
        metafieldError = `API returned ${metafieldRes.status}`;
        console.log("⚠️ Metafield fetch failed:", metafieldError);
      }
    } catch (err) {
      metafieldError = err.message;
      console.log("⚠️ Metafield fetch error:", metafieldError);
    }
    
    // Build database row - use metafield if available, fallback to basic order data
    let due_date = null;
    let delivery_method = "delivery";
    let customer_name = "";
    let product_title = "";
    let flavour = "";
    let notes = "";
    
    if (metafieldData) {
      // Use parsed metafield data
      try {
        const dateObj = new Date(metafieldData.delivery_date);
        if (!isNaN(dateObj.getTime())) {
          due_date = dateObj.toISOString().split('T')[0];
        }
      } catch (err) {
        console.log("Date parsing failed, will be null");
      }
      
      delivery_method = metafieldData.is_pickup ? "pickup" : "delivery";
      customer_name = metafieldData.customer_name || "";
      product_title = metafieldData.line_items?.[0]?.title || "";
      flavour = metafieldData.line_items?.[0]?.properties?.["Gelato Flavours"] || "";
      notes = metafieldData.order_notes || "";
    } else {
      // Fallback: extract what we can from order object
      customer_name = order.customer?.first_name && order.customer?.last_name 
        ? `${order.customer.first_name} ${order.customer.last_name}` 
        : "";
      product_title = order.line_items?.[0]?.title || "";
      notes = order.note || "";
      
      // Try to find delivery date in note attributes
      const deliveryAttr = order.note_attributes?.find(
        attr => attr.name === "Local Delivery Date and Time"
      );
      if (deliveryAttr?.value) {
        console.log("Found delivery date in note_attributes:", deliveryAttr.value);
      }
    }
    
    const row = {
      id: `bannos-${order.order_number || order.id}`,
      shopify_order_id: order.id,
      shopify_order_gid: order.admin_graphql_api_id,
      shopify_order_number: order.order_number,
      customer_name: customer_name.trim(),
      product_title,
      flavour,
      notes,
      currency: order.currency || "AUD",
      total_amount: Number(order.total_price || 0),
      order_json: order, // Store full order for later processing
      stage: "Filling",
      due_date, // Might be null if metafield not ready
      delivery_method,
      metafield_status: metafieldData ? "available" : "pending",
      created_at: new Date().toISOString()
    };
    
    console.log("=== INSERTING TO DATABASE ===");
    console.log("ID:", row.id);
    console.log("Due date:", due_date || "NULL (will update later)");
    console.log("Metafield status:", row.metafield_status);
    
    // Insert to database
    const insertRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/orders_bannos`,
      {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=representation"
        },
        body: JSON.stringify(row)
      }
    );
    
    if (!insertRes.ok) {
      const errorText = await insertRes.text();
      console.error("❌ Database insert failed:", errorText);
      // Still return 200 to Shopify so it doesn't retry
      return new Response("logged: database insert failed", { status: 200 });
    }
    
    const insertedRows = await insertRes.json();
    
    if (!insertedRows || insertedRows.length === 0) {
      console.log("ℹ️ Order already exists (duplicate)");
    } else {
      console.log("✅ Order inserted successfully!");
      
      // Call order split RPC if needed
      if (order.admin_graphql_api_id) {
        console.log("Calling enqueue_order_split...");
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/enqueue_order_split`,
          {
            method: "POST",
            headers: {
              apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              p_shop_domain: SHOP_DOMAIN,
              p_topic: "orders/create",
              p_hook_id: hookId,
              p_body: order
            })
          }
        ).catch((err) => {
          console.error("RPC call failed (non-critical):", err.message);
        });
      }
    }
    
    // ALWAYS return 200 - never block Shopify webhooks
    return new Response("ok", { status: 200 });
    
  } catch (err) {
    console.error("=== CRITICAL ERROR ===");
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
    
    // Still return 200 to prevent Shopify from retrying unnecessarily
    return new Response("logged: error occurred", { status: 200 });
  }
});
