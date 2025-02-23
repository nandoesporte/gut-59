
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type PlanType = 'nutrition' | 'workout' | 'rehabilitation';

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, planType, disablePayment } = await req.json()

    if (!userId || !planType) {
      throw new Error('Missing required fields')
    }

    if (!['nutrition', 'workout', 'rehabilitation'].includes(planType)) {
      throw new Error('Invalid plan type')
    }

    console.log('Processing grant-plan-access request:', { userId, planType, disablePayment })

    // Create Supabase client
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

    // First, deactivate any existing active plan access records
    const { error: deactivateError } = await supabaseClient
      .from('plan_access')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('plan_type', planType)

    if (deactivateError) {
      console.error('Error deactivating existing plans:', deactivateError)
      throw deactivateError
    }

    // Create new plan access entry
    console.log('Creating new plan access record:', {
      userId,
      planType,
      disablePayment
    })

    const { data: newAccess, error: insertError } = await supabaseClient
      .from('plan_access')
      .insert({
        user_id: userId,
        plan_type: planType,
        payment_required: !disablePayment,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Reset plan generation count if disabling payment
    if (disablePayment) {
      const countColumn = `${planType}_count` as keyof { workout_count: number, nutrition_count: number, rehabilitation_count: number }
      
      const { error: resetError } = await supabaseClient
        .from('plan_generation_counts')
        .upsert({
          user_id: userId,
          [countColumn]: 0,
          updated_at: new Date().toISOString()
        })

      if (resetError) {
        console.error('Error resetting plan count:', resetError)
        // Don't throw here, as the main operation succeeded
      }
    }

    console.log('Successfully created new plan access:', newAccess)

    return new Response(
      JSON.stringify({ success: true, data: newAccess }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in grant-plan-access:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
