
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const notification = await req.json()
    console.log('Received webhook notification:', JSON.stringify(notification))

    // Verificar se é uma notificação válida
    if (!notification.action || !notification.data || !notification.data.id) {
      console.error('Invalid notification format:', JSON.stringify(notification))
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid notification format' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Se for uma atualização de pagamento
    if (notification.action === 'payment.updated' || notification.action === 'payment.created') {
      const paymentId = notification.data.id
      console.log('Processing payment notification for ID:', paymentId)

      try {
        // Buscar detalhes do pagamento na API do Mercado Pago
        const mpResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          {
            headers: {
              'Authorization': `Bearer ${mercadopagoToken}`
            }
          }
        )

        if (!mpResponse.ok) {
          const errorData = await mpResponse.json()
          console.error('MercadoPago API error:', JSON.stringify(errorData))
          
          if (mpResponse.status === 404) {
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Payment not found in Mercado Pago, skipping processing' 
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            )
          }

          throw new Error(`Failed to fetch payment details: ${mpResponse.status}`)
        }

        const paymentData = await mpResponse.json()
        console.log('Payment details:', JSON.stringify(paymentData))

        // Verificar se o pagamento foi aprovado
        if (paymentData.status === 'approved') {
          // Buscar o pagamento no banco de dados usando external_reference ou payment_id
          const { data: paymentRecords, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('payment_id', paymentData.external_reference || paymentId)
            .order('created_at', { ascending: false })
            .limit(1)

          if (fetchError) {
            console.error('Error fetching payment record:', fetchError)
            throw fetchError
          }

          if (!paymentRecords || paymentRecords.length === 0) {
            console.warn('Payment record not found in database:', paymentId)
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Payment approved but no matching record found in database' 
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            )
          }

          const paymentRecord = paymentRecords[0]

          // Atualizar status do pagamento
          const { error: updateError } = await supabase
            .from('payments')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', paymentData.external_reference || paymentId)

          if (updateError) {
            console.error('Error updating payment status:', updateError)
            throw updateError
          }

          // Criar notificação de pagamento
          const { error: notifyError } = await supabase
            .from('payment_notifications')
            .insert({
              user_id: paymentRecord.user_id,
              payment_id: paymentData.external_reference || paymentId,
              status: 'completed',
              plan_type: paymentRecord.plan_type
            })

          if (notifyError) {
            console.error('Error creating payment notification:', notifyError)
            throw notifyError
          }

          // Liberar acesso ao plano diretamente
          const { error: accessError } = await supabase
            .from('plan_access')
            .insert({
              user_id: paymentRecord.user_id,
              plan_type: paymentRecord.plan_type,
              payment_required: false,
              is_active: true
            })

          if (accessError) {
            console.error('Error granting plan access:', accessError)
            throw accessError
          }

          console.log('Plan access granted successfully')

          return new Response(
            JSON.stringify({ success: true, message: 'Payment processed successfully' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          )
        }

        // Se o pagamento não está aprovado, apenas logamos e retornamos sucesso
        console.log(`Payment ${paymentId} status is ${paymentData.status}, no action needed`)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Payment status is ${paymentData.status}, no action needed` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )

      } catch (error) {
        console.error('Error processing payment:', error)
        if (error instanceof Error && error.message.includes('Failed to fetch payment details')) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Failed to fetch payment details, skipping processing' 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          )
        }
        throw error
      }
    }

    // Se chegou aqui, é uma notificação que não precisamos processar
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification received but no action needed' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
