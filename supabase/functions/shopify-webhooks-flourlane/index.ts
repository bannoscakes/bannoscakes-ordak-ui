// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  try {
    const order = await req.json();
    
    // Read metafield created by Shopify Flow
    const metafield = order.metafields?.find(
      (m: any) => m.namespace === "ordak" && m.key === "kitchen_json"
    );
    
    if (!metafield?.value) {
      console.error("Missing metafield ordak.kitchen_json");
      return new Response("error: missing metafield", { status: 500 });
    }
    
    const data = JSON.parse(metafield.value);
    
    // Parse date
    const due_date = data.delivery_date 
      ? new Date(data.delivery_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    // Map fields directly from metafield
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
      delivery_method
    };
    
    // Insert to orders_flourlane with return=representation to detect duplicates
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
      console.error("Insert failed:", await insertRes.text());
      return new Response("error", { status: 500 });
    }
    
    // Check if row was actually inserted (empty response means duplicate was ignored)
    const insertedRows = await insertRes.json();
    if (!insertedRows || insertedRows.length === 0) {
      console.log("Order already exists (duplicate ignored), skipping RPCs");
      return new Response("ok", { status: 200 });
    }
    
    // Call stock deduction RPC
    if (order.admin_graphql_api_id) {
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/deduct_on_order_create`,
        {
          method: "POST",
          headers: {
            apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_gid: order.admin_graphql_api_id,
            payload: order,
          }),
        }
      ).catch(() => {});
    }
    
    // Call order split RPC
    if (order.admin_graphql_api_id) {
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
            order_gid: order.admin_graphql_api_id,
            payload: order,
          }),
        }
      ).catch(() => {});
    }
    
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("error", { status: 500 });
  }
});
