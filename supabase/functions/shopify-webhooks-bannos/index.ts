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

    // DEBUG: Log what Shopify actually sends
    console.log('=== SHOPIFY WEBHOOK RECEIVED ===')
    console.log('Order number:', shopifyOrder.order_number)
    console.log('Line items count:', shopifyOrder.line_items?.length)
    if (shopifyOrder.line_items?.[0]) {
      const firstItem = shopifyOrder.line_items[0]
      console.log('First item title:', firstItem.title)
      console.log('Has image field?', firstItem.image ? 'YES' : 'NO')
      console.log('Image value:', firstItem.image)
      console.log('Has variant.image?', firstItem.variant?.image ? 'YES' : 'NO')
      console.log('First item keys:', Object.keys(firstItem))
    }
    console.log('=== END DEBUG ===')

    // Just dump it - NO EXTRACTION
    const { error } = await supabase.from('webhook_inbox_bannos').upsert({
      id: `bannos-${shopifyOrder.order_number || shopifyOrder.id}`,
      payload: shopifyOrder,
      processed: false
    }, { onConflict: 'id' })

    if (error) {
      console.error('Insert error:', error)
    }

    return new Response('OK', { status: 200, headers: corsHeaders })
  } catch (err) {
    console.error('Error:', err)
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})
