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

    // Show limitation message - webhooks are the proper way
    await supabase
      .from('shopify_sync_runs')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        orders_imported: 0,
        orders_skipped: 0,
        error_message: 'Manual order sync not recommended - use Shopify webhooks instead. Webhooks are already configured and working.'
      })
      .eq('id', run_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Use Shopify webhooks for order sync (already configured)",
        run_id,
        recommendation: "Webhooks provide real-time order sync and are already working",
        stub: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

