
import { serve } from "https://deno.fresh.dev/std@v1.0.0/server/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusRequest {
  paymentId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId } = await req.json() as StatusRequest;

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    // Verificar status do pagamento no ASAAS
    const asaasResponse = await fetch(`https://api.asaas.com/v3/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
    });

    if (!asaasResponse.ok) {
      throw new Error('Erro ao verificar pagamento no ASAAS');
    }

    const payment = await asaasResponse.json();
    
    // Atualizar status no banco de dados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    await supabase
      .from('payments')
      .update({ status: payment.status })
      .eq('payment_id', paymentId);

    return new Response(
      JSON.stringify({ status: payment.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking payment status:', error);
    return new Response(
      JSON.stringify({ error: 'Error checking payment status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
