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
      console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response('Configuration error', { status: 200, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.text()
    const shopifyOrder = JSON.parse(body)
    
    console.log('Webhook received:', {
      orderId: shopifyOrder.id,
      orderNumber: shopifyOrder.order_number,
      lineItems: shopifyOrder.line_items?.length || 0
    })

    // Create single raw order record - no processing, no splitting, no blocking
    const order = {
      id: `flourlane-${shopifyOrder.order_number}`,
      shopify_order_id: shopifyOrder.id.toString(),
      shopify_order_number: shopifyOrder.order_number,
      shopify_order_gid: shopifyOrder.admin_graphql_api_id,
      order_number: `F${shopifyOrder.order_number}`,
      order_json: shopifyOrder,
      created_at: new Date().toISOString(),
      
      // Minimal fields for initial display
      customer_name: `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim() || 'Customer',
      customer_email: shopifyOrder.customer?.email || shopifyOrder.email,
      currency: shopifyOrder.currency || 'AUD',
      total_amount: Number(shopifyOrder.total_price || 0),
      
      // Status fields
      stage: 'Filling',
      status: 'new-order',
      store_source: 'flour_lane',
    }

    // Insert single order
    try {
      const { error } = await supabase
        .from('orders_flourlane')
        .upsert(order, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Insert error:', error)
      } else {
        console.log(`✅ Stored: ${order.order_number}`)
      }
    } catch (err) {
      console.error('Storage failed:', err)
    }
    
    // ALWAYS return success
    return new Response('OK', { status: 200, headers: corsHeaders })
    
  } catch (err) {
    console.error('Webhook error:', err)
    // Even on total failure, return 200
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})
