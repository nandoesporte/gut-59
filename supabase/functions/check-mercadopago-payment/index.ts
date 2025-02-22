
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Payment } from "https://esm.sh/mercadopago@2.0.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferenceId } = await req.json();

    if (!preferenceId) {
      return new Response(
        JSON.stringify({ error: 'Missing preference ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize MercadoPago client
    const client = new MercadoPagoConfig({ 
      accessToken: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? '' 
    });

    console.log('Checking payment status for preference:', preferenceId);

    const payment = new Payment(client);
    const searchResult = await payment.search({
      options: {
        criteria: "desc",
        limit: 1
      },
      filters: {
        preference_id: preferenceId
      }
    });

    console.log('Search result:', searchResult);

    const isPaid = searchResult.results.some(payment => 
      ['approved', 'completed'].includes(payment.status?.toLowerCase() ?? '')
    );

    return new Response(
      JSON.stringify({ isPaid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking payment status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check payment status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
