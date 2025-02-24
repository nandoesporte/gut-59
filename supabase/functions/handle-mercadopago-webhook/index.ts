
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
      const paymentId = notification.data.id.toString()
      console.log('Processing payment notification for ID:', paymentId)

      try {
        // Buscar detalhes do pagamento na API do Mercado Pago
        const apiUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`
        console.log('Fetching payment details from:', apiUrl)
        
        const mpResponse = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${mercadopagoToken}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('MercadoPago API response status:', mpResponse.status)

        if (!mpResponse.ok) {
          const errorData = await mpResponse.json()
          console.error('MercadoPago API error details:', JSON.stringify(errorData))
          
          // Se o pagamento não foi encontrado, retornamos 200 mas logamos o erro
          if (mpResponse.status === 404) {
            console.log('Payment not found in MercadoPago, will try again later')
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Payment not found in Mercado Pago, will retry later',
                details: errorData
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
        console.log('Payment details from MercadoPago:', JSON.stringify(paymentData))

        // Verificar se o pagamento foi aprovado
        if (paymentData.status === 'approved') {
          // Buscar o pagamento no banco de dados usando a referência externa
          const { data: paymentRecords, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('payment_id', paymentData.external_reference)
            .order('created_at', { ascending: false })
            .limit(1)

          if (fetchError) {
            console.error('Error fetching payment record:', fetchError)
            throw fetchError
          }

          if (!paymentRecords || paymentRecords.length === 0) {
            console.warn('Payment record not found in database. External reference:', paymentData.external_reference)
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Payment approved but no matching record found in database',
                external_reference: paymentData.external_reference
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200 
              }
            )
          }

          const paymentRecord = paymentRecords[0]
          console.log('Found matching payment record:', JSON.stringify(paymentRecord))

          // Atualizar status do pagamento
          const { error: updateError } = await supabase
            .from('payments')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', paymentData.external_reference)

          if (updateError) {
            console.error('Error updating payment status:', updateError)
            throw updateError
          }

          console.log('Payment status updated successfully')

          // Criar notificação de pagamento
          const { error: notifyError } = await supabase
            .from('payment_notifications')
            .insert({
              user_id: paymentRecord.user_id,
              payment_id: paymentData.external_reference,
              status: 'completed',
              plan_type: paymentRecord.plan_type
            })

          if (notifyError) {
            console.error('Error creating payment notification:', notifyError)
            throw notifyError
          }

          console.log('Payment notification created successfully')

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
            JSON.stringify({ 
              success: true, 
              message: 'Payment processed successfully',
              external_reference: paymentData.external_reference
            }),
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
            message: `Payment status is ${paymentData.status}, no action needed`,
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
            success: false, 
            message: error instanceof Error ? error.message : 'Unknown error',
            payment_id: paymentId
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
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
