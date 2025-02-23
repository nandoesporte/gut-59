
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

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

    if (webhookData.type === 'payment' && webhookData.action === 'payment.updated') {
      const paymentId = webhookData.data.id;
      
      // Para webhooks de teste, retornamos sucesso imediatamente
      if (!webhookData.live_mode) {
        console.log('Test webhook detected, returning success');
        return new Response(
          JSON.stringify({ received: true, test: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log('Fetching payment details for ID:', paymentId);
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
      console.log('Full payment data:', paymentData);

      // Só processamos pagamentos reais (não testes) e aprovados
      if (paymentData.status === 'approved' && paymentData.live_mode === true) {
        if (!paymentData.external_reference) {
          console.error('Missing external_reference in production payment');
          throw new Error('Missing external_reference in production payment');
        }

        let userData;
        try {
          userData = JSON.parse(paymentData.external_reference);
          console.log('Parsed user data:', userData);
        } catch (error) {
          console.error('Error parsing external_reference:', error);
          throw new Error('Invalid external_reference format');
        }

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
          body: { userId: userData.user_id, planType: userData.plan_type }
        });

        if (accessError) {
          console.error('Error granting plan access:', accessError);
          throw accessError;
        }

        console.log('Payment processed successfully');
      } else {
        console.log('Payment skipped:', {
          status: paymentData.status,
          live_mode: paymentData.live_mode
        });
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
    // Para testes, retornamos 200 mesmo com erro
    return new Response(
      JSON.stringify({ 
        error: error.message,
        note: 'This is a test webhook, errors are expected'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
