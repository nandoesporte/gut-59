
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log('Received webhook payload:', payload)

    // Validate payload
    if (!payload.data || !payload.type) {
      throw new Error('Invalid webhook payload')
    }

    // Only process 'payment' type notifications
    if (payload.type !== 'payment') {
      console.log('Ignoring non-payment webhook:', payload.type)
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored non-payment webhook' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paymentId = payload.data.id
    console.log('Processing payment:', paymentId)

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get payment details from our database
    const { data: paymentData, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle()

    if (paymentError) {
      throw paymentError
    }

    if (!paymentData) {
      throw new Error(`Payment not found: ${paymentId}`)
    }

    // Check payment status with MercadoPago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`
        }
      }
    )

    const mpPayment = await mpResponse.json()
    console.log('MercadoPago payment status:', mpPayment.status)

    // Update payment status in our database
    if (mpPayment.status === 'approved') {
      const { error: updateError } = await supabaseClient
        .from('payments')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', paymentId)

      if (updateError) {
        throw updateError
      }

      // Create payment notification
      const { error: notificationError } = await supabaseClient
        .from('payment_notifications')
        .insert({
          user_id: paymentData.user_id,
          payment_id: paymentId,
          plan_type: paymentData.plan_type,
          status: 'completed'
        })

      if (notificationError) {
        throw notificationError
      }

      // Grant plan access
      const { error: accessError } = await supabaseClient
        .from('plan_access')
        .insert({
          user_id: paymentData.user_id,
          plan_type: paymentData.plan_type,
          payment_required: true,
          is_active: true
        })

      if (accessError) {
        throw accessError
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
