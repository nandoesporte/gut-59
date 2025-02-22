
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

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    // Obter informações do usuário
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      throw new Error('Usuário não encontrado');
    }

    // Criar pagamento no ASAAS
    const paymentData = {
      customer: userId,
      billingType: 'UNDEFINED',
      value: amount,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Vencimento em 24h
      description: description,
      externalReference: userId,
    };

    const asaasResponse = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(paymentData),
    });

    if (!asaasResponse.ok) {
      throw new Error('Erro ao criar pagamento no ASAAS');
    }

    const asaasPayment = await asaasResponse.json();

    // Salvar informações do pagamento
    await supabase
      .from('payments')
      .insert({
        user_id: userId,
        payment_id: asaasPayment.id,
        amount: amount,
        status: asaasPayment.status
      });

    return new Response(
      JSON.stringify({
        id: asaasPayment.id,
        status: asaasPayment.status,
        invoiceUrl: asaasPayment.invoiceUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ error: 'Error creating payment' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
