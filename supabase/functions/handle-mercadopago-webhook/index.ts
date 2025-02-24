
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
    const rawBody = await req.text()
    console.log('Raw webhook body:', rawBody)
    
    let notification
    try {
      notification = JSON.parse(rawBody)
    } catch (e) {
      console.error('Failed to parse webhook payload:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    console.log('Parsed webhook notification:', JSON.stringify(notification))

    // Validar a estrutura da notificação
    if ((!notification?.type && !notification?.topic) || 
        (!notification?.data?.id && !notification?.resource)) {
      console.error('Invalid notification format:', JSON.stringify(notification))
      return new Response(
        JSON.stringify({ error: 'Invalid notification format' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Tratar notificações de pagamento
    if (notification.type === 'payment' || notification.topic === 'merchant_order') {
      let paymentId: string
      let resourceUrl: string

      if (notification.type === 'payment') {
        paymentId = notification.data.id.toString()
        resourceUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`
      } else {
        // Para merchant_order, extrair o ID da URL do recurso
        const orderId = notification.resource.split('/').pop()
        resourceUrl = `https://api.mercadopago.com/merchant_orders/${orderId}`
      }

      console.log('Processing notification with resource URL:', resourceUrl)

      try {
        // Buscar detalhes do recurso na API do Mercado Pago
        const mpResponse = await fetch(resourceUrl, {
          headers: {
            'Authorization': `Bearer ${mercadopagoToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!mpResponse.ok) {
          const errorData = await mpResponse.json()
          console.error('MercadoPago API error:', JSON.stringify(errorData))
          
          if (mpResponse.status === 404) {
            return new Response(
              JSON.stringify({ message: 'Resource not found, will retry' }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            )
          }

          throw new Error(`Failed to fetch resource details: ${mpResponse.status}`)
        }

        let resourceData = await mpResponse.json()
        console.log('Resource data from MercadoPago:', JSON.stringify(resourceData))

        // Se for merchant_order, precisamos buscar o pagamento associado
        if (notification.topic === 'merchant_order') {
          const payments = resourceData.payments || []
          // Procurar por um pagamento aprovado
          const approvedPayment = payments.find(p => p.status === 'approved')
          
          if (!approvedPayment) {
            console.log('No approved payment found in merchant order')
            return new Response(
              JSON.stringify({ message: 'No approved payment found' }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            )
          }

          paymentId = approvedPayment.id.toString()
          // Buscar detalhes do pagamento
          const paymentResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
              headers: {
                'Authorization': `Bearer ${mercadopagoToken}`,
                'Content-Type': 'application/json'
              }
            }
          )

          if (!paymentResponse.ok) {
            throw new Error(`Failed to fetch payment details: ${paymentResponse.status}`)
          }

          resourceData = await paymentResponse.json()
          console.log('Payment data:', JSON.stringify(resourceData))
        }

        // Se o pagamento foi aprovado
        if (resourceData.status === 'approved') {
          const externalReference = resourceData.external_reference
          console.log('Looking for payment with external reference:', externalReference)

          // Buscar pagamento no nosso banco
          const { data: paymentRecord, error: queryError } = await supabase
            .from('payments')
            .select('*')
            .eq('payment_id', externalReference)
            .maybeSingle()

          if (queryError) {
            console.error('Error querying payment:', queryError)
            throw queryError
          }

          if (!paymentRecord) {
            console.log('No payment record found for reference:', externalReference)
            return new Response(
              JSON.stringify({ message: 'Payment record not found' }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            )
          }

          // Verificar se o pagamento já não está marcado como completado
          if (paymentRecord.status === 'completed') {
            console.log('Payment already marked as completed')
            return new Response(
              JSON.stringify({ message: 'Payment already processed' }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            )
          }

          // Atualizar status do pagamento
          const { error: updateError } = await supabase
            .from('payments')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', externalReference)

          if (updateError) {
            console.error('Error updating payment:', updateError)
            throw updateError
          }

          // Criar notificação de pagamento
          const { error: notifyError } = await supabase
            .from('payment_notifications')
            .insert({
              user_id: paymentRecord.user_id,
              payment_id: externalReference,
              status: 'completed',
              plan_type: paymentRecord.plan_type
            })

          if (notifyError) {
            console.error('Error creating notification:', notifyError)
            throw notifyError
          }

          // Verificar se já existe acesso ao plano
          const { data: existingAccess, error: accessCheckError } = await supabase
            .from('plan_access')
            .select('*')
            .eq('user_id', paymentRecord.user_id)
            .eq('plan_type', paymentRecord.plan_type)
            .eq('is_active', true)
            .maybeSingle()

          if (accessCheckError) {
            console.error('Error checking plan access:', accessCheckError)
            throw accessCheckError
          }

          // Se não existe acesso ativo, criar novo
          if (!existingAccess) {
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
          }

          console.log('Payment processed successfully')
          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'Payment processed successfully',
              payment_id: externalReference
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          )
        }

        // Se pagamento não está aprovado, apenas logamos
        console.log(`Payment status is ${resourceData.status}`)
        return new Response(
          JSON.stringify({ 
            message: `Payment status is ${resourceData.status}`,
            payment_id: paymentId 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )

      } catch (error) {
        console.error('Error processing payment:', error)
        return new Response(
          JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            resource: resourceUrl
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }
    }

    // Para outros tipos de notificação, apenas confirmamos o recebimento
    return new Response(
      JSON.stringify({ 
        message: 'Notification received',
        type: notification.type || notification.topic
      }),
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
