
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text();
    console.log('Raw webhook body:', rawBody);

    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (e) {
      console.error('Error parsing webhook data:', e);
      throw new Error('Invalid JSON payload');
    }

    console.log('Parsed webhook data:', webhookData);

    // Mercado Pago sends the data in different formats depending on the notification type
    const action = webhookData.type || webhookData.action;
    const paymentId = webhookData.data?.id || webhookData.id;

    console.log('Extracted payment info:', { action, paymentId });

    if ((action === "payment" || action === "payment.created") && paymentId) {
      // Initialize Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      // Get payment details from our database
      const { data: paymentData, error: paymentError } = await supabaseClient
        .from('payments')
        .select('user_id, plan_type, status')
        .eq('payment_id', paymentId)
        .maybeSingle()

      if (paymentError) {
        console.error('Error fetching payment data:', paymentError);
        throw paymentError;
      }

      if (!paymentData) {
        console.log('No payment data found for payment ID:', paymentId);
        return new Response(
          JSON.stringify({ message: 'Payment not found in database' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Found payment data:', paymentData);

      // Update payment status
      const { error: updateError } = await supabaseClient
        .from('payments')
        .update({ status: 'completed' })
        .eq('payment_id', paymentId);

      if (updateError) {
        console.error('Error updating payment status:', updateError);
        throw updateError;
      }

      console.log('Payment status updated successfully');

      // Reset generation count for this plan type
      const { error: countError } = await supabaseClient
        .from('plan_generation_counts')
        .upsert({
          user_id: paymentData.user_id,
          [`${paymentData.plan_type}_count`]: 0
        });

      if (countError) {
        console.error('Error resetting generation count:', countError);
        throw countError;
      }

      console.log('Generation count reset successfully');

      // Disable payment requirement through plan_access update
      const { error: accessError } = await supabaseClient
        .from('plan_access')
        .upsert({
          user_id: paymentData.user_id,
          plan_type: paymentData.plan_type,
          payment_required: false,
          is_active: true,
          updated_at: new Date().toISOString()
        });

      if (accessError) {
        console.error('Error updating plan access:', accessError);
        throw accessError;
      }

      console.log('Plan access updated successfully');

      // Create notification
      const { error: notificationError } = await supabaseClient
        .from('payment_notifications')
        .insert({
          user_id: paymentData.user_id,
          payment_id: paymentId,
          status: 'completed',
          plan_type: paymentData.plan_type
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        throw notificationError;
      }

      console.log('Payment notification created successfully');

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Payment processed successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    );
  }
})
