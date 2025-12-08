// Order Inbox Processor - Processes webhooks from inbox tables to orders tables
// Reads from: webhook_inbox_bannos, webhook_inbox_flourlane
// Outputs to: orders_bannos, orders_flourlane

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// WEBHOOK FORMAT NORMALIZATION (GraphQL → REST)
// ============================================================================

function normalizeWebhook(payload: any): any {
  // If it's already REST format, return as-is
  if (payload.order_number && payload.line_items) {
    return payload
  }
  
  // If it's GraphQL, convert to REST structure for Liquid code
  if (payload.name && payload.lineItems?.edges) {
    const orderNumber = payload.name.match(/\d+/)?.[0]
    const lineItems = payload.lineItems.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      quantity: edge.node.quantity || 1,
      product_id: edge.node.variant?.id?.match(/\d+/)?.[0],
      variant_id: edge.node.variant?.id?.match(/\d+/)?.[0],
      variant_title: edge.node.variant?.title,
      price: edge.node.variant?.price || '0',
      // Map GraphQL customAttributes (key/value) to REST properties (name/value)
      properties: (edge.node.customAttributes || []).map((attr: any) => ({
        name: attr.key,
        value: attr.value
      })),
      vendor: edge.node.vendor
    }))
    
    return {
      ...payload,
      order_number: parseInt(orderNumber || '0'),
      line_items: lineItems,
      customer: payload.customer ? {
        name: `${payload.customer.firstName || ''} ${payload.customer.lastName || ''}`.trim(),
        first_name: payload.customer.firstName,
        last_name: payload.customer.lastName,
        email: payload.customer.email
      } : null,
      shipping_address: payload.shippingAddress,
      note: payload.note,
      // Map GraphQL customAttributes (key/value) to REST note_attributes (name/value)
      note_attributes: (payload.customAttributes || []).map((attr: any) => ({
        name: attr.key,
        value: attr.value
      })),
      currency: payload.totalPriceSet?.shopMoney?.currencyCode || 'AUD',
      total_price: payload.totalPriceSet?.shopMoney?.amount || '0',
      admin_graphql_api_id: payload.id,
      created_at: payload.createdAt
    }
  }
  
  return payload
}

// ============================================================================
// ITEM CATEGORIZATION
// ============================================================================

function isCakeItem(item: any): boolean {
  const title = (item.title || '').toLowerCase()
  
  if (isAccessoryItem(item)) {
    return false
  }
  
  if (title.includes('cake')) {
    if (title.includes('topper') || title.includes('decoration') || title.includes('pick')) {
      return false
    }
    return true
  }
  
  return false
}

function isAccessoryItem(item: any): boolean {
  const title = (item.title || '').toLowerCase()
  return title.includes('candle') || title.includes('balloon') || title.includes('topper')
}

function formatAccessories(items: any[]): any[] | null {
  if (!items || items.length === 0) return null
  
  return items.map(item => ({
    title: item.title,
    quantity: item.quantity || 1,
    price: item.price || '0',
    variant_title: item.variant_title || null
  }))
}

// ============================================================================
// LIQUID TEMPLATE EXTRACTION LOGIC
// ============================================================================

function extractCustomerName(shopifyOrder: any): string {
  let customerName = shopifyOrder.shipping_address?.name
  if (!customerName || customerName.trim() === '') {
    customerName = shopifyOrder.customer?.name || 
                   `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim()
  }
  return customerName || 'Customer'
}

function extractDeliveryDate(shopifyOrder: any): string | null {
  const noteAttributes = shopifyOrder.note_attributes || []
  
  const deliveryDateAttr = noteAttributes.find((attr: any) => 
    attr.name === 'Local Delivery Date and Time'
  )
  
  if (deliveryDateAttr && deliveryDateAttr.value) {
    const dateText = deliveryDateAttr.value
    const datePart = dateText.split(' between ')[0].trim()
    
    try {
      const parsedDate = new Date(datePart)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0]
      }
    } catch (error) {
      console.error('Failed to parse delivery date:', error)
    }
  }
  
  return null
}

function extractDeliveryMethod(shopifyOrder: any): string {
  const noteAttributes = shopifyOrder.note_attributes || []
  
  const deliveryMethodAttr = noteAttributes.find((attr: any) => 
    attr.name === 'Delivery Method'
  )
  
  if (deliveryMethodAttr && deliveryMethodAttr.value) {
    const methodValue = deliveryMethodAttr.value.toLowerCase()
    if (methodValue.includes('pick up') || methodValue.includes('pickup')) {
      return 'Pickup'
    } else if (methodValue.includes('delivery')) {
      return 'Delivery'
    }
  }
  
  return shopifyOrder.shipping_address ? 'Delivery' : 'Pickup'
}

function extractAllProperties(item: any): { name: string; value: string; display: string }[] {
  const properties = item.properties || []
  const extracted: { name: string; value: string; display: string }[] = []
  
  for (const prop of properties) {
    const name = (prop.name || '').toString()
    const value = (prop.value || '').toString()
    
    if (!name) continue
    
    if (name.includes('_origin')) continue
    if (name.includes('_raw')) continue
    if (name.includes('gwp')) continue
    if (name.includes('_LocalDeliveryID')) continue
    if (name.startsWith('_')) continue
    
    if (value.trim() !== '') {
      extracted.push({
        name: name,
        value: value,
        display: `${name}: ${value}`
      })
    }
  }
  
  return extracted
}

function extractFlavour(item: any): string | null {
  // Strategy 1: Try variant_title for regular cakes (e.g., "Medium / Vanilla")
  if (item.variant_title && item.variant_title.trim()) {
    const variantTitle = item.variant_title.trim()
    const parts = variantTitle.split('/')
    
    if (parts.length >= 2) {
      const flavour = parts[1].trim()
      if (flavour) return flavour  // Found flavour in variant_title
    }
  }
  
  // Strategy 2: Check properties for gelato flavours (e.g., "Gelato Flavours: Chocolate, Vanilla")
  const properties = extractAllProperties(item)
  
  // Look for gelato-specific flavour properties
  const gelatoFlavour = properties.find(p => 
    p.name.toLowerCase().includes('gelato flavour')
  )
  
  if (gelatoFlavour && gelatoFlavour.value.trim()) {
    return gelatoFlavour.value.trim()
  }
  
  // No flavour found in either variant_title or properties
  return null
}

function extractSize(item: any): string | null {
  if (!item.variant_title || !item.variant_title.trim()) {
    return null
  }
  
  const variantTitle = item.variant_title.trim()
  
  // Parse "Size / Flavour" format - split on '/', take first part
  const parts = variantTitle.split('/')
  
  if (parts.length >= 2) {
    const size = parts[0].trim()
    return size || null  // Return null if empty after trim
  }
  
  // If no slash, check for known size patterns
  if (variantTitle.toLowerCase().includes('gift size')) return 'Gift Size'
  if (variantTitle.toLowerCase().includes('small tall')) return 'Small Tall'
  if (variantTitle.toLowerCase().includes('medium tall')) return 'Medium Tall'
  if (variantTitle.toLowerCase().includes('large tall')) return 'Large Tall'
  
  // Return the full variant_title as size (already trimmed, guaranteed non-empty)
  return variantTitle
}

function extractCakeWriting(item: any): string | null {
  const properties = extractAllProperties(item)
  
  // Find properties where name contains "Writing"
  const writingProps = properties.filter(p => 
    p.name.toLowerCase().includes('writing') && p.value.trim() !== ''
  )
  
  if (writingProps.length === 0) {
    return null
  }
  
  // Join multiple writing lines with " / "
  return writingProps
    .map(p => p.value.trim())
    .join(' / ')
}

function extractNotes(shopifyOrder: any): string | null {
  const notes = shopifyOrder.note || ''
  return notes.trim() || null
}

// ============================================================================
// ADMIN API - IMAGE FETCHING (THE ONLY NEW ADDITION)
// ============================================================================

async function fetchProductImage(variantId: string, storeSource: string): Promise<string | null> {
  const adminToken = storeSource === 'Flourlane' 
    ? Deno.env.get('SHOPIFY_ADMIN_TOKEN_FLOURLANE')
    : Deno.env.get('SHOPIFY_ADMIN_TOKEN_BANNOS')
  
  const storeDomain = storeSource === 'Flourlane'
    ? 'flour-lane.myshopify.com'
    : 'bannos.myshopify.com'
  
  if (!adminToken) {
    console.error(`Admin token not found for ${storeSource}`)
    return null
  }
  
  const shopifyVariantId = `gid://shopify/ProductVariant/${variantId}`
  
  const query = `
    query getProductImageFromVariant($id: ID!) {
      productVariant(id: $id) {
        product {
          images(first: 1) {
            edges {
              node {
                originalSrc
              }
            }
          }
        }
      }
    }
  `
  
  try {
    const response = await fetch(`https://${storeDomain}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminToken,
      },
      body: JSON.stringify({
        query,
        variables: { id: shopifyVariantId }
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      const images = data.data?.productVariant?.product?.images?.edges || []
      if (images.length > 0) {
        return images[0].node.originalSrc
      }
    }
  } catch (error) {
    console.error('Failed to fetch image from Admin API:', error)
  }
  
  return null
}

// ============================================================================
// ORDER SPLITTING LOGIC
// ============================================================================

async function processOrderItems(shopifyOrder: any, storeSource: string): Promise<any[]> {
  const lineItems = shopifyOrder.line_items || []
  const cakeItems: any[] = []
  const accessoryItems: any[] = []
  
  for (const item of lineItems) {
    if (isCakeItem(item)) {
      for (let i = 0; i < item.quantity; i++) {
        cakeItems.push(item)
      }
    } else if (isAccessoryItem(item)) {
      accessoryItems.push(item)
    }
  }
  
  console.log(`Categorized: ${cakeItems.length} cakes, ${accessoryItems.length} accessories`)
  
  const customerName = extractCustomerName(shopifyOrder)
  const deliveryDate = extractDeliveryDate(shopifyOrder)
  const deliveryMethod = extractDeliveryMethod(shopifyOrder)
  const notes = extractNotes(shopifyOrder)
  
  const orders: any[] = []
  
  if (cakeItems.length <= 1) {
    const cakeItem = cakeItems[0]
    
    const humanId = storeSource === 'Flourlane' 
      ? `flourlane-${shopifyOrder.order_number}`
      : `bannos-${shopifyOrder.order_number}`
    
    // Fetch product image from Shopify Admin API
    // Use variant_id (REST format) or product_id (GraphQL normalized format)
    const variantId = cakeItem && (cakeItem.variant_id || cakeItem.product_id)
    const productImage = variantId
      ? await fetchProductImage(variantId.toString(), storeSource)
      : null
    
    const order: any = {
      id: humanId,
      shopify_order_id: shopifyOrder.id?.toString().match(/\d+/)?.[0] ? parseInt(shopifyOrder.id.toString().match(/\d+/)[0]) : null,
      shopify_order_gid: shopifyOrder.admin_graphql_api_id || shopifyOrder.id,
      shopify_order_number: shopifyOrder.order_number,
      customer_name: customerName,
      product_title: cakeItem ? cakeItem.title : null,
      flavour: cakeItem ? extractFlavour(cakeItem) : null,
      size: cakeItem ? extractSize(cakeItem) : null,
      cake_writing: cakeItem ? extractCakeWriting(cakeItem) : null,
      notes: notes,
      currency: shopifyOrder.currency || 'AUD',
      total_amount: parseFloat(shopifyOrder.total_price || 0),
      order_json: shopifyOrder, // Store normalized version
      due_date: deliveryDate,
      delivery_method: deliveryMethod,
      product_image: productImage,
      item_qty: 1, // Each order represents 1 item (even if original had multiple)
      accessories: formatAccessories(accessoryItems)
    }
    
    orders.push(order)
    
  } else {
    // Multiple cakes - split into separate orders
    const suffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    
    for (let i = 0; i < cakeItems.length; i++) {
      const cakeItem = cakeItems[i]
      const suffix = suffixes[i] || (i + 1).toString()
      const isFirstOrder = i === 0
      
      const humanId = storeSource === 'Flourlane'
        ? `flourlane-${shopifyOrder.order_number}-${suffix}`
        : `bannos-${shopifyOrder.order_number}-${suffix}`
      
      // Fetch product image from Shopify Admin API
      // Use variant_id (REST format) or product_id (GraphQL normalized format)
      const variantId = cakeItem.variant_id || cakeItem.product_id
      const productImage = variantId
        ? await fetchProductImage(variantId.toString(), storeSource)
        : null
      
      const order: any = {
        id: humanId,
        shopify_order_id: shopifyOrder.id?.toString().match(/\d+/)?.[0] ? parseInt(shopifyOrder.id.toString().match(/\d+/)[0]) : null,
        shopify_order_gid: shopifyOrder.admin_graphql_api_id || shopifyOrder.id,
        shopify_order_number: shopifyOrder.order_number,
        customer_name: customerName,
        product_title: cakeItem.title,
        flavour: extractFlavour(cakeItem),
        size: extractSize(cakeItem),
        cake_writing: extractCakeWriting(cakeItem),
        notes: notes,
        currency: shopifyOrder.currency || 'AUD',
        total_amount: isFirstOrder ? parseFloat(shopifyOrder.total_price || 0) : null,
        order_json: shopifyOrder, // Store normalized version
        due_date: deliveryDate,
        delivery_method: deliveryMethod,
        product_image: productImage,
        item_qty: 1, // Each split order represents 1 item from the original quantity
        accessories: isFirstOrder ? formatAccessories(accessoryItems) : null // Accessories only on first order
      }
      
      orders.push(order)
    }
  }
  
  return orders
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

async function processInboxOrders(storeSource: string, limit: number = 50) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials')
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const inboxTable = storeSource === 'Flourlane' 
    ? 'webhook_inbox_flourlane'
    : 'webhook_inbox_bannos'
    
  const orderTable = storeSource === 'Flourlane' 
    ? 'orders_flourlane'
    : 'orders_bannos'
  
  console.log(`Processing ${storeSource} inbox (limit: ${limit})`)
  
  const { data: webhooks, error: fetchError } = await supabase
    .from(inboxTable)
    .select('*')
    .eq('processed', false)
    .order('id', { ascending: true })
    .limit(limit)
  
  if (fetchError) {
    console.error('Error fetching webhooks:', fetchError)
    throw fetchError
  }
  
  console.log(`Found ${webhooks.length} unprocessed webhooks`)
  
  const results: { webhookId: any; orderNumber: any; success: boolean; message?: string; error?: string }[] = []
  let successCount = 0
  let failCount = 0
  
  for (const webhook of webhooks) {
    try {
      // Normalize webhook (convert GraphQL to REST if needed)
      const shopifyOrder = normalizeWebhook(webhook.payload)
      
      console.log(`Processing order: ${shopifyOrder.order_number}`)
      
      const orders = await processOrderItems(shopifyOrder, storeSource)
      
      if (orders.length === 0) {
        console.log('No production items - skipping')
        
        await supabase
          .from(inboxTable)
          .update({ processed: true })
          .eq('id', webhook.id)
        
        results.push({
          webhookId: webhook.id,
          orderNumber: shopifyOrder.order_number,
          success: true,
          message: 'No production items'
        })
        
        successCount++
        continue
      }
      
      for (const order of orders) {
        console.log(`Inserting order: ${order.id}`)
        
        const { error: insertError } = await supabase
          .from(orderTable)
          .upsert(order, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
        
        if (insertError) {
          console.error('Error inserting order:', insertError)
          throw insertError
        }
      }
      
      await supabase
        .from(inboxTable)
        .update({ processed: true })
        .eq('id', webhook.id)
      
      results.push({
        webhookId: webhook.id,
        orderNumber: shopifyOrder.order_number,
        success: true,
        ordersCreated: orders.length,
        orderIds: orders.map((o: any) => o.id)
      })
      
      successCount++
      
    } catch (error) {
      console.error(`Failed to process webhook ${webhook.id}:`, error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // Better error serialization for Supabase errors
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error)
      } else {
        errorMessage = String(error)
      }
      
      results.push({
        webhookId: webhook.id,
        success: false,
        error: errorMessage
      })
      
      failCount++
    }
  }
  
  return {
    success: true,
    store: storeSource,
    totalProcessed: webhooks.length,
    successCount,
    failCount,
    results
  }
}

// ============================================================================
// EDGE FUNCTION HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { store, limit } = await req.json()
    
    if (!store || !['bannos', 'flourlane'].includes(store.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Invalid store. Must be "bannos" or "flourlane"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const storeSource = store.toLowerCase() === 'flourlane' ? 'Flourlane' : 'Bannos'
    const processLimit = limit || 50
    
    const result = await processInboxOrders(storeSource, processLimit)
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Processor error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
