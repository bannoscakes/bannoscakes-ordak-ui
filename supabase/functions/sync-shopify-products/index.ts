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

    // TODO: Implement actual Shopify GraphQL product fetch
    // For now, update run status with stub message
    
    const { error: updateError } = await supabase
      .from('shopify_sync_runs')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        products_imported: 0,
        products_skipped: 0,
        error_message: 'Stub: Product sync not yet implemented. Requires Shopify Admin API credentials.'
      })
      .eq('id', run_id);
    
    if (updateError) {
      console.error('Failed to update sync run:', updateError);
      // Continue anyway - return success even if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Product sync stub completed",
        run_id,
        stub: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

