
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Preference } from "https://esm.sh/mercadopago@2.0.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Validate request method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed',
        allowedMethods: ['POST'] 
      }),
      { 
        status: 405,
        headers: corsHeaders
      }
    );
  }

  try {
    // Validate request has a body
    if (!req.body) {
      return new Response(
        JSON.stringify({ 
          error: 'Request body is required'
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Get and validate content type
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

    // Clone the request and get the body text for logging
    const clonedReq = req.clone();
    const bodyText = await clonedReq.text();
    console.log('Raw request body:', bodyText);

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

    // Parse the original request as JSON
    const requestData = await req.json();
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
    
    if (!userId || amount === undefined || !description) {
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
          id: `plan-${Date.now()}`,
          title: description,
          unit_price: Number(amount),
          quantity: 1,
          currency_id: 'BRL',
        }
      ],
      back_urls: {
        success: "https://seu-site.com/success",
        failure: "https://seu-site.com/failure",
        pending: "https://seu-site.com/pending"
      },
      auto_return: "approved",
      external_reference: userId,
      notification_url: "https://seu-site.com/webhook"
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
