// @ts-nocheck
// Edge Function: test-shopify-token (Admin API)
// Purpose: Validate Shopify Admin API token
// Called by: test_admin_token RPC

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STORE_URLS = {
  bannos: 'bannos.myshopify.com',
  flourlane: 'flour-lane.myshopify.com'
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let runId: string | undefined;
  try {
    const { store, token, run_id } = await req.json();
    runId = run_id;

    if (!store || !token || !run_id) {
      throw new Error('Missing required fields: store, token, run_id');
    }

    if (!['bannos', 'flourlane'].includes(store)) {
      throw new Error(`Invalid store: ${store}`);
    }

    const shopUrl = STORE_URLS[store];
    console.log(`Testing Admin API token for store: ${store}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test Admin API with a simple shop query
    const query = `
      query {
        shop {
          name
          email
          currencyCode
          myshopifyDomain
        }
      }
    `;

    const response = await fetch(
      `https://${shopUrl}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token
        },
        body: JSON.stringify({ query })
      }
    );

    const result = await response.json();

    // Check for errors
    if (result.errors) {
      const errorMsg = result.errors.map((e: any) => e.message).join(', ');
      console.error('Shopify API errors:', result.errors);
      
      // Update sync run to error
      await supabase
        .from('shopify_sync_runs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: `Admin API validation failed: ${errorMsg}`
        })
        .eq('id', run_id);

      return new Response(
        JSON.stringify({
          valid: false,
          error: errorMsg
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success - extract shop info
    const shopData = result.data?.shop;
    
    if (!shopData) {
      throw new Error('No shop data returned from API');
    }

    console.log(`Admin API token valid for shop: ${shopData.name}`);

    // Update sync run to success
    await supabase
      .from('shopify_sync_runs')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        metadata: {
          shop_name: shopData.name,
          shop_email: shopData.email,
          shop_domain: shopData.myshopifyDomain,
          currency: shopData.currencyCode
        }
      })
      .eq('id', run_id);

    return new Response(
      JSON.stringify({
        valid: true,
        shop_name: shopData.name,
        shop_email: shopData.email,
        shop_domain: shopData.myshopifyDomain,
        currency: shopData.currencyCode
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Token validation error:', error);
    
    // Try to update sync run to error
    if (runId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          await supabase
            .from('shopify_sync_runs')
            .update({
              status: 'error',
              completed_at: new Date().toISOString(),
              error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', runId);
        }
      } catch (updateError) {
        console.error('Failed to update sync run:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});