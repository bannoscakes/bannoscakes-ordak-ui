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
    const { store, token, run_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // TODO: Implement actual Shopify Storefront API test
    // For now, update run status with stub message
    
    // Example implementation would be:
    // const shopifyResponse = await fetch(`https://${store}.myshopify.com/api/...`, {
    //   headers: { 'X-Shopify-Storefront-Access-Token': token }
    // });

    const { error: updateError } = await supabase
      .from('shopify_sync_runs')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        error_message: 'Stub: Token validation not yet implemented. Requires Shopify Storefront API call.'
      })
      .eq('id', run_id);
    
    if (updateError) {
      console.error('Failed to update sync run:', updateError);
      // Continue anyway - return success even if logging fails
    }

    return new Response(
      JSON.stringify({
        valid: true,
        message: "Token test not yet implemented - returning stub",
        stub: true,
        store,
        run_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error), valid: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

