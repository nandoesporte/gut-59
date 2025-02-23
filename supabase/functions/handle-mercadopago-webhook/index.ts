
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
  const requestStartTime = new Date().toISOString();
  console.log(`[${requestStartTime}] Webhook request started`);

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  if (req.method !== 'POST') {
    console.log(`Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('Request details:', {
      timestamp: requestStartTime,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url
    });

    const body = await req.text();
    console.log('Raw webhook payload:', body);

    const webhookData = JSON.parse(body) as MercadoPagoWebhook;
    console.log('Parsed webhook data:', {
      ...webhookData,
      timestamp: requestStartTime,
      environment: webhookData.live_mode ? 'production' : 'test'
    });

    if (webhookData.type === 'payment' && webhookData.action === 'payment.updated') {
      const paymentId = webhookData.data.id;
      
      // Para webhooks de teste, retornamos sucesso imediatamente
      if (!webhookData.live_mode) {
        console.log('[TEST] Test webhook detected, returning success');
        return new Response(
          JSON.stringify({ received: true, test: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log('[PROD] Fetching payment details from Mercado Pago API');
      console.log('[PROD] Payment ID:', paymentId);
      
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mercadopagoAccessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PROD] Failed to fetch payment details:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });
        throw new Error(`Failed to fetch payment details: ${response.status} ${response.statusText}`);
      }

      const paymentData = await response.json();
      console.log('[PROD] Payment data received:', {
        id: paymentData.id,
        status: paymentData.status,
        live_mode: paymentData.live_mode,
        external_reference: paymentData.external_reference,
        timestamp: new Date().toISOString()
      });

      if (paymentData.status === 'approved' && paymentData.live_mode === true) {
        console.log('[PROD] Processing approved production payment');

        if (!paymentData.external_reference) {
          console.error('[PROD] Missing external_reference in production payment');
          throw new Error('Missing external_reference in production payment');
        }

        let userData;
        try {
          userData = JSON.parse(paymentData.external_reference);
          console.log('[PROD] Parsed user data:', userData);
        } catch (error) {
          console.error('[PROD] Error parsing external_reference:', error);
          throw new Error('Invalid external_reference format');
        }

        console.log('[PROD] Updating payment status in database');
        const { error: paymentError } = await supabase
          .from('payments')
          .update({ status: 'completed' })
          .match({ payment_id: paymentId });

        if (paymentError) {
          console.error('[PROD] Error updating payment status:', paymentError);
          throw paymentError;
        }

        console.log('[PROD] Granting plan access');
        const { error: accessError } = await supabase.functions.invoke('grant-plan-access', {
          body: { userId: userData.user_id, planType: userData.plan_type }
        });

        if (accessError) {
          console.error('[PROD] Error granting plan access:', accessError);
          throw accessError;
        }

        console.log('[PROD] Payment processed successfully');
      } else {
        console.log('[PROD] Payment skipped:', {
          status: paymentData.status,
          live_mode: paymentData.live_mode,
          timestamp: new Date().toISOString()
        });
      }
    }

    const requestEndTime = new Date().toISOString();
    console.log(`[${requestEndTime}] Webhook request completed successfully`);

    return new Response(
      JSON.stringify({ 
        received: true,
        environment: webhookData.live_mode ? 'production' : 'test',
        processedAt: requestEndTime
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error(`[${errorTime}] Webhook error:`, {
      error: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: errorTime,
        note: 'Webhook processed with error but returned 200 to prevent retries'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
