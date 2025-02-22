
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Payment } from 'https://esm.sh/mercadopago@2.0.6';

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
      throw new Error('Preference ID is required');
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MercadoPago configuration error');
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    // Search for payments associated with this preference
    const searchResult = await payment.search({
      options: {
        criteria: "desc",
        limit: 1
      },
      filters: {
        preference_id: preferenceId
      }
    });

    const isPaid = searchResult.results.some(payment => 
      ['approved', 'settled'].includes(payment.status)
    );

    console.log('Payment status check result:', {
      preferenceId,
      searchResult: searchResult.results,
      isPaid
    });

    return new Response(
      JSON.stringify({ isPaid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking payment:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to check payment status',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
