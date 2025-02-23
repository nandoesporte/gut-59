
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, amount, description, planType } = await req.json();

    if (!userId || !amount || !description) {
      throw new Error('Dados inválidos');
    }

    const webhookUrl = `${req.headers.get('origin')}/functions/handle-mercadopago-webhook`;
    const successUrl = `${req.headers.get('origin')}/menu?payment_status=success`;
    const failureUrl = `${req.headers.get('origin')}/menu`;
    const pendingUrl = `${req.headers.get('origin')}/menu`;

    // Criar preferência no MercadoPago
    const preference = {
      items: [
        {
          title: description,
          unit_price: amount,
          quantity: 1,
        },
      ],
      external_reference: JSON.stringify({
        user_id: userId,
        plan_type: planType
      }),
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      notification_url: webhookUrl,
      auto_return: 'approved',
      binary_mode: true,
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadopagoAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro MercadoPago:', data);
      throw new Error('Erro ao criar preferência de pagamento');
    }

    return new Response(
      JSON.stringify({
        preferenceId: data.id,
        initPoint: data.init_point,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
