
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
const ASAAS_API_URL = 'https://api.asaas.com/v3';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ASAAS_API_KEY) {
      throw new Error('ASAAS_API_KEY not configured');
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    // Check payment status on ASAAS
    const response = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ASAAS API error:', errorData);
      throw new Error(`ASAAS API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Payment status:', data);

    return new Response(
      JSON.stringify({
        status: data.status,
        paid: ['RECEIVED', 'CONFIRMED', 'PAYMENT_CONFIRMED'].includes(data.status),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('Error checking payment:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.details || {},
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
