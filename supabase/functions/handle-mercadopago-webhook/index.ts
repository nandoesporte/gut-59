
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
    const notification = await req.json()
    console.log('Received webhook notification:', JSON.stringify(notification))

    if (!notification.action || !notification.data || !notification.data.id) {
      console.error('Invalid notification format:', JSON.stringify(notification))
      return new Response(
        JSON.stringify({ error: 'Invalid notification format' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Se for uma notificação de pagamento
    if (notification.action === 'payment.updated' || notification.action === 'payment.created') {
      const mpPaymentId = notification.data.id.toString()
      console.log('Mercado Pago payment ID:', mpPaymentId)

      try {
        // Buscar detalhes do pagamento no Mercado Pago
        const mpResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
          {
            headers: {
              'Authorization': `Bearer ${mercadopagoToken}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!mpResponse.ok) {
          const errorData = await mpResponse.json()
          console.error('Mercado Pago API error:', JSON.stringify(errorData))
          
          if (mpResponse.status === 404) {
            return new Response(
              JSON.stringify({ message: 'Payment not found in Mercado Pago' }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            )
          }

          throw new Error(`Failed to fetch payment details: ${mpResponse.status}`)
        }

        const paymentData = await mpResponse.json()
        console.log('Payment data from Mercado Pago:', JSON.stringify(paymentData))

        // Verificamos se é um pagamento aprovado
        if (paymentData.status === 'approved') {
          const preferenceId = paymentData.external_reference || paymentData.preference_id
          console.log('Looking for payment with reference:', preferenceId)

          // Buscar o registro de pagamento correspondente
          const { data: payments, error: queryError } = await supabase
            .from('payments')
            .select('*')
            .eq('payment_id', preferenceId)
            .maybeSingle()

          if (queryError) {
            console.error('Error querying payment:', queryError)
            throw queryError
          }

          if (!payments) {
            console.log('No payment record found for reference:', preferenceId)
            return new Response(
              JSON.stringify({ message: 'Payment record not found' }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            )
          }

          // Atualizar status do pagamento para completed
          const { error: updateError } = await supabase
            .from('payments')
            .update({ status: 'completed' })
            .eq('payment_id', preferenceId)

          if (updateError) {
            console.error('Error updating payment:', updateError)
            throw updateError
          }

          // Criar notificação de pagamento
          const { error: notifyError } = await supabase
            .from('payment_notifications')
            .insert({
              user_id: payments.user_id,
              payment_id: preferenceId,
              status: 'completed',
              plan_type: payments.plan_type
            })

          if (notifyError) {
            console.error('Error creating notification:', notifyError)
            throw notifyError
          }

          // Verificar se já existe acesso ao plano
          const { data: existingAccess, error: accessCheckError } = await supabase
            .from('plan_access')
            .select('*')
            .eq('user_id', payments.user_id)
            .eq('plan_type', payments.plan_type)
            .eq('is_active', true)
            .maybeSingle()

          if (accessCheckError) {
            console.error('Error checking plan access:', accessCheckError)
            throw accessCheckError
          }

          // Se não existe acesso, criar novo
          if (!existingAccess) {
            const { error: accessError } = await supabase
              .from('plan_access')
              .insert({
                user_id: payments.user_id,
                plan_type: payments.plan_type,
                payment_required: false,
                is_active: true
              })

            if (accessError) {
              console.error('Error granting plan access:', accessError)
              throw accessError
            }
          }

          console.log('Payment processed successfully')
          return new Response(
            JSON.stringify({ message: 'Payment processed successfully' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          )
        }

        // Se pagamento não está aprovado, apenas logamos
        console.log(`Payment ${mpPaymentId} status: ${paymentData.status}`)
        return new Response(
          JSON.stringify({ message: `Payment status: ${paymentData.status}` }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )

      } catch (error) {
        console.error('Error processing payment:', error)
        throw error
      }
    }

    // Notificação processada mas nenhuma ação necessária
    return new Response(
      JSON.stringify({ message: 'Notification acknowledged' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
