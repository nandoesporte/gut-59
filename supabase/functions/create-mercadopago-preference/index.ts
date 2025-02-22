
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Preference } from "https://esm.sh/mercadopago@2.0.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Missing MercadoPago configuration');
    }

    const payload = await req.json();
    console.log('Payload recebido:', payload);

    const { userId, amount, description } = payload;
    if (!userId || !amount || !description) {
      throw new Error('Dados inválidos');
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const result = await preference.create({
      items: [
        {
          title: description,
          unit_price: Number(amount),
          quantity: 1,
          currency_id: 'BRL'
        }
      ],
      external_reference: userId,
      auto_return: "approved"
    });

    console.log('Resposta MercadoPago:', result);

    return new Response(
      JSON.stringify({
        preferenceId: result.id,
        initPoint: result.init_point
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error('Erro:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro interno do servidor'
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
