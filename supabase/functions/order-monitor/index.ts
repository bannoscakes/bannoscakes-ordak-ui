import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  // Check both stores
  const [bannos, flourlane] = await Promise.all([
    supabase.from('orders_bannos').select('id', { count: 'exact', head: true })
      .gte('created_at', twoHoursAgo),
    supabase.from('orders_flourlane').select('id', { count: 'exact', head: true })
      .gte('created_at', twoHoursAgo)
  ])

  const alerts: string[] = []
  if (bannos.count === 0) alerts.push('Bannos')
  if (flourlane.count === 0) alerts.push('Flourlane')

  if (alerts.length > 0) {
    // Send email via Resend
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'panos@bannos.com.au',
        subject: `[ALERT] ${alerts.join(' & ')} - No orders processed in 2 hours`,
        html: `<p>No new orders have been processed in the last 2 hours for: <strong>${alerts.join(', ')}</strong></p>
               <p>Bannos count: ${bannos.count}</p>
               <p>Flourlane count: ${flourlane.count}</p>
               <p>Checked at: ${new Date().toISOString()}</p>`
      })
    })
    console.log(`[ALERT] Sent email for: ${alerts.join(', ')}`)
  } else {
    console.log(`[OK] Orders processed in last 2h - Bannos: ${bannos.count}, Flourlane: ${flourlane.count}`)
  }

  return new Response(JSON.stringify({ bannos: bannos.count, flourlane: flourlane.count, alerts }))
})
