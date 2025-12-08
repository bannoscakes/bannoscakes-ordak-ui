// @ts-nocheck
// Edge Function: sync-shopify-orders (COMPLETE IMPLEMENTATION)
// Purpose: Sync unfulfilled orders with future due dates from Shopify Admin API
// Called by: sync_shopify_orders RPC

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

// Parse due date from tags (Format: "Fri 14 Nov 2025")
function parseDueDateFromTags(tags: string[]): Date | null {
  const datePattern = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/;
  
  const dueDateTag = tags.find((tag: string) => datePattern.test(tag.trim()));
  if (!dueDateTag) return null;
  
  const parts = dueDateTag.trim().split(/\s+/);
  const day = parts[1];
  const month = parts[2];
  const year = parts[3];
  
  const monthMap: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  const monthNum = monthMap[month];
  const dateString = `${year}-${monthNum}-${day.padStart(2, '0')}`;
  
  return new Date(dateString);
}

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
    console.log(`Starting sync for store: ${store}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Shopify API version from env, fallback to current supported version
    const apiVersion = Deno.env.get('SHOPIFY_API_VERSION') || '2025-01';

    // Fetch ALL unfulfilled orders from Shopify (with pagination)
    let hasNextPage = true;
    let cursor: string | null = null;
    const allOrders: any[] = [];

    while (hasNextPage) {
      const query = `
        query($cursor: String) {
          orders(
            first: 50, 
            after: $cursor,
            query: "fulfillment_status:unfulfilled"
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                name
                email
                createdAt
                tags
                displayFulfillmentStatus
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                lineItems(first: 50) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      variant {
                        id
                        title
                        sku
                      }
                    }
                  }
                }
                shippingAddress {
                  address1
                  address2
                  city
                  province
                  zip
                  country
                }
                customer {
                  firstName
                  lastName
                  email
                  phone
                }
              }
            }
          }
        }
      `;

      const response = await fetch(
        `https://${shopUrl}/admin/api/${apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token
          },
          body: JSON.stringify({ query, variables: { cursor } })
        }
      );

      const result = await response.json();

      if (result.errors) {
        console.error('Shopify API errors:', result.errors);
        throw new Error(`Shopify API error: ${result.errors.map((e: any) => e.message).join(', ')}`);
      }

      const ordersData = result.data?.orders;
      if (!ordersData) break;

      for (const edge of ordersData.edges) {
        allOrders.push(edge.node);
      }

      hasNextPage = ordersData.pageInfo.hasNextPage;
      cursor = ordersData.pageInfo.endCursor;
      
      console.log(`Fetched ${ordersData.edges.length} orders, hasNextPage: ${hasNextPage}`);
    }

    console.log(`Total unfulfilled orders fetched: ${allOrders.length}`);

    // Filter and import orders
    // Use UTC midnight to match parseDueDateFromTags which returns UTC dates
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let importedCount = 0;
    let skippedNoDueDateCount = 0;
    let skippedPastDueCount = 0;
    let skippedExistsCount = 0;
    let errorCount = 0;

    for (const order of allOrders) {
      try {
        const dueDate = parseDueDateFromTags(order.tags);
        
        if (!dueDate) {
          console.log(`Skipping ${order.name} - no due date in tags`);
          skippedNoDueDateCount++;
          continue;
        }
        
        if (dueDate < today) {
          console.log(`Skipping ${order.name} - past due: ${dueDate.toDateString()}`);
          skippedPastDueCount++;
          continue;
        }
        
        // Check if order already exists
        // Use regex to only remove leading #B prefix (e.g., #B1234 → 1234, #1B23 → 1B23)
        const orderNumber = order.name.replace(/^#?B?/, '');
        const { data: existing } = await supabase
          .from(`orders_${store}`)
          .select('id')
          .eq('shopify_order_number', orderNumber)
          .single();
          
        if (existing) {
          console.log(`Skipping ${order.name} - already exists`);
          skippedExistsCount++;
          continue;
        }
        
        // Import order into webhook inbox for processing
        console.log(`Importing ${order.name} with due date: ${dueDate.toDateString()}`);
        
        const { error: insertError } = await supabase
          .from(`webhook_inbox_${store}`)
          .upsert({
            id: `${store}-${orderNumber}`,
            payload: order,
            processed: false
          }, { onConflict: 'id' });
        
        if (insertError) {
          console.error(`Failed to insert ${order.name}:`, insertError);
          errorCount++;
        } else {
          importedCount++;
        }
      } catch (error) {
        console.error(`Error processing order ${order.name}:`, error);
        errorCount++;
      }
    }

    // Update sync run with results
    const summary = {
      total_fetched: allOrders.length,
      imported: importedCount,
      skipped_no_due_date: skippedNoDueDateCount,
      skipped_past_due: skippedPastDueCount,
      skipped_exists: skippedExistsCount,
      errors: errorCount
    };

    console.log('Sync complete:', summary);
    const hasErrors = errorCount > 0;

    const { error: updateError } = await supabase
      .from('shopify_sync_runs')
      .update({
        status: hasErrors ? 'error' : 'success',
        completed_at: new Date().toISOString(),
        orders_imported: importedCount,
        orders_skipped: skippedNoDueDateCount + skippedPastDueCount + skippedExistsCount,
        errors: errorCount,
        metadata: summary
      })
      .eq('id', run_id);

    if (updateError) {
      console.error('Failed to update sync run:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: !hasErrors,
        imported: importedCount,
        skipped: skippedNoDueDateCount + skippedPastDueCount + skippedExistsCount,
        errors: errorCount,
        message: hasErrors
          ? `Sync completed with ${errorCount} errors`
          : `Sync complete: ${importedCount} imported, ${skippedNoDueDateCount + skippedPastDueCount + skippedExistsCount} skipped`,
        details: summary
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    
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
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
