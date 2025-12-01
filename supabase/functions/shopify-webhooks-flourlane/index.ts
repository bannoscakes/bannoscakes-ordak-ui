import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HMAC verification - LOG ONLY (safe rollout)
async function verifyHmac(
  body: string,
  hmacHeader: string | null,
  secret: string | undefined
): Promise<{ valid: boolean; reason: string }> {
  if (!secret) {
    return { valid: false, reason: 'missing_secret' }
  }
  if (!hmacHeader) {
    return { valid: false, reason: 'missing_header' }
  }

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body))
    const computed = btoa(String.fromCharCode(...new Uint8Array(signature)))

    return computed === hmacHeader
      ? { valid: true, reason: 'match' }
      : { valid: false, reason: 'mismatch' }
  } catch (err) {
    return { valid: false, reason: `error: ${err instanceof Error ? err.message : 'unknown'}` }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Read raw body FIRST (before parsing JSON) - required for HMAC
  const rawBody = await req.text()

  // HMAC validation (LOG ONLY - never blocks)
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256')
  const webhookSecret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET_FLOURLANE')
  const hmacResult = await verifyHmac(rawBody, hmacHeader, webhookSecret)

  // Parse order ID for logging
  let orderId = 'unknown'
  try {
    const parsed = JSON.parse(rawBody)
    orderId = parsed.order_number || parsed.name || parsed.id || 'unknown'
  } catch {
    // Will handle parse error below
  }

  // Log HMAC result (safe - always continues processing)
  console.log(`[HMAC] ${hmacResult.valid ? 'PASS' : 'FAIL'} | reason=${hmacResult.reason} | order=${orderId}`)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing env vars')
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const shopifyOrder = JSON.parse(rawBody)

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
    const { error } = await supabase.from('webhook_inbox_flourlane').upsert({
      id: `flourlane-${shopifyOrder.order_number || shopifyOrder.id}`,
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
