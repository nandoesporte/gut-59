
import { serve } from "https://deno.fresh.dev/std@v1.0.0/server/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface StatusRequest {
  paymentId: string;
}

serve(async (req) => {
  try {
    const { paymentId } = await req.json() as StatusRequest;

    const mp = new MercadoPagoConfig({
      accessToken: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '',
    });

    // Verificar status do pagamento no Mercado Pago
    const payment = await mp.payment.get(paymentId);
    
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
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking payment status:', error);
    return new Response(
      JSON.stringify({ error: 'Error checking payment status' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
