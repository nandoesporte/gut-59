
import { serve } from "https://deno.fresh.dev/std@v1.0.0/server/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  userId: string;
  amount: number;
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, amount, description } = await req.json() as PaymentRequest;
    console.log('Payment request received:', { userId, amount, description });

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) {
      console.error('ASAAS_API_KEY not found');
      throw new Error('ASAAS_API_KEY não configurada');
    }

    // Criar pagamento no ASAAS
    const asaasBaseUrl = 'https://sandbox.asaas.com/api/v3'; // URL do ambiente sandbox
    const paymentData = {
      customer: userId,
      billingType: 'BOLETO', // Definindo tipo de pagamento como boleto
      value: amount,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: description,
      externalReference: userId,
    };

    console.log('Sending request to ASAAS:', paymentData);

    const asaasResponse = await fetch(`${asaasBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(paymentData),
    });

    if (!asaasResponse.ok) {
      const errorData = await asaasResponse.json();
      console.error('ASAAS API error:', errorData);
      throw new Error(`Erro ASAAS: ${JSON.stringify(errorData)}`);
    }

    const asaasPayment = await asaasResponse.json();
    console.log('ASAAS payment created:', asaasPayment);

    // Criar cliente no Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        payment_id: asaasPayment.id,
        amount: amount,
        status: asaasPayment.status
      });

    if (paymentError) {
      console.error('Error saving payment to database:', paymentError);
      throw new Error('Erro ao salvar pagamento no banco de dados');
    }

    return new Response(
      JSON.stringify({
        id: asaasPayment.id,
        status: asaasPayment.status,
        invoiceUrl: asaasPayment.bankSlipUrl || asaasPayment.invoiceUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-asaas-payment:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar pagamento',
        details: error
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
