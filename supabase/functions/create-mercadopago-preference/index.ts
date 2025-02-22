
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Preference } from "https://esm.sh/mercadopago@2.0.6";

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
    const { userId, amount, description } = await req.json();

    if (!userId || !amount || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize MercadoPago client
    const client = new MercadoPagoConfig({ 
      accessToken: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? '' 
    });

    console.log('Creating preference for user:', userId);

    const preference = new Preference(client);
    const result = await preference.create({
      items: [{
        title: description,
        unit_price: amount,
        quantity: 1,
        currency_id: 'BRL'
      }],
      back_urls: {
        success: `${req.headers.get('origin')}/menu`,
        failure: `${req.headers.get('origin')}/menu`,
        pending: `${req.headers.get('origin')}/menu`
      },
      auto_return: 'approved',
      external_reference: userId,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
    });

    console.log('Preference created:', result);

    return new Response(
      JSON.stringify({ preferenceId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating preference:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create payment preference' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
