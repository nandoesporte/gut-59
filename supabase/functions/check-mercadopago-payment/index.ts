
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const mercadopagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')

if (!supabaseUrl || !supabaseKey || !mercadopagoToken) {
  throw new Error('Required environment variables are not set.')
}

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { paymentId, userId, planType } = await req.json()
    console.log(`Checking payment status for ID: ${paymentId}, User: ${userId}, Plan: ${planType}`)

    // First check if payment is already completed in our database
    const { data: paymentData } = await supabase
      .from('payments')
      .select('status')
      .eq('payment_id', paymentId)
      .eq('status', 'completed')
      .maybeSingle()

    if (paymentData) {
      console.log('Payment already completed in database')
      return new Response(
        JSON.stringify({ isPaid: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Then check payment notifications
    const { data: notificationData } = await supabase
      .from('payment_notifications')
      .select('status')
      .eq('payment_id', paymentId)
      .eq('status', 'completed')
      .maybeSingle()

    if (notificationData) {
      console.log('Payment completed according to notifications')
      return new Response(
        JSON.stringify({ isPaid: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If not found in our system, check with Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${mercadopagoToken}`
        }
      }
    )

    if (!mpResponse.ok) {
      throw new Error(`Failed to check payment status: ${mpResponse.status}`)
    }

    const mpData = await mpResponse.json()
    console.log('MercadoPago response:', JSON.stringify(mpData))

    if (mpData.results && mpData.results.length > 0) {
      const payment = mpData.results[0]
      const isPaid = payment.status === 'approved'

      if (isPaid) {
        // Update payment status
        const { error: updateError } = await supabase
          .from('payments')
          .update({ status: 'completed' })
          .eq('payment_id', paymentId)

        if (updateError) {
          console.error('Error updating payment status:', updateError)
          throw updateError
        }

        // Create notification
        const { error: notifyError } = await supabase
          .from('payment_notifications')
          .insert({
            user_id: userId,
            payment_id: paymentId,
            status: 'completed',
            plan_type: planType
          })

        if (notifyError) {
          console.error('Error creating notification:', notifyError)
          throw notifyError
        }
      }

      return new Response(
        JSON.stringify({ isPaid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ isPaid: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
