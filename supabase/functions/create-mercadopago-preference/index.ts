
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Preference } from "https://esm.sh/mercadopago@2.0.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  try {
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
    console.log('Processing payment request:', { userId, amount, description });

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
    
    // Get origin URL and ensure it's properly formatted
    const origin = req.headers.get('origin') || 'http://localhost:5173';
    console.log('Origin URL:', origin);

    // Create preference data strictly following MercadoPago's schema
    const preferenceData = {
      items: [
        {
          title: description,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(amount)
        }
      ],
      back_urls: {
        success: `${origin}/menu`,
        failure: `${origin}/menu`,
        pending: `${origin}/menu`
      },
      auto_return: 'approved',
      external_reference: userId
    };

    console.log('Creating MercadoPago preference with data:', preferenceData);

    try {
      const result = await preference.create(preferenceData);
      console.log('MercadoPago API response:', result);

      if (!result.id || !result.init_point) {
        console.error('Invalid MercadoPago response:', result);
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
    console.error('Unhandled error:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
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
