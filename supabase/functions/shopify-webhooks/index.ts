// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { normalizeShopifyOrder } from "./normalize.ts";

serve(async (req) => {
  try {
    // Get shop domain from header
    const shopDomain = req.headers.get("X-Shopify-Shop-Domain") || "";
    const topic = req.headers.get("X-Shopify-Topic") || "";
    
    // Only process order webhooks
    if (!topic.startsWith("orders/")) {
      return new Response("ok", { status: 200 });
    }

    // Parse the order
    const body = await req.json();
    
    // Normalize the order
    const norm = normalizeShopifyOrder(body, shopDomain);
    
    // Determine which table to use
    const table = shopDomain.includes("bannos") 
      ? "orders_bannos" 
      : "orders_flourlane";
    
    // Insert the order
    const insertRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/${table}`,
      {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({
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
          due_date: norm.due_date,
          delivery_method: norm.delivery_method,
        }),
      }
    );

    if (!insertRes.ok) {
      console.error("Insert failed:", await insertRes.text());
      return new Response("error", { status: 500 });
    }

    // Call stock deduction RPC
    if (norm.shopify_order_gid && topic === "orders/create") {
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
            order_gid: norm.shopify_order_gid,
            payload: norm.order_json,
          }),
        }
      ).catch(() => {}); // best-effort
    }

    // Enqueue order split task
    if (norm.shopify_order_gid) {
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
            order_gid: norm.shopify_order_gid,
            payload: norm.order_json,
          }),
        }
      ).catch(() => {}); // best-effort
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("error", { status: 500 });
  }
});
