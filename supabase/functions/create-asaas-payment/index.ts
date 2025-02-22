
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

const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 15000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Tempo limite excedido ao conectar com o serviço de pagamento');
    }
    throw error;
  }
};

const retryFetch = async (url: string, options: RequestInit, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Tentativa ${i + 1} falhou, tentando novamente...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      throw new Error('ASAAS_API_KEY não configurada');
    }

    const asaasBaseUrl = 'https://sandbox.asaas.com/api/v3';

    const paymentData = {
      customer: "cus_000005113263",
      billingType: "BOLETO",
      value: amount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: description,
      externalReference: userId
    };

    console.log('Iniciando criação de pagamento...');

    const paymentResponse = await retryFetch(`${asaasBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(paymentData),
    });

    const responseText = await paymentResponse.text();
    console.log('ASAAS response:', responseText);

    if (!responseText) {
      throw new Error('Resposta vazia do serviço de pagamento');
    }

    const paymentResult = JSON.parse(responseText);

    if (!paymentResponse.ok) {
      throw new Error(`Erro do serviço de pagamento: ${JSON.stringify(paymentResult)}`);
    }

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
