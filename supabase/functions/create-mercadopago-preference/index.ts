
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
    // Parse request body
    const text = await req.text();
    console.log('Raw request body:', text);

    let requestData;
    try {
      requestData = text ? JSON.parse(text) : null;
    } catch (e) {
      console.error('JSON parsing error:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!requestData) {
      return new Response(
        JSON.stringify({ error: 'Request body is empty' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { userId, amount, description } = requestData;
    
    console.log('Parsed request data:', { userId, amount, description });

    if (!userId || !amount || !description) {
      console.error('Missing parameters:', { userId, amount, description });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('MercadoPago access token not found');
      throw new Error('MercadoPago configuration error');
    }

    // Initialize MercadoPago client
    const client = new MercadoPagoConfig({ accessToken });
    console.log('MercadoPago client initialized');

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

    console.log('Creating preference with data:', preferenceData);

    const result = await preference.create(preferenceData);
    console.log('Preference created successfully:', result);

    return new Response(
      JSON.stringify({ 
        preferenceId: result.id,
        initPoint: result.init_point 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });

    return new Response(
      JSON.stringify({ 
        error: 'Failed to create payment preference',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
