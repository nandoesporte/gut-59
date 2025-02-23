
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
    console.log('Received webhook notification:', notification)

    // Verificar se é uma notificação válida
    if (!notification.action || !notification.data || !notification.data.id) {
      throw new Error('Invalid notification format')
    }

    // Se for uma atualização de pagamento
    if (notification.action === 'payment.updated' || notification.action === 'payment.created') {
      const paymentId = notification.data.id

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
        throw new Error(`Failed to fetch payment details: ${mpResponse.status}`)
      }

      const paymentData = await mpResponse.json()
      console.log('Payment details:', paymentData)

      // Verificar se o pagamento foi aprovado
      if (paymentData.status === 'approved') {
        // Buscar o pagamento no banco de dados
        const { data: paymentRecord, error: fetchError } = await supabase
          .from('payments')
          .select('*')
          .eq('payment_id', paymentData.external_reference || paymentId)
          .single()

        if (fetchError) {
          console.error('Error fetching payment record:', fetchError)
          throw fetchError
        }

        if (!paymentRecord) {
          throw new Error('Payment record not found')
        }

        // Atualizar status do pagamento
        const { error: updateError } = await supabase
          .from('payments')
          .update({ status: 'completed' })
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

        // Liberar acesso ao plano
        const { error: accessError } = await supabase.functions.invoke(
          'grant-plan-access',
          {
            body: {
              userId: paymentRecord.user_id,
              planType: paymentRecord.plan_type
            }
          }
        )

        if (accessError) {
          console.error('Error granting plan access:', accessError)
          throw accessError
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Payment processed successfully' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    // Se chegou aqui, retorna sucesso mas sem processar
    return new Response(
      JSON.stringify({ success: true, message: 'Notification received but no action needed' }),
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
