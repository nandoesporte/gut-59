
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
  try {
    // First check if we got a response at all
    if (!response) {
      throw new Error('Resposta nula do serviço ASAAS');
    }

    // Log full response details for debugging
    console.log('ASAAS Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    let data;
    const contentType = response.headers.get('content-type');
    const responseText = await response.text();
    console.log('Raw response text:', responseText);

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error(`Resposta inválida do ASAAS: ${responseText}`);
    }

    console.log('Parsed ASAAS response:', data);

    if (!response.ok) {
      throw new Error(`Erro do ASAAS: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error('Error in validateAsaasResponse:', error);
    throw error;
  }
};

const createOrGetCustomer = async (userId: string, asaasApiKey: string) => {
  const asaasBaseUrl = 'https://sandbox.asaas.com/api/v3';
  
  try {
    // First, try to get customer by externalReference
    console.log('Searching for customer with userId:', userId);
    const searchResponse = await fetch(
      `${asaasBaseUrl}/customers?externalReference=${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasApiKey,
        },
      }
    ).catch(error => {
      console.error('Network error while searching customer:', error);
      throw new Error('Erro de conexão com ASAAS');
    });

    const searchResult = await validateAsaasResponse(searchResponse);
    
    if (searchResult.data && searchResult.data.length > 0) {
      console.log('Customer found:', searchResult.data[0]);
      return searchResult.data[0].id;
    }

    // If customer not found, create a new one
    console.log('No customer found, creating new one for user:', userId);
    
    const customerData = {
      name: `Cliente ${userId.slice(0, 8)}`,
      externalReference: userId,
      email: `cliente.${userId.slice(0, 8)}@example.com`,
      mobilePhone: "11999999999",
      cpfCnpj: "12345678909"
    };

    console.log('Creating customer with data:', customerData);

    const createResponse = await fetch(`${asaasBaseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(customerData),
    }).catch(error => {
      console.error('Network error while creating customer:', error);
      throw new Error('Erro de conexão com ASAAS');
    });

    const newCustomer = await validateAsaasResponse(createResponse);
    console.log('New customer created:', newCustomer);
    return newCustomer.id;
  } catch (error) {
    console.error('Error in createOrGetCustomer:', error);
    throw error;
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
      console.error('ASAAS_API_KEY not found');
      throw new Error('ASAAS_API_KEY não configurada');
    }

    console.log('ASAAS API Key length:', asaasApiKey.length);

    // Get or create customer
    const customerId = await createOrGetCustomer(userId, asaasApiKey);
    console.log('Got customer ID:', customerId);

    const asaasBaseUrl = 'https://sandbox.asaas.com/api/v3';
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
    });

    const paymentResponse = await fetch(`${asaasBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(paymentData),
    }).catch(error => {
      console.error('Network error while creating payment:', error);
      throw new Error('Erro de conexão com ASAAS');
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
