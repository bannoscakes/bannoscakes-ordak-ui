import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'

serve(async (req) => {
  try {
    // Check required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl) {
      console.error('[ERROR] SUPABASE_URL environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: SUPABASE_URL not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!supabaseServiceRoleKey) {
      console.error('[ERROR] SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    // Check both stores
    const [bannos, flourlane] = await Promise.all([
      supabase.from('orders_bannos').select('id', { count: 'exact', head: true })
        .gte('created_at', twoHoursAgo),
      supabase.from('orders_flourlane').select('id', { count: 'exact', head: true })
        .gte('created_at', twoHoursAgo)
    ])

    // Check for database errors or null counts
    if (bannos.error || flourlane.error || bannos.count == null || flourlane.count == null) {
      console.error('[ERROR] Failed to query order counts:', {
        bannos_error: bannos.error,
        flourlane_error: flourlane.error,
        bannos_count: bannos.count,
        flourlane_count: flourlane.count
      })
      return new Response(
        JSON.stringify({ error: 'Failed to query order counts' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const alerts: string[] = []
    if (bannos.count === 0) alerts.push('Bannos')
    if (flourlane.count === 0) alerts.push('Flourlane')

    if (alerts.length > 0) {
      // Get alert email from environment (fallback for backwards compatibility)
      const alertEmail = Deno.env.get('ALERT_EMAIL') || 'panos@bannos.com.au'
      
      // Send email via Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: alertEmail,
          subject: `[ALERT] ${alerts.join(' & ')} - No orders processed in 2 hours`,
          html: `<p>No new orders have been processed in the last 2 hours for: <strong>${alerts.join(', ')}</strong></p>
                 <p>Bannos count: ${bannos.count}</p>
                 <p>Flourlane count: ${flourlane.count}</p>
                 <p>Checked at: ${new Date().toISOString()}</p>`
        })
      })

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text()
        console.error(`[ERROR] Failed to send email: ${emailResponse.status} ${errorText}`)
        return new Response(JSON.stringify({ 
          error: 'Failed to send email',
          bannos: bannos.count,
          flourlane: flourlane.count,
          alerts
        }), { status: 500 })
      }

      console.log(`[ALERT] Sent email for: ${alerts.join(', ')}`)
    } else {
      console.log(`[OK] Orders processed in last 2h - Bannos: ${bannos.count}, Flourlane: ${flourlane.count}`)
    }

    return new Response(JSON.stringify({ bannos: bannos.count, flourlane: flourlane.count, alerts }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[ERROR] Unexpected error in order-monitor:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
