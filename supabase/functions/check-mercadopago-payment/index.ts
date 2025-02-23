
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { paymentId } = await req.json()
    
    if (!paymentId) {
      throw new Error('Payment ID is required')
    }

    console.log('Checking payment status for ID:', paymentId)

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

    // First check in our database
    const { data: paymentData, error: dbError } = await supabaseClient
      .from('payments')
      .select('status')
      .eq('payment_id', paymentId)
      .maybeSingle()

    if (dbError) {
      throw dbError
    }

    if (paymentData?.status === 'completed') {
      console.log('Payment already marked as completed in database')
      return new Response(
        JSON.stringify({ isPaid: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check with MercadoPago
    console.log('Checking payment status with MercadoPago API')
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`
        }
      }
    )

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text()
      console.error('MercadoPago API error:', errorText)
      throw new Error(`Failed to check payment status: ${mpResponse.statusText}`)
    }

    const mpPayment = await mpResponse.json()
    console.log('MercadoPago payment data:', JSON.stringify(mpPayment, null, 2))

    const isPaid = mpPayment.status === 'approved'
    
    if (isPaid) {
      console.log('Payment is approved')
      // Update payment status in our database
      const { error: updateError } = await supabaseClient
        .from('payments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', paymentId)

      if (updateError) {
        console.error('Error updating payment status:', updateError)
        throw updateError
      }
    }

    return new Response(
      JSON.stringify({ 
        isPaid,
        status: mpPayment.status,
        paymentId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error checking payment:', error)
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
