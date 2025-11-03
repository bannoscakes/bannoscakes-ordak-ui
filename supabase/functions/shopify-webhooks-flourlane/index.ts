// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SHOP_DOMAIN = "flourlane.myshopify.com";

const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_FLOURLANE_ACCESS_TOKEN");

serve(async (req) => {
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  try {
    const order = await req.json();
    const hookId = req.headers.get("X-Shopify-Webhook-Id") || order.id.toString();
    
    console.log("Processing order:", { 
      order_id: order.id, 
      order_number: order.order_number,
      hook_id: hookId 
    });
    
    // Fetch metafield via Shopify Admin API
    const metafieldRes = await fetch(
      `https://${SHOP_DOMAIN}/admin/api/2024-10/orders/${order.id}/metafields.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN ?? "",
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!metafieldRes.ok) {
      console.error("Failed to fetch metafields:", {
        status: metafieldRes.status,
        order_id: order.id,
      });
      return new Response("error: failed to fetch metafields", { status: 500 });
    }
    
    const metafieldsData = await metafieldRes.json();
    const metafield = metafieldsData.metafields?.find(
      (m) => m.namespace === "ordak" && m.key === "kitchen_json"
    );
    
    if (!metafield?.value) {
      console.log("Metafield not ready yet, Shopify will retry", {
        order_id: order.id,
        metafields_found: metafieldsData.metafields?.length || 0,
      });
      return new Response("retry: metafield not created yet", { status: 500 });
    }
    
    // Parse metafield data
    let data;
    try {
      data = JSON.parse(metafield.value);
    } catch (err) {
      console.error("Invalid metafield JSON:", {
        order_id: order.id,
        error: err.message,
        value: metafield.value,
      });
      return new Response("error: invalid metafield JSON", { status: 500 });
    }
    
    // Validate and parse date
    if (!data.delivery_date) {
      console.error("Missing delivery_date in metafield:", {
        order_id: order.id,
        data,
      });
      return new Response("error: missing delivery_date", { status: 500 });
    }
    
    let due_date;
    try {
      const dateObj = new Date(data.delivery_date);
      if (isNaN(dateObj.getTime())) {
        throw new Error("Invalid date");
      }
      due_date = dateObj.toISOString().split('T')[0];
    } catch (err) {
      console.error("Invalid delivery_date format:", {
        order_id: order.id,
        delivery_date: data.delivery_date,
        error: err.message,
      });
      return new Response("error: invalid date format", { status: 500 });
    }
    
    // Extract data from metafield
    const delivery_method = data.is_pickup ? "pickup" : "delivery";
    const primaryItem = data.line_items?.[0] || {};
    
    // Build row for database
    const row = {
      id: `flourlane-${order.order_number || order.id}`,
      shopify_order_id: order.id,
      shopify_order_gid: order.admin_graphql_api_id,
      shopify_order_number: order.order_number,
      customer_name: data.customer_name || "",
      product_title: primaryItem.title || "",
      flavour: primaryItem.properties?.["Gelato Flavours"] || "",
      notes: data.order_notes || "",
      currency: order.currency || "AUD",
      total_amount: Number(order.total_price || 0),
      order_json: order,
      stage: "Filling",
      due_date,
      delivery_method,
    };
    
    console.log("Inserting order:", { id: row.id, due_date, delivery_method });
    
    // Insert with duplicate detection
    const insertRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/orders_flourlane`,
      {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=representation",
        },
        body: JSON.stringify(row),
      }
    );
    
    if (!insertRes.ok) {
      const errorText = await insertRes.text();
      console.error("Insert failed:", {
        order_id: order.id,
        status: insertRes.status,
        error: errorText,
      });
      return new Response("error: database insert failed", { status: 500 });
    }
    
    // Check if row was actually inserted
    const insertedRows = await insertRes.json();
    if (!insertedRows || insertedRows.length === 0) {
      console.log("Order already exists, skipping RPCs", { order_id: order.id });
      return new Response("ok", { status: 200 });
    }
    
    console.log("Order inserted successfully", { id: row.id });
    
    // Call order split RPC (FIXED PARAMETERS)
    if (order.admin_graphql_api_id) {
      console.log("Enqueueing order split", { order_gid: order.admin_graphql_api_id });
      
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/enqueue_order_split`,
        {
          method: "POST",
          headers: {
            apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_shop_domain: SHOP_DOMAIN,
            p_topic: "orders/create",
            p_hook_id: hookId,
            p_body: order,
          }),
        }
      ).catch((err) => {
        console.error("RPC enqueue_order_split failed:", {
          order_id: order.id,
          error: err.message || err,
        });
      });
    }
    
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", {
      error: err.message || err,
      stack: err.stack,
    });
    return new Response("error: internal server error", { status: 500 });
  }
});
