
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

    // Criar cliente no ASAAS (necessário antes de criar o pagamento)
    const asaasBaseUrl = 'https://sandbox.asaas.com/api/v3';
    
    // Primeiro, criar ou recuperar o cliente
    const customerResponse = await fetch(`${asaasBaseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify({
        name: userId,  // Usando userId como nome temporário
        externalReference: userId,
        email: 'cliente@email.com',  // Email padrão para ambiente de teste
        phone: '4738010919',  // Telefone padrão para ambiente de teste
        mobilePhone: '4799376637',  // Celular padrão para ambiente de teste
        cpfCnpj: '24971563792',  // CPF padrão para ambiente de teste
        postalCode: '01001001',  // CEP padrão para ambiente de teste
        addressNumber: '123'  // Número padrão para ambiente de teste
      }),
    });

    if (!customerResponse.ok) {
      const customerError = await customerResponse.json();
      console.error('ASAAS customer creation error:', customerError);
      // Se o erro for de cliente duplicado, vamos tentar recuperar o ID do cliente
      if (customerError.errors?.[0]?.code === 'invalid_cpfCnpj') {
        console.log('Customer might already exist, proceeding with payment creation...');
      } else {
        throw new Error(`Erro ao criar cliente: ${JSON.stringify(customerError)}`);
      }
    }

    const customerData = await customerResponse.json();
    const customerId = customerData.id || userId;  // Fallback para userId se não conseguir criar cliente

    // Criar pagamento com o customerId
    const paymentData = {
      customer: customerId,
      billingType: 'UNDEFINED',  // Permite múltiplas formas de pagamento
      value: amount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
      description: description,
      externalReference: userId,
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
      throw new Error(`Erro ASAAS: ${JSON.stringify(errorData)}`);
    }

    const payment = await paymentResponse.json();
    console.log('Payment created successfully:', payment);

    // Criar registro na tabela de pagamentos
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
      // Não vamos lançar erro aqui para não impedir o retorno do link de pagamento
    }

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
