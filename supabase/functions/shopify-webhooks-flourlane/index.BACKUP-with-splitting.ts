import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function isCakeItem(item: any): boolean {
  const title = (item.title || '').toLowerCase()
  
  // Accessories are NOT cakes
  if (isAccessoryItem(item)) return false
  
  // Contains "cake" → is a cake
  if (title.includes('cake')) {
    // Exclude cake accessories
    if (title.includes('topper') || title.includes('decoration')) return false
    return true
  }
  
  return false
}

function isAccessoryItem(item: any): boolean {
  const title = (item.title || '').toLowerCase()
  return title.includes('candle') || 
         title.includes('balloon') || 
         title.includes('topper')
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

    // ONLY BLOCKING: Tag validation (test orders have no tags)
    const orderTags = shopifyOrder.tags || ''
    if (!orderTags || orderTags.trim() === '') {
      console.log(`Blocking order ${shopifyOrder.order_number} - no tags (test order)`)
      return new Response('Order blocked - test order', { status: 200, headers: corsHeaders })
    }

    // Categorize items
    const lineItems = shopifyOrder.line_items || []
    const cakeItems = []
    const accessoryItems = []
    
    for (const item of lineItems) {
      if (isCakeItem(item)) {
        for (let i = 0; i < item.quantity; i++) {
          cakeItems.push(item)
        }
      } else if (isAccessoryItem(item)) {
        accessoryItems.push(item)
      }
    }
    
    // Skip accessory-only orders
    if (cakeItems.length === 0) {
      console.log('Skipping accessory-only order')
      return new Response('OK - No production items', { status: 200, headers: corsHeaders })
    }
    
    // Prepare accessories array
    const accessoriesForDB = accessoryItems.map(item => ({
      title: item.title,
      quantity: item.quantity,
      shopify_variant_id: item.variant_id?.toString(),
      shopify_product_id: item.product_id?.toString(),
      price: item.price,
      vendor: item.vendor
    }))
    
    // Order splitting logic
    const orders = []
    
    if (cakeItems.length <= 1) {
      // Single order
      const order = {
        id: `flourlane-${shopifyOrder.order_number}`,
        shopify_order_id: shopifyOrder.id.toString(),
        shopify_order_number: shopifyOrder.order_number,
        shopify_order_gid: shopifyOrder.admin_graphql_api_id,
        order_number: `F${shopifyOrder.order_number}`,
        customer_name: `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim() || 'Customer',
        product_title: cakeItems[0]?.title || 'Custom Order',
        quantity: 1,
        order_json: shopifyOrder,
        stage: 'Filling',
        status: 'new-order',
        current_stage: 'Order received',
        delivery_method: shopifyOrder.shipping_address ? 'delivery' : 'pickup',
        fulfillment_type: shopifyOrder.shipping_address ? 'delivery' : 'pickup',
        store_source: 'flour_lane',
        customer_email: shopifyOrder.customer?.email || shopifyOrder.email,
        order_notes: shopifyOrder.note || '',
        currency: shopifyOrder.currency || 'AUD',
        total_amount: Number(shopifyOrder.total_price || 0),
        accessories: accessoriesForDB,
        due_date: null,
        created_at: new Date().toISOString()
      }
      orders.push(order)
      
    } else {
      // Multiple cakes - split
      const suffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
      const totalAmount = Number(shopifyOrder.total_price || 0)
      const amountPerCake = totalAmount / cakeItems.length
      
      for (let i = 0; i < cakeItems.length; i++) {
        const cakeItem = cakeItems[i]
        const suffix = suffixes[i] || (i + 1).toString() // Falls back to numbers for 11+
        const isFirstOrder = i === 0
        
        const order = {
          id: `flourlane-${shopifyOrder.order_number}-${suffix}`,
          shopify_order_id: shopifyOrder.id.toString(),
          shopify_order_number: shopifyOrder.order_number,
          shopify_order_gid: shopifyOrder.admin_graphql_api_id,
          order_number: `F${shopifyOrder.order_number}-${suffix}`,
          customer_name: `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim() || 'Customer',
          product_title: cakeItem.title,
          quantity: 1,
          order_json: shopifyOrder,
          stage: 'Filling',
          status: 'new-order',
          current_stage: 'Order received',
          delivery_method: shopifyOrder.shipping_address ? 'delivery' : 'pickup',
          fulfillment_type: shopifyOrder.shipping_address ? 'delivery' : 'pickup',
          store_source: 'flour_lane',
          customer_email: shopifyOrder.customer?.email || shopifyOrder.email,
          order_notes: shopifyOrder.note || '',
          currency: shopifyOrder.currency || 'AUD',
          total_amount: amountPerCake,
          accessories: isFirstOrder ? accessoriesForDB : [],
          due_date: null,
          created_at: new Date().toISOString()
        }
        orders.push(order)
      }
    }
    
    // Insert to database
    for (const order of orders) {
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
    }
    
    // ALWAYS return success
    return new Response('OK', { status: 200, headers: corsHeaders })
    
  } catch (err) {
    console.error('Webhook error:', err)
    // Even on total failure, return 200
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})

