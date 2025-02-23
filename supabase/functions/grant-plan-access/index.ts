
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
      .eq('is_active', true)

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
