
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data } = await req.json()
    console.log('Webhook received:', data)

    if (data.action === "payment.created" && data.data?.id) {
      const paymentId = data.data.id;
      
      // Initialize Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )

      // Get payment details from our database
      const { data: paymentData, error: paymentError } = await supabaseClient
        .from('payments')
        .select('user_id, plan_type, status')
        .eq('payment_id', paymentId)
        .single()

      if (paymentError) throw paymentError

      if (paymentData) {
        // Update payment status
        const { error: updateError } = await supabaseClient
          .from('payments')
          .update({ status: 'completed' })
          .eq('payment_id', paymentId)

        if (updateError) throw updateError

        // Reset generation count for this plan type
        const { error: countError } = await supabaseClient
          .from('plan_generation_counts')
          .upsert({
            user_id: paymentData.user_id,
            [`${paymentData.plan_type}_count`]: 0
          })

        if (countError) throw countError

        // Disable payment requirement
        const { error: accessError } = await supabaseClient.functions.invoke('grant-plan-access', {
          body: {
            userId: paymentData.user_id,
            planType: paymentData.plan_type,
            disablePayment: true,
            message: 'Payment processed successfully'
          }
        })

        if (accessError) throw accessError

        // Create notification
        const { error: notificationError } = await supabaseClient
          .from('payment_notifications')
          .insert({
            user_id: paymentData.user_id,
            payment_id: paymentId,
            status: 'completed',
            plan_type: paymentData.plan_type
          })

        if (notificationError) throw notificationError
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
