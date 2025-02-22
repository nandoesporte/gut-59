
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

const validateAsaasResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    console.error('Invalid content type from ASAAS:', contentType);
    console.error('Response body:', text);
    throw new Error('Resposta inválida do serviço de pagamento');
  }

  const data = await response.json();
  console.log('ASAAS response:', data);

  if (!response.ok) {
    console.error('ASAAS error response:', data);
    throw new Error(`Erro do ASAAS: ${JSON.stringify(data)}`);
  }

  return data;
};

const createOrGetCustomer = async (userId: string, asaasApiKey: string) => {
  const asaasBaseUrl = 'https://www.asaas.com/api/v3';
  
  // First, try to get customer by externalReference
  const searchResponse = await fetch(
    `${asaasBaseUrl}/customers?externalReference=${userId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
    }
  );

  const searchResult = await validateAsaasResponse(searchResponse);
  
  if (searchResult.data && searchResult.data.length > 0) {
    console.log('Customer found:', searchResult.data[0]);
    return searchResult.data[0].id;
  }

  // If customer not found, create a new one
  console.log('Creating new customer for user:', userId);
  
  const customerData = {
    name: `Cliente ${userId.slice(0, 8)}`,
    externalReference: userId,
    email: `cliente.${userId.slice(0, 8)}@example.com`,
    phone: "11999999999",
    cpfCnpj: "01234567890"
  };

  const createResponse = await fetch(`${asaasBaseUrl}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': asaasApiKey,
    },
    body: JSON.stringify(customerData),
  });

  const newCustomer = await validateAsaasResponse(createResponse);
  console.log('New customer created:', newCustomer);
  return newCustomer.id;
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
      console.error('ASAAS_API_KEY not found');
      throw new Error('ASAAS_API_KEY não configurada');
    }

    // Get or create customer
    const customerId = await createOrGetCustomer(userId, asaasApiKey);

    const asaasBaseUrl = 'https://www.asaas.com/api/v3';
    const paymentData = {
      customer: customerId,
      billingType: "BOLETO",
      value: amount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: description,
      externalReference: userId
    };

    console.log('Creating payment with ASAAS:', {
      url: `${asaasBaseUrl}/payments`,
      data: paymentData,
      keyLength: asaasApiKey.length
    });

    const paymentResponse = await fetch(`${asaasBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(paymentData),
    });

    const paymentResult = await validateAsaasResponse(paymentResponse);

    // Verificar campos obrigatórios
    if (!paymentResult.id || !paymentResult.status) {
      console.error('Invalid payment result structure:', paymentResult);
      throw new Error('Estrutura de resposta inválida do ASAAS');
    }

    // Salvar o pagamento no banco
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
