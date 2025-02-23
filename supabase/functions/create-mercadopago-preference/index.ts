
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Create preference function started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, amount, description, notificationUrl } = await req.json();
    console.log('Received request data:', { userId, amount, description, notificationUrl });

    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mercadopagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const externalReference = JSON.stringify({
      user_id: userId,
      plan_type: description.includes('treino') ? 'workout' : 
                 description.includes('nutricional') ? 'nutrition' : 
                 'rehabilitation'
    });

    console.log('Creating preference with external reference:', externalReference);

    const preference = {
      items: [{
        title: description,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: amount
      }],
      back_urls: {
        success: `${req.headers.get('origin')}/workout`,
        failure: `${req.headers.get('origin')}/workout`,
        pending: `${req.headers.get('origin')}/workout`
      },
      external_reference: externalReference,
      notification_url: notificationUrl,
      auto_return: 'approved'
    };

    console.log('Sending preference to Mercado Pago:', preference);

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadopagoAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mercado Pago API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Mercado Pago API error: ${response.status} ${response.statusText}`);
    }

    const mpResponse = await response.json();
    console.log('Mercado Pago response:', mpResponse);

    // Criar registro do pagamento no banco
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        payment_id: mpResponse.id,
        amount: amount,
        status: 'pending',
        provider: 'mercadopago',
        plan_type: preference.items[0].title.toLowerCase().includes('treino') ? 'workout' : 
                  preference.items[0].title.toLowerCase().includes('nutricional') ? 'nutrition' : 
                  'rehabilitation'
      });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw new Error('Failed to create payment record');
    }

    return new Response(
      JSON.stringify({
        preferenceId: mpResponse.id,
        initPoint: mpResponse.init_point
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating preference:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
