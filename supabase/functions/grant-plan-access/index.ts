
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, planType, incrementCount = false } = await req.json()

    if (!userId || !planType) {
      throw new Error('Missing required parameters')
    }

    // Primeiro verifica se o pagamento está ativo globalmente
    const { data: settings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('is_active')
      .eq('plan_type', planType)
      .maybeSingle()

    if (settingsError) {
      throw settingsError
    }

    // Se pagamento não está ativo globalmente, permite acesso
    if (!settings?.is_active) {
      return new Response(
        JSON.stringify({ requiresPayment: false, message: "Acesso liberado" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Verifica acesso específico do usuário
    const { data: userAccess, error: accessError } = await supabase
      .from('plan_access')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_type', planType)
      .eq('is_active', true)
      .maybeSingle()

    if (accessError) {
      throw accessError
    }

    // Se usuário tem acesso especial sem necessidade de pagamento
    if (userAccess && !userAccess.payment_required) {
      return new Response(
        JSON.stringify({ requiresPayment: false, message: "Acesso liberado" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Verifica contagem de gerações
    const { data: counts, error: countError } = await supabase
      .from('plan_generation_counts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (countError) {
      throw countError
    }

    const countField = `${planType}_count`
    const currentCount = counts ? counts[countField] || 0 : 0

    if (incrementCount) {
      // Incrementa a contagem se necessário
      if (counts) {
        await supabase
          .from('plan_generation_counts')
          .update({ [countField]: currentCount + 1, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
      } else {
        await supabase
          .from('plan_generation_counts')
          .insert({
            user_id: userId,
            [countField]: 1
          })
      }
    }

    // Verifica se já atingiu o limite de gerações gratuitas
    const maxFreeGenerations = 3
    if (currentCount >= maxFreeGenerations) {
      return new Response(
        JSON.stringify({
          requiresPayment: true,
          message: `Você atingiu o limite de ${maxFreeGenerations} gerações gratuitas. É necessário realizar o pagamento para continuar.`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Se ainda tem gerações gratuitas disponíveis
    return new Response(
      JSON.stringify({
        requiresPayment: false,
        remainingGenerations: maxFreeGenerations - currentCount,
        message: `Você ainda tem ${maxFreeGenerations - currentCount} gerações gratuitas disponíveis.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
