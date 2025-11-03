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
    
    // Parse date: "Fri 28 Nov 2025" → "2025-11-28"
    const parseDate = (dateStr: string): string => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    };
    
    // Extract flavour from line item properties
    const extractFlavour = (lineItem: any): string => {
      if (!lineItem) return "";
      
      // Check properties for gelato flavours
      const props = lineItem.properties || [];
      const flavourProp = props.find((p: any) => 
        /gelato flavour(s)?/i.test(p.name || "")
      );
      
      if (flavourProp?.value) {
        return String(flavourProp.value)
          .split(/[\n,/]/)
          .map(s => s.trim())
          .filter(Boolean)
          .join(", ");
      }
      
      // Fallback: extract from variant title
      const variant = lineItem.variant_title || "";
      const parts = variant.split(/[/]/);
      return parts[1]?.trim() || "";
    };
    
    const primaryItem = order.line_items?.[0];
    
    // Parse due_date with fallbacks
    let due_date = parseDate(data.delivery_date);
    
    // Fallback: use order created_at date if available
    if (!due_date && order?.created_at) {
      const createdDate = new Date(order.created_at);
      if (!isNaN(createdDate.getTime())) {
        due_date = createdDate.toISOString().split('T')[0];
      }
    }
    
    // Final fallback: current UTC date
    if (!due_date) {
      due_date = new Date().toISOString().split('T')[0];
    }
    
    const delivery_method = data.is_pickup ? "pickup" : "delivery";
    
    // Build row for database
    const row = {
      id: `bannos-${order.order_number || order.id}`,
      shopify_order_id: order.id,
      shopify_order_gid: order.admin_graphql_api_id,
      shopify_order_number: order.order_number,
      customer_name: data.customer_name || "",
      product_title: primaryItem?.title || "",
      flavour: extractFlavour(primaryItem),
      notes: data.order_notes || "",
      currency: order.currency || "AUD",
      total_amount: Number(order.total_price || 0),
      order_json: order,
      stage: "Filling",
      due_date,
      delivery_method
    };
    
    // Insert to orders_bannos
    const insertRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/orders_bannos`,
      {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify(row),
      }
    );
    
    if (!insertRes.ok) {
      console.error("Insert failed:", await insertRes.text());
      return new Response("error", { status: 500 });
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
