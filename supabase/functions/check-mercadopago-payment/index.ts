
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const mercadopagoAccessToken = 'APP_USR-3774959119809997-120919-64feef22e75e3a72fa939db6a1bf230d-86104137';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferenceId } = await req.json();

    if (!preferenceId) {
      throw new Error('ID de preferência inválido');
    }

    // Buscar pagamentos associados à preferência
    const response = await fetch(`https://api.mercadopago.com/v1/payments/search?preference_id=${preferenceId}`, {
      headers: {
        'Authorization': `Bearer ${mercadopagoAccessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro MercadoPago:', data);
      throw new Error('Erro ao verificar status do pagamento');
    }

    // Verifica se existe algum pagamento aprovado
    const isPaid = data.results.some(
      (payment: any) => payment.status === 'approved'
    );

    return new Response(
      JSON.stringify({ isPaid }),
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
