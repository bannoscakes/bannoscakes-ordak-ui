import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing env vars')
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const shopifyOrder = JSON.parse(await req.text())

    // Just dump it - NO EXTRACTION
    const { error } = await supabase.from('webhook_inbox_flourlane').insert({
      id: `flourlane-${shopifyOrder.order_number}`,
      payload: shopifyOrder
    })

    if (error) {
      console.error('Insert error:', error)
    }

    return new Response('OK', { status: 200, headers: corsHeaders })
  } catch (err) {
    console.error('Error:', err)
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})
