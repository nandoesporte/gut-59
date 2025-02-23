
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
    console.log('Request payload:', { userId, amount, description, notificationUrl });

    if (!userId || !amount || !description) {
      throw new Error('Missing required fields');
    }

    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mercadopagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const planType = description.toLowerCase().includes('treino') ? 'workout' : 
                    description.toLowerCase().includes('nutricional') ? 'nutrition' : 
                    'rehabilitation';

    console.log('Plan type determined:', planType);

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
      external_reference: JSON.stringify({
        user_id: userId,
        plan_type: planType
      }),
      notification_url: notificationUrl,
      auto_return: 'approved'
    };

    console.log('Creating MercadoPago preference...');

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadopagoAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('MercadoPago API error:', {
        status: mpResponse.status,
        statusText: mpResponse.statusText,
        body: errorText
      });
      throw new Error(`MercadoPago API error: ${mpResponse.status} ${mpResponse.statusText}`);
    }

    const mpData = await mpResponse.json();
    console.log('MercadoPago preference created:', mpData);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    console.log('Creating payment record in database...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const paymentData = {
      user_id: userId,
      payment_id: mpData.id,
      amount: amount,
      status: 'pending',
      plan_type: planType
    };

    console.log('Payment data to insert:', paymentData);

    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('Database error creating payment record:', paymentError);
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    console.log('Payment record created successfully:', paymentRecord);

    return new Response(
      JSON.stringify({
        preferenceId: mpData.id,
        initPoint: mpData.init_point
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
