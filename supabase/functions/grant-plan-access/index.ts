
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  userId: string
  planType: 'nutrition' | 'workout' | 'rehabilitation'
  disablePayment?: boolean
}

const MAX_FREE_GENERATIONS = 3;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, planType, disablePayment } = await req.json() as RequestBody

    // If disablePayment is explicitly set, we're coming from the admin panel
    if (disablePayment !== undefined) {
      console.log('Admin disabling payment for user:', userId)
      const { error: updateError } = await supabaseClient
        .from('plan_access')
        .upsert({
          user_id: userId,
          plan_type: planType,
          payment_required: false,
          is_active: true
        })

      if (updateError) throw updateError
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Check existing plan access and generation count
    const { data: planAccess } = await supabaseClient
      .from('plan_access')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_type', planType)
      .single()

    const { data: genCount } = await supabaseClient
      .from('plan_generation_counts')
      .select('*')
      .eq('user_id', userId)
      .single()

    let currentCount = 0;
    switch (planType) {
      case 'nutrition':
        currentCount = genCount?.nutrition_count || 0;
        break;
      case 'workout':
        currentCount = genCount?.workout_count || 0;
        break;
      case 'rehabilitation':
        currentCount = genCount?.rehabilitation_count || 0;
        break;
    }

    // If user has generated maximum plans, reactivate payment requirement
    if (currentCount >= MAX_FREE_GENERATIONS && !planAccess?.payment_required) {
      console.log(`User ${userId} reached max generations. Reactivating payment.`)
      const { error: reactivateError } = await supabaseClient
        .from('plan_access')
        .upsert({
          user_id: userId,
          plan_type: planType,
          payment_required: true,
          is_active: true
        })

      if (reactivateError) throw reactivateError

      return new Response(
        JSON.stringify({ 
          success: true, 
          requiresPayment: true,
          message: "Você atingiu o limite de gerações gratuitas. Pagamento reativado."
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // If user has paid but hasn't reached max generations, continue allowing access
    if (planAccess && !planAccess.payment_required) {
      const remainingGenerations = MAX_FREE_GENERATIONS - currentCount;
      return new Response(
        JSON.stringify({ 
          success: true, 
          requiresPayment: false,
          remainingGenerations
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Payment is required
    return new Response(
      JSON.stringify({ 
        success: true, 
        requiresPayment: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
