
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Preference } from "https://esm.sh/mercadopago@2.0.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Check content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return new Response(
        JSON.stringify({ 
          error: 'Content-Type must be application/json',
          received: contentType 
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Get request body
    const bodyText = await req.text();
    if (!bodyText) {
      return new Response(
        JSON.stringify({ 
          error: 'Empty request body'
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    console.log('Raw request body:', bodyText);

    // Parse JSON
    let requestData;
    try {
      requestData = JSON.parse(bodyText);
    } catch (e) {
      console.error('JSON parsing error:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON format',
          details: e.message,
          receivedBody: bodyText
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    console.log('Parsed request data:', requestData);

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

    const { userId, amount, description } = requestData;
    
    if (!userId || !amount || !description) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          received: requestData
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const preferenceData = {
      items: [
        {
          title: description,
          unit_price: Number(amount),
          quantity: 1,
          currency_id: 'BRL',
        }
      ],
      auto_return: 'approved',
      external_reference: userId
    };

    console.log('Creating preference with data:', preferenceData);

    try {
      const result = await preference.create(preferenceData);
      console.log('MercadoPago response:', result);

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
    } catch (mpError) {
      console.error('MercadoPago error:', mpError);
      return new Response(
        JSON.stringify({
          error: 'MercadoPago error',
          details: mpError.message
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
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
