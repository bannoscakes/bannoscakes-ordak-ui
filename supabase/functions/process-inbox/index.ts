// Order Inbox Processor - Processes webhooks from inbox tables to orders tables
// Reads from: webhook_inbox_bannos, webhook_inbox_flourlane
// Outputs to: orders_bannos, orders_flourlane
// Supports BOTH REST and GraphQL webhook formats

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// WEBHOOK FORMAT DETECTION
// ============================================================================

function detectWebhookFormat(payload: any): 'REST' | 'GraphQL' {
  // GraphQL has 'lineItems' (camelCase) and 'edges'
  if (payload.lineItems && Array.isArray(payload.lineItems?.edges)) {
    return 'GraphQL'
  }
  // REST has 'line_items' (snake_case)
  if (payload.line_items && Array.isArray(payload.line_items)) {
    return 'REST'
  }
  // Default to REST for backwards compatibility
  return 'REST'
}

// ============================================================================
// GRAPHQL FORMAT ADAPTERS
// ============================================================================

function normalizeGraphQLOrder(graphqlOrder: any): any {
  // Convert GraphQL format to normalized format
  const lineItems = (graphqlOrder.lineItems?.edges || []).map((edge: any) => {
    const node = edge.node
    return {
      id: node.id,
      title: node.title,
      quantity: node.quantity || 1,
      product_id: extractProductIdFromGid(node.variant?.id || node.id),
      variant_id: extractProductIdFromGid(node.variant?.id),
      variant_title: node.variant?.title,
      price: node.variant?.price || '0',
      properties: node.customAttributes || [],
      vendor: node.vendor
    }
  })
  
  // Extract order number from name (e.g., "#B22588" -> 22588)
  const orderNumber = extractOrderNumber(graphqlOrder.name || '')
  
  return {
    id: graphqlOrder.id,
    order_number: orderNumber,
    admin_graphql_api_id: graphqlOrder.id,
    line_items: lineItems,
    customer: {
      name: graphqlOrder.customer ? 
        `${graphqlOrder.customer.firstName || ''} ${graphqlOrder.customer.lastName || ''}`.trim() : null,
      first_name: graphqlOrder.customer?.firstName,
      last_name: graphqlOrder.customer?.lastName,
      email: graphqlOrder.customer?.email
    },
    shipping_address: graphqlOrder.shippingAddress ? {
      name: graphqlOrder.shippingAddress.name,
      address1: graphqlOrder.shippingAddress.address1,
      address2: graphqlOrder.shippingAddress.address2,
      city: graphqlOrder.shippingAddress.city,
      province: graphqlOrder.shippingAddress.province,
      zip: graphqlOrder.shippingAddress.zip,
      country: graphqlOrder.shippingAddress.country
    } : null,
    note: graphqlOrder.note,
    note_attributes: graphqlOrder.customAttributes || [],
    currency: graphqlOrder.totalPriceSet?.shopMoney?.currencyCode || 'AUD',
    total_price: graphqlOrder.totalPriceSet?.shopMoney?.amount || '0',
    created_at: graphqlOrder.createdAt,
    tags: Array.isArray(graphqlOrder.tags) ? graphqlOrder.tags.join(', ') : (graphqlOrder.tags || '')
  }
}

function extractProductIdFromGid(gid: string): string | null {
  if (!gid) return null
  // Extract number from "gid://shopify/Product/123" or "gid://shopify/ProductVariant/456"
  const match = gid.match(/\/(\d+)$/)
  return match ? match[1] : null
}

function extractOrderNumber(name: string): number | null {
  if (!name) return null
  // Extract number from "#B22588" or "#F12345"
  const match = name.match(/\d+/)
  return match ? parseInt(match[0], 10) : null
}

// ============================================================================
// ITEM CATEGORIZATION
// ============================================================================

function isCakeItem(item: any): boolean {
  const title = (item.title || '').toLowerCase()
  
  // If it's an accessory, it's NOT a cake (priority rule)
  if (isAccessoryItem(item)) {
    return false
  }
  
  // Contains "cake" but exclude accessory patterns
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

function extractAllProperties(item: any): any[] {
  const properties = item.properties || []
  const extracted = []
  
  for (const prop of properties) {
    const name = (prop.name || '').toString()
    const value = (prop.value || '').toString()
    
    if (!name) continue
    
    // Skip filtered properties
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
  const properties = extractAllProperties(item)
  
  if (properties.length === 0) {
    return null
  }
  
  return properties.map(p => p.display).join(' | ')
}

function extractSize(item: any): string | null {
  if (!item.variant_title) {
    return null
  }
  
  const variantTitle = item.variant_title
  
  // Check for compound sizes first
  if (variantTitle.toLowerCase().includes('gift size')) return 'Gift Size'
  if (variantTitle.toLowerCase().includes('small tall')) return 'Small Tall'
  if (variantTitle.toLowerCase().includes('medium tall')) return 'Medium Tall'
  if (variantTitle.toLowerCase().includes('large tall')) return 'Large Tall'
  
  const sizePart = variantTitle.split('#')[0].trim()
  
  if (sizePart.toLowerCase().includes('small')) return 'Small'
  if (sizePart.toLowerCase().includes('medium')) return 'Medium'
  if (sizePart.toLowerCase().includes('large')) return 'Large'
  if (sizePart.toLowerCase().includes('tall')) return 'Tall'
  
  return sizePart || variantTitle
}

function extractNotes(shopifyOrder: any): string | null {
  const notes = shopifyOrder.note || ''
  return notes.trim() || null
}

// ============================================================================
// ADMIN API - IMAGE FETCHING
// ============================================================================

async function fetchProductImage(productId: string, storeSource: string): Promise<string | null> {
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
  
  const shopifyProductId = `gid://shopify/Product/${productId}`
  
  const query = `
    query getProductImages($id: ID!) {
      product(id: $id) {
        images(first: 1) {
          edges {
            node {
              originalSrc
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
        variables: { id: shopifyProductId }
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      const images = data.data?.product?.images?.edges || []
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

async function processOrderItems(shopifyOrder: any, storeSource: string, originalPayload: any): Promise<any[]> {
  const lineItems = shopifyOrder.line_items || []
  const cakeItems = []
  const accessoryItems = []
  
  // Categorize items
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
  
  // Extract common order data
  const customerName = extractCustomerName(shopifyOrder)
  const deliveryDate = extractDeliveryDate(shopifyOrder)
  const deliveryMethod = extractDeliveryMethod(shopifyOrder)
  const notes = extractNotes(shopifyOrder)
  
  const orders = []
  
  // If only one cake or no cakes, create single order
  if (cakeItems.length <= 1) {
    const cakeItem = cakeItems[0]
    
    const humanId = storeSource === 'Flourlane' 
      ? `flourlane-${shopifyOrder.order_number}`
      : `bannos-${shopifyOrder.order_number}`
    
    // Fetch product image from Admin API
    const productImage = cakeItem && cakeItem.product_id
      ? await fetchProductImage(cakeItem.product_id, storeSource)
      : null
    
    const order: any = {
      id: humanId,
      shopify_order_id: shopifyOrder.id?.toString(),
      shopify_order_gid: shopifyOrder.admin_graphql_api_id,
      shopify_order_number: shopifyOrder.order_number,
      customer_name: customerName,
      product_title: cakeItem ? cakeItem.title : 'Custom Order',
      flavour: cakeItem ? extractFlavour(cakeItem) : null,
      size: cakeItem ? extractSize(cakeItem) : null,
      notes: notes,
      currency: shopifyOrder.currency || 'AUD',
      total_amount: parseFloat(shopifyOrder.total_price || 0),
      order_json: originalPayload, // Store original payload (REST or GraphQL)
      due_date: deliveryDate,
      delivery_method: deliveryMethod,
      product_image: productImage
    }
    
    orders.push(order)
    
  } else {
    // Multiple cakes - split into separate orders
    const suffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    
    for (let i = 0; i < cakeItems.length; i++) {
      const cakeItem = cakeItems[i]
      const suffix = suffixes[i] || (i + 1).toString()
      
      const humanId = storeSource === 'Flourlane'
        ? `flourlane-${shopifyOrder.order_number}-${suffix}`
        : `bannos-${shopifyOrder.order_number}-${suffix}`
      
      // Fetch product image from Admin API
      const productImage = cakeItem.product_id
        ? await fetchProductImage(cakeItem.product_id, storeSource)
        : null
      
      const order: any = {
        id: humanId,
        shopify_order_id: shopifyOrder.id?.toString(),
        shopify_order_gid: shopifyOrder.admin_graphql_api_id,
        shopify_order_number: shopifyOrder.order_number,
        customer_name: customerName,
        product_title: cakeItem.title,
        flavour: extractFlavour(cakeItem),
        size: extractSize(cakeItem),
        notes: notes,
        currency: shopifyOrder.currency || 'AUD',
        total_amount: parseFloat(shopifyOrder.total_price || 0),
        order_json: originalPayload, // Store original payload (REST or GraphQL)
        due_date: deliveryDate,
        delivery_method: deliveryMethod,
        product_image: productImage
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
  
  // Determine table names based on store
  const inboxTable = storeSource === 'Flourlane' 
    ? 'webhook_inbox_flourlane'
    : 'webhook_inbox_bannos'
    
  const orderTable = storeSource === 'Flourlane' 
    ? 'orders_flourlane'
    : 'orders_bannos'
  
  console.log(`Processing ${storeSource} inbox (limit: ${limit})`)
  
  // Fetch unprocessed webhooks
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
  
  const results = []
  let successCount = 0
  let failCount = 0
  let restCount = 0
  let graphqlCount = 0
  
  for (const webhook of webhooks) {
    try {
      const originalPayload = webhook.payload
      const webhookFormat = detectWebhookFormat(originalPayload)
      
      console.log(`Processing webhook ${webhook.id} - Format: ${webhookFormat}`)
      
      if (webhookFormat === 'GraphQL') {
        graphqlCount++
      } else {
        restCount++
      }
      
      // Normalize to common format
      const shopifyOrder = webhookFormat === 'GraphQL' 
        ? normalizeGraphQLOrder(originalPayload)
        : originalPayload
      
      console.log(`Order number: ${shopifyOrder.order_number}`)
      
      // Process order items and apply splitting logic
      const orders = await processOrderItems(shopifyOrder, storeSource, originalPayload)
      
      if (orders.length === 0) {
        console.log('No production items - skipping')
        
        // Mark as processed anyway
        await supabase
          .from(inboxTable)
          .update({ processed: true })
          .eq('id', webhook.id)
        
        results.push({
          webhookId: webhook.id,
          orderNumber: shopifyOrder.order_number,
          format: webhookFormat,
          success: true,
          message: 'No production items'
        })
        
        successCount++
        continue
      }
      
      // Insert orders
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
      
      // Mark as processed
      await supabase
        .from(inboxTable)
        .update({ processed: true })
        .eq('id', webhook.id)
      
      results.push({
        webhookId: webhook.id,
        orderNumber: shopifyOrder.order_number,
        format: webhookFormat,
        success: true,
        ordersCreated: orders.length,
        orderIds: orders.map((o: any) => o.id)
      })
      
      successCount++
      
    } catch (error) {
      console.error(`Failed to process webhook ${webhook.id}:`, error)
      
      results.push({
        webhookId: webhook.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
    restFormatCount: restCount,
    graphqlFormatCount: graphqlCount,
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
