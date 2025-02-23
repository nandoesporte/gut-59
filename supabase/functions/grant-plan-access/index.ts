
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FREE_GENERATIONS = 3;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId, planType } = await req.json()
    
    if (!userId || !planType) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get or create plan generation counts
    const { data: countData, error: countError } = await supabaseClient
      .from('plan_generation_counts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (countError && countError.code !== 'PGRST116') {
      throw countError;
    }

    // If no record exists, create one
    if (!countData) {
      const { error: insertError } = await supabaseClient
        .from('plan_generation_counts')
        .insert([{ user_id: userId }]);

      if (insertError) throw insertError;
    }

    // Get the current count for the specific plan type
    const currentCount = countData ? countData[`${planType}_count`] : 0;

    // Check if user has paid and update their payment requirement status
    const { data: planAccess, error: planAccessError } = await supabaseClient
      .from('plan_access')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_type', planType)
      .single();

    if (planAccessError && planAccessError.code !== 'PGRST116') {
      throw planAccessError;
    }

    // If user has paid and still has generations left
    if (planAccess && !planAccess.payment_required && currentCount < MAX_FREE_GENERATIONS) {
      // Increment the count
      const { error: updateCountError } = await supabaseClient
        .from('plan_generation_counts')
        .upsert({
          user_id: userId,
          [`${planType}_count`]: currentCount + 1,
          updated_at: new Date().toISOString()
        });

      if (updateCountError) throw updateCountError;

      // If this was the last free generation, reactivate payment requirement
      if (currentCount + 1 >= MAX_FREE_GENERATIONS) {
        const { error: updateAccessError } = await supabaseClient
          .from('plan_access')
          .update({ payment_required: true })
          .eq('user_id', userId)
          .eq('plan_type', planType);

        if (updateAccessError) throw updateAccessError;

        return new Response(
          JSON.stringify({ 
            success: true, 
            requiresPayment: true,
            message: "Last free generation used. Payment will be required for future generations."
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          requiresPayment: false,
          remainingGenerations: MAX_FREE_GENERATIONS - (currentCount + 1)
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Insert or update plan access record
    const { error: upsertError } = await supabaseClient
      .from('plan_access')
      .upsert({
        user_id: userId,
        plan_type: planType,
        payment_required: true,
        is_active: true
      });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ success: true, requiresPayment: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
