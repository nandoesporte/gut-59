
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Preference } from "https://esm.sh/mercadopago@2.0.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('MercadoPago access token not found');
      return new Response(
        JSON.stringify({ error: 'Missing MercadoPago configuration' }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    // Parse request body
    const requestBody = await req.text();
    console.log('Raw request body:', requestBody);

    if (!requestBody) {
      return new Response(
        JSON.stringify({ error: 'Empty request body' }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    let requestData;
    try {
      requestData = JSON.parse(requestBody);
    } catch (e) {
      console.error('JSON parsing error:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON format' }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const { userId, amount, description } = requestData;
    console.log('Received request data:', { userId, amount, description });

    if (!userId || !amount || !description) {
      const missingFields = [];
      if (!userId) missingFields.push('userId');
      if (!amount) missingFields.push('amount');
      if (!description) missingFields.push('description');
      
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          missingFields 
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Initialize MercadoPago client
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    
    // Create preference data
    const preferenceData = {
      items: [{
        id: '1',
        title: description,
        unit_price: Number(amount),
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
    };

    console.log('Creating MercadoPago preference with data:', preferenceData);

    try {
      const result = await preference.create(preferenceData);
      console.log('MercadoPago preference created:', result);

      if (!result.id || !result.init_point) {
        throw new Error('Invalid response from MercadoPago');
      }

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
    } catch (mercadoError) {
      console.error('MercadoPago API error:', mercadoError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create MercadoPago preference',
          details: mercadoError.message
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
