
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
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

    const { userId, amount, description } = await req.json();

    if (!userId || !amount || !description) {
      throw new Error('Missing required parameters');
    }

    // Create payment on ASAAS
    const response = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: userId,
        billingType: 'PIX',
        value: amount,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        description: description,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ASAAS API error:', errorData);
      throw new Error(`ASAAS API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('ASAAS payment created:', data);

    // Return relevant payment information
    return new Response(
      JSON.stringify({
        id: data.id,
        status: data.status,
        invoiceUrl: data.invoiceUrl,
        pixQrCodeUrl: data.pixQrCodeUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('Error creating payment:', error);
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
