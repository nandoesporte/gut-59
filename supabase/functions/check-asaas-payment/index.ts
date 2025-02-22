
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    console.log('Checking payment status for:', paymentId);

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) {
      console.error('ASAAS_API_KEY not found');
      throw new Error('ASAAS_API_KEY não configurada');
    }

    // Verificar status do pagamento no ASAAS
    const asaasBaseUrl = 'https://sandbox.asaas.com/api/v3';
    const asaasResponse = await fetch(`${asaasBaseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
    });

    if (!asaasResponse.ok) {
      const errorData = await asaasResponse.json();
      console.error('ASAAS API error:', errorData);
      throw new Error(`Erro ASAAS: ${JSON.stringify(errorData)}`);
    }

    const payment = await asaasResponse.json();
    console.log('Payment status from ASAAS:', payment.status);
    
    // Atualizar status no banco de dados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: payment.status })
      .eq('payment_id', paymentId);

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      throw new Error('Erro ao atualizar status do pagamento');
    }

    return new Response(
      JSON.stringify({ status: payment.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-asaas-payment:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao verificar pagamento',
        details: error
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
