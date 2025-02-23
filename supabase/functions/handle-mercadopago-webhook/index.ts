
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

console.log('Edge Function initialized');

const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!mercadopagoAccessToken) {
  console.error('MERCADOPAGO_ACCESS_TOKEN is not set');
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
}

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
  const requestId = crypto.randomUUID();
  
  console.log(`[${requestId}][${requestStartTime}] Request started`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  try {
    if (req.method === 'OPTIONS') {
      console.log(`[${requestId}] Handling OPTIONS request`);
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    if (req.method !== 'POST') {
      console.log(`[${requestId}] Invalid method: ${req.method}`);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.text();
    console.log(`[${requestId}] Raw request body:`, body);

    let webhookData: MercadoPagoWebhook;
    try {
      webhookData = JSON.parse(body);
      console.log(`[${requestId}] Parsed webhook data:`, webhookData);
    } catch (error) {
      console.error(`[${requestId}] Error parsing webhook body:`, error);
      throw new Error('Invalid webhook payload');
    }

    if (webhookData.type === 'payment' && webhookData.action === 'payment.updated') {
      const paymentId = webhookData.data.id;
      console.log(`[${requestId}] Processing payment update for ID: ${paymentId}`);
      
      if (!webhookData.live_mode) {
        console.log(`[${requestId}][TEST] Test webhook received`);
        return new Response(
          JSON.stringify({ received: true, test: true, requestId }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`[${requestId}][PROD] Fetching payment details`);
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mercadopagoAccessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}][PROD] API Error:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const paymentData = await response.json();
      console.log(`[${requestId}][PROD] Payment data:`, {
        id: paymentData.id,
        status: paymentData.status,
        external_reference: paymentData.external_reference
      });

      if (paymentData.status === 'approved' && paymentData.live_mode === true) {
        console.log(`[${requestId}][PROD] Processing approved payment`);
        
        if (!paymentData.external_reference) {
          console.error(`[${requestId}][PROD] Missing external_reference`);
          throw new Error('Missing external_reference');
        }

        let userData;
        try {
          userData = JSON.parse(paymentData.external_reference);
          console.log(`[${requestId}][PROD] User data:`, userData);
        } catch (error) {
          console.error(`[${requestId}][PROD] Invalid external_reference:`, error);
          throw new Error('Invalid external_reference format');
        }

        console.log(`[${requestId}][PROD] Updating payment status`);
        const { error: paymentError } = await supabase
          .from('payments')
          .update({ status: 'completed' })
          .match({ payment_id: paymentId });

        if (paymentError) {
          console.error(`[${requestId}][PROD] Database error:`, paymentError);
          throw paymentError;
        }

        // Dispara um evento em tempo real para notificar o cliente
        await supabase
          .from('payment_notifications')
          .insert({
            user_id: userData.user_id,
            payment_id: paymentId,
            status: 'completed',
            plan_type: userData.plan_type
          });

        console.log(`[${requestId}][PROD] Granting access`);
        const { error: accessError } = await supabase.functions.invoke('grant-plan-access', {
          body: { userId: userData.user_id, planType: userData.plan_type }
        });

        if (accessError) {
          console.error(`[${requestId}][PROD] Access error:`, accessError);
          throw accessError;
        }

        console.log(`[${requestId}][PROD] Payment processed successfully`);
      } else {
        console.log(`[${requestId}][PROD] Payment skipped:`, {
          status: paymentData.status,
          live_mode: paymentData.live_mode
        });
      }
    }

    const requestEndTime = new Date().toISOString();
    console.log(`[${requestId}] Request completed at ${requestEndTime}`);

    return new Response(
      JSON.stringify({ 
        received: true,
        requestId,
        environment: webhookData.live_mode ? 'production' : 'test'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error(`[${requestId}] Error at ${errorTime}:`, {
      message: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({ 
        error: error.message,
        requestId,
        timestamp: errorTime
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
