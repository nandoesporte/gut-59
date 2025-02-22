
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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

    // Usar ambiente sandbox do ASAAS
    const asaasBaseUrl = 'https://sandbox.asaas.com/api/v3';

    // Gerar um identificador único para o cliente usando timestamp
    const uniqueId = `${userId}_${Date.now()}`;
    
    // Criar cliente no ASAAS
    const customerResponse = await fetch(`${asaasBaseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify({
        name: `Cliente ${uniqueId}`,
        externalReference: uniqueId,
        email: `cliente_${uniqueId}@email.com`,
        cpfCnpj: '24971563792',
        postalCode: '01001001',
        addressNumber: '123',
        phone: '11999999999'
      }),
    });

    if (!customerResponse.ok) {
      const customerError = await customerResponse.json();
      console.error('ASAAS customer creation error:', customerError);
      throw new Error(`Erro ao criar cliente: ${JSON.stringify(customerError)}`);
    }

    const customerData = await customerResponse.json();
    console.log('Customer created successfully:', customerData);

    // Criar pagamento para o cliente
    const paymentData = {
      customer: customerData.id,
      billingType: 'UNDEFINED',
      value: amount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: description,
      externalReference: uniqueId
    };

    console.log('Creating payment with data:', paymentData);

    const paymentResponse = await fetch(`${asaasBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(paymentData),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      console.error('ASAAS payment creation error:', errorData);
      throw new Error(`Erro ao criar pagamento: ${JSON.stringify(errorData)}`);
    }

    const payment = await paymentResponse.json();
    console.log('Payment created successfully:', payment);

    // Salvar o pagamento no banco de dados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        payment_id: payment.id,
        amount: amount,
        status: payment.status
      });

    if (paymentError) {
      console.error('Error saving payment to database:', paymentError);
    }

    // Retornar os dados do pagamento
    return new Response(
      JSON.stringify({
        id: payment.id,
        status: payment.status,
        invoiceUrl: payment.invoiceUrl
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
