
import { serve } from "https://deno.fresh.dev/std@v1.0.0/server/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface PaymentRequest {
  userId: string;
  amount: number;
  description: string;
}

serve(async (req) => {
  try {
    const { userId, amount, description } = await req.json() as PaymentRequest;

    // Configurar o cliente Mercado Pago
    const mp = new MercadoPagoConfig({
      accessToken: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '',
    });

    // Criar preferência de pagamento
    const preference = {
      items: [{
        title: description,
        unit_price: amount,
        quantity: 1,
      }],
      back_urls: {
        success: `${Deno.env.get('APP_URL')}/menu`,
        failure: `${Deno.env.get('APP_URL')}/menu`,
      },
      auto_return: "approved",
      external_reference: userId,
    };

    const response = await mp.preferences.create(preference);

    // Salvar informações do pagamento no banco de dados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    await supabase
      .from('payments')
      .insert({
        user_id: userId,
        payment_id: response.id,
        amount: amount,
        status: 'pending'
      });

    return new Response(
      JSON.stringify({
        id: response.id,
        init_point: response.init_point,
        status: 'pending'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ error: 'Error creating payment' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
