
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const webhookSecret = 'f858499661ec1575048a990931695644ad65c0cab9071aa210ffd046d7fe7820';

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Função para verificar a assinatura do webhook
async function verifyWebhookSignature(signature: string, data: string) {
  const encoder = new TextEncoder();
  const key = encoder.encode(webhookSecret);
  const message = encoder.encode(data);
  
  const hmac = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  
  const expectedSignature = await crypto.subtle.sign(
    "HMAC",
    hmac,
    message
  );
  
  const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignatureHex;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('x-signature') || '';
    const body = await req.text(); // Get raw body as text
    
    // Verificar a assinatura
    const isValid = await verifyWebhookSignature(signature, body);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { type, data } = JSON.parse(body);
    console.log('Webhook received:', { type, data });

    if (type === 'payment' && data.id) {
      // Fetch payment details from Mercado Pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: {
          'Authorization': `Bearer ${mercadopagoAccessToken}`,
        },
      });

      const paymentData = await response.json();
      console.log('Payment data:', paymentData);

      if (paymentData.status === 'approved') {
        const externalReference = paymentData.external_reference;
        const { user_id, plan_type } = JSON.parse(externalReference);

        // Update payment status in database
        const { error: paymentError } = await supabase
          .from('payments')
          .update({ status: 'completed' })
          .match({ payment_id: data.id });

        if (paymentError) {
          throw paymentError;
        }

        // Grant plan access
        const { error: accessError } = await supabase.functions.invoke('grant-plan-access', {
          body: { userId: user_id, planType: plan_type }
        });

        if (accessError) {
          throw accessError;
        }

        console.log('Payment processed successfully');
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
