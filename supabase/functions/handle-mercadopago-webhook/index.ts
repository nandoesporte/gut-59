
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Garantir que apenas requisições POST são aceitas
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('Received webhook request:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url
    });

    const body = await req.text();
    console.log('Raw webhook body:', body);

    const webhookData = JSON.parse(body) as MercadoPagoWebhook;
    console.log('Parsed webhook data:', webhookData);

    // Verificar se é uma notificação de pagamento
    if (webhookData.type === 'payment' && webhookData.action === 'payment.updated') {
      const paymentId = webhookData.data.id;
      
      // Buscar detalhes do pagamento na API do Mercado Pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mercadopagoAccessToken}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch payment details:', response.statusText);
        throw new Error(`Failed to fetch payment details: ${response.statusText}`);
      }

      const paymentData = await response.json();
      console.log('Payment details:', paymentData);

      if (paymentData.status === 'approved') {
        try {
          const externalReference = paymentData.external_reference;
          if (!externalReference) {
            throw new Error('Missing external_reference in payment data');
          }

          const { user_id, plan_type } = JSON.parse(externalReference);

          // Update payment status in database
          const { error: paymentError } = await supabase
            .from('payments')
            .update({ status: 'completed' })
            .match({ payment_id: paymentId });

          if (paymentError) {
            console.error('Error updating payment status:', paymentError);
            throw paymentError;
          }

          // Grant plan access
          const { error: accessError } = await supabase.functions.invoke('grant-plan-access', {
            body: { userId: user_id, planType: plan_type }
          });

          if (accessError) {
            console.error('Error granting plan access:', accessError);
            throw accessError;
          }

          console.log('Payment processed successfully');
        } catch (error) {
          console.error('Error processing approved payment:', error);
          throw error;
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 200, // Retornamos 200 mesmo em caso de erro para evitar reenvios
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
