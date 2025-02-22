
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
    // Verificar se o corpo da requisição é válido
    const requestText = await req.text();
    console.log('Request body:', requestText);

    if (!requestText) {
      throw new Error('Corpo da requisição vazio');
    }

    let paymentRequest: PaymentRequest;
    try {
      paymentRequest = JSON.parse(requestText);
    } catch (e) {
      throw new Error(`Erro ao fazer parse do JSON da requisição: ${e.message}`);
    }

    const { userId, amount, description } = paymentRequest;
    console.log('Payment request parsed:', { userId, amount, description });

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) {
      console.error('ASAAS_API_KEY not found');
      throw new Error('ASAAS_API_KEY não configurada');
    }

    const asaasBaseUrl = 'https://sandbox.asaas.com/api/v3';

    // Criar pagamento
    const paymentData = {
      customer: "cus_000005113263",
      billingType: "BOLETO",
      value: amount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: description,
      externalReference: userId
    };

    console.log('Payment data being sent to ASAAS:', JSON.stringify(paymentData));

    try {
      const paymentResponse = await fetch(`${asaasBaseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasApiKey,
        },
        body: JSON.stringify(paymentData),
      });

      console.log('ASAAS response status:', paymentResponse.status);
      console.log('ASAAS response headers:', Object.fromEntries(paymentResponse.headers.entries()));

      // Verificar se temos uma resposta válida
      const responseText = await paymentResponse.text();
      console.log('Raw ASAAS response:', responseText);

      if (!responseText) {
        throw new Error('Resposta vazia da API do ASAAS');
      }

      let paymentResult;
      try {
        paymentResult = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Erro ao fazer parse da resposta do ASAAS: ${e.message}`);
      }

      console.log('Parsed ASAAS response:', paymentResult);

      if (!paymentResponse.ok) {
        throw new Error(`Erro do ASAAS: ${JSON.stringify(paymentResult)}`);
      }

      // Verificar se temos os campos necessários
      if (!paymentResult.id || !paymentResult.status) {
        throw new Error(`Resposta inválida do ASAAS: ${JSON.stringify(paymentResult)}`);
      }

      // Salvar o pagamento no banco de dados
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      );

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          payment_id: paymentResult.id,
          amount: amount,
          status: paymentResult.status
        });

      if (paymentError) {
        console.error('Error saving payment to database:', paymentError);
      }

      return new Response(
        JSON.stringify({
          id: paymentResult.id,
          status: paymentResult.status,
          invoiceUrl: paymentResult.invoiceUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      console.error('Error during ASAAS API call:', fetchError);
      throw new Error(`Erro na chamada da API do ASAAS: ${fetchError.message}`);
    }

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
