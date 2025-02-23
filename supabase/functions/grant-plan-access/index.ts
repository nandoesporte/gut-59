
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

    console.log('Processing request:', { userId, planType, disablePayment })

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

    // Check if plan access already exists
    const { data: existingAccess, error: queryError } = await supabaseClient
      .from('plan_access')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_type', planType)
      .maybeSingle()

    if (queryError) {
      throw queryError
    }

    let result

    if (existingAccess) {
      // Update existing plan access
      console.log('Updating existing plan access:', {
        userId,
        planType,
        disablePayment
      })

      result = await supabaseClient
        .from('plan_access')
        .update({
          payment_required: !disablePayment,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('plan_type', planType)
    } else {
      // Create new plan access entry
      console.log('Creating new plan access:', {
        userId,
        planType,
        disablePayment
      })

      result = await supabaseClient
        .from('plan_access')
        .insert({
          user_id: userId,
          plan_type: planType,
          payment_required: !disablePayment,
          is_active: true
        })
    }

    if (result.error) {
      throw result.error
    }

    return new Response(
      JSON.stringify({ success: true }),
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
