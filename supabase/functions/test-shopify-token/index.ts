// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { store, token } = await req.json();

    // TODO: Implement actual Shopify Storefront API test
    // For now, return stub response
    
    // Example implementation would be:
    // const shopifyResponse = await fetch(`https://${store}.myshopify.com/api/...`, {
    //   headers: { 'X-Shopify-Storefront-Access-Token': token }
    // });

    return new Response(
      JSON.stringify({
        valid: true,
        message: "Token test not yet implemented - returning stub",
        stub: true,
        store,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, valid: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

