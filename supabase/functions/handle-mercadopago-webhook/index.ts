
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

    // Handle merchant_order notifications
    if (webhookData.topic === 'merchant_order' && webhookData.resource) {
      try {
        // Extract order ID from resource URL
        const orderId = webhookData.resource.split('/').pop();
        console.log('Extracted order ID:', orderId);

        // Fetch order details from Mercado Pago API
        const orderResponse = await fetch(webhookData.resource, {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`
          }
        });

        if (!orderResponse.ok) {
          throw new Error('Failed to fetch order details');
        }

        const orderData = await orderResponse.json();
        console.log('Order data:', orderData);

        // Get associated payment ID and preference ID from the order
        const paymentId = orderData.payments?.[0]?.id;
        const preferenceId = orderData.preference_id;

        if (!paymentId || !preferenceId) {
          console.log('No payment or preference ID found in order');
          return new Response(
            JSON.stringify({ message: 'No payment or preference ID found in order' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Found payment ID:', paymentId, 'and preference ID:', preferenceId);

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
        );

        // Get payment details from our database using preference_id
        const { data: paymentData, error: paymentError } = await supabaseClient
          .from('payments')
          .select('user_id, plan_type, status')
          .eq('payment_id', preferenceId)
          .maybeSingle();

        if (paymentError) {
          console.error('Error fetching payment data:', paymentError);
          throw paymentError;
        }

        if (!paymentData) {
          console.log('No payment data found for preference ID:', preferenceId);
          return new Response(
            JSON.stringify({ message: 'Payment not found in database' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Found payment data:', paymentData);

        // Check payment status
        const paymentStatus = orderData.payments[0].status;
        if (paymentStatus !== 'approved') {
          console.log('Payment not approved:', paymentStatus);
          return new Response(
            JSON.stringify({ message: 'Payment not approved' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update payment status in our database
        const { error: updateError } = await supabaseClient
          .from('payments')
          .update({ 
            status: 'completed',
            // Store the actual payment ID from Mercado Pago as well
            payment_id: paymentId.toString()
          })
          .eq('payment_id', preferenceId);

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
            payment_id: paymentId.toString(),
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
      } catch (error) {
        console.error('Error processing merchant order:', error);
        throw error;
      }
    }

    // If we reach here, it's a notification we don't handle
    return new Response(
      JSON.stringify({ 
        received: true,
        message: 'Notification received but not processed',
        topic: webhookData.topic
      }),
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
