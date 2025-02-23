
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface MercadoPagoWebhook {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: string;
  live_mode: boolean;
  type: string;
  user_id: number;
}

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json() as MercadoPagoWebhook
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2))

    // Validate payload structure
    if (!payload.data?.id || !payload.type || !payload.action) {
      console.error('Invalid payload structure:', payload)
      throw new Error('Invalid webhook payload structure')
    }

    // Only process payment updates
    if (payload.type !== 'payment' || !payload.action.includes('payment')) {
      console.log('Ignoring non-payment webhook:', payload.type)
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored non-payment webhook' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paymentId = payload.data.id
    console.log('Processing payment ID:', paymentId)

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

    // Check payment status with MercadoPago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`
        }
      }
    )

    if (!mpResponse.ok) {
      console.error('MercadoPago API error:', await mpResponse.text())
      throw new Error(`Failed to fetch payment status: ${mpResponse.statusText}`)
    }

    const mpPayment = await mpResponse.json()
    console.log('Payment data from MercadoPago:', JSON.stringify(mpPayment, null, 2))

    // Find the corresponding payment in our database
    const { data: paymentData, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle()

    if (paymentError) {
      console.error('Database query error:', paymentError)
      throw paymentError
    }

    if (!paymentData) {
      console.log('Payment not found in database:', paymentId)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Payment record not found in database',
          paymentId 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Return 200 even for not found to acknowledge the webhook
        }
      )
    }

    // Update payment status if approved
    if (mpPayment.status === 'approved') {
      console.log('Payment approved, updating records...')

      // Begin updating related records
      try {
        // 1. Update payment record
        const { error: updateError } = await supabaseClient
          .from('payments')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('payment_id', paymentId)

        if (updateError) throw updateError

        // 2. Create notification
        const { error: notificationError } = await supabaseClient
          .from('payment_notifications')
          .insert({
            user_id: paymentData.user_id,
            payment_id: paymentId,
            plan_type: paymentData.plan_type,
            status: 'completed'
          })

        if (notificationError) throw notificationError

        // 3. Deactivate any existing plan access
        const { error: deactivateError } = await supabaseClient
          .from('plan_access')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', paymentData.user_id)
          .eq('plan_type', paymentData.plan_type)

        if (deactivateError) throw deactivateError

        // 4. Grant new plan access
        const { error: accessError } = await supabaseClient
          .from('plan_access')
          .insert({
            user_id: paymentData.user_id,
            plan_type: paymentData.plan_type,
            payment_required: false,
            is_active: true
          })

        if (accessError) throw accessError

        // 5. Reset plan generation count
        const countColumn = `${paymentData.plan_type}_count`
        const { error: resetError } = await supabaseClient
          .from('plan_generation_counts')
          .upsert({
            user_id: paymentData.user_id,
            [countColumn]: 0,
            updated_at: new Date().toISOString()
          })

        if (resetError) {
          console.error('Error resetting plan count:', resetError)
          // Don't throw here as it's not critical
        }

        console.log('Successfully processed payment:', paymentId)
      } catch (error) {
        console.error('Error updating records:', error)
        throw error
      }
    } else {
      console.log(`Payment ${paymentId} status is ${mpPayment.status}, no action needed`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Webhook processed successfully',
        paymentId,
        status: mpPayment.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
