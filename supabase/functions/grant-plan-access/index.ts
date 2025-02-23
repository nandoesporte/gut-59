
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  userId: string
  planType: 'nutrition' | 'workout' | 'rehabilitation'
  disablePayment?: boolean
  incrementCount?: boolean
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

    const { userId, planType, disablePayment, incrementCount } = await req.json() as RequestBody
    console.log('Request received:', { userId, planType, disablePayment, incrementCount })

    // Get current plan access status
    const { data: planAccess } = await supabaseClient
      .from('plan_access')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_type', planType)
      .single()

    console.log('Current plan access:', planAccess)

    // Get current generation count
    const { data: genCount } = await supabaseClient
      .from('plan_generation_counts')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log('Current generation count:', genCount)

    let currentCount = 0;
    const countField = `${planType}_count`;
    if (genCount) {
      currentCount = genCount[countField] || 0;
    }

    console.log('Current count for', planType, ':', currentCount)

    // If incrementCount is true, we're generating a new plan
    if (incrementCount) {
      currentCount += 1;
      console.log('Incrementing count to:', currentCount)

      // Update generation count
      const { error: countError } = await supabaseClient
        .from('plan_generation_counts')
        .upsert({
          user_id: userId,
          [countField]: currentCount,
        })

      if (countError) {
        console.error('Error updating count:', countError)
        throw countError
      }

      // If user has reached max generations, reactivate payment
      if (currentCount >= MAX_FREE_GENERATIONS && !planAccess?.payment_required) {
        console.log('Max generations reached, reactivating payment')
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
            message: "Você atingiu o limite de gerações gratuitas. Um novo pagamento é necessário."
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
    }

    // If disablePayment is set (coming from payment confirmation)
    if (disablePayment) {
      console.log('Disabling payment requirement for user:', userId)
      const { error: updateError } = await supabaseClient
        .from('plan_access')
        .upsert({
          user_id: userId,
          plan_type: planType,
          payment_required: false,
          is_active: true
        })

      if (updateError) throw updateError

      // Reset generation count when payment is confirmed
      const { error: resetError } = await supabaseClient
        .from('plan_generation_counts')
        .upsert({
          user_id: userId,
          [countField]: 0
        })

      if (resetError) throw resetError

      return new Response(
        JSON.stringify({ 
          success: true,
          requiresPayment: false,
          remainingGenerations: MAX_FREE_GENERATIONS
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // For regular checks (not incrementing or disabling)
    if (planAccess?.payment_required) {
      console.log('Payment required for user:', userId)
      return new Response(
        JSON.stringify({ 
          success: true,
          requiresPayment: true,
          message: "É necessário realizar o pagamento para gerar um novo plano."
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    const remainingGenerations = MAX_FREE_GENERATIONS - currentCount;
    console.log('Remaining generations:', remainingGenerations)

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
