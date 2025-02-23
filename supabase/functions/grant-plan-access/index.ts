
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PlanType = 'nutrition' | 'workout' | 'rehabilitation';

interface RequestBody {
  userId: string;
  planType: PlanType;
}

console.log('Grant Plan Access Function initialized');

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const rawBody = await req.text();
    console.log(`[${requestId}] Raw request body:`, rawBody);

    let body: RequestBody;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse error:`, parseError);
      throw new Error('Invalid JSON in request body');
    }

    const { userId, planType } = body;
    console.log(`[${requestId}] Processing request:`, { userId, planType });

    if (!userId) throw new Error('Missing userId parameter');
    if (!planType) throw new Error('Missing planType parameter');
    if (!['nutrition', 'workout', 'rehabilitation'].includes(planType)) {
      throw new Error('Invalid planType. Must be nutrition, workout, or rehabilitation');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) throw new Error('Error checking user existence');
    if (!user) throw new Error('User not found');

    // Atualizar ou criar contagem de gerações de plano
    const countColumn = `${planType}_count`;
    const { data: countData, error: countError } = await supabaseClient
      .from('plan_generation_counts')
      .upsert({
        user_id: userId,
        [countColumn]: 1
      }, {
        onConflict: 'user_id',
        count: 'exact'
      })
      .select('nutrition_count, workout_count, rehabilitation_count');

    if (countError) throw new Error('Error updating plan generation count');

    // Verificar total de gerações
    const totalGenerations = (countData?.[0]?.nutrition_count || 0) +
                           (countData?.[0]?.workout_count || 0) +
                           (countData?.[0]?.rehabilitation_count || 0);

    console.log(`[${requestId}] Total plan generations:`, totalGenerations);

    // Se atingiu 3 gerações, reativar pagamentos
    if (totalGenerations >= 3) {
      console.log(`[${requestId}] Reactivating payments for user`);
      
      const { error: settingsError } = await supabaseClient
        .from('payment_settings')
        .update({ is_active: true })
        .eq('plan_type', planType);

      if (settingsError) {
        console.error(`[${requestId}] Error reactivating payments:`, settingsError);
      }

      // Resetar contadores
      const { error: resetError } = await supabaseClient
        .from('plan_generation_counts')
        .update({
          nutrition_count: 0,
          workout_count: 0,
          rehabilitation_count: 0
        })
        .eq('user_id', userId);

      if (resetError) {
        console.error(`[${requestId}] Error resetting counters:`, resetError);
      }
    } else {
      // Desativar pagamentos após primeira geração
      console.log(`[${requestId}] Deactivating payments for user`);
      
      const { error: settingsError } = await supabaseClient
        .from('payment_settings')
        .update({ is_active: false })
        .eq('plan_type', planType);

      if (settingsError) {
        console.error(`[${requestId}] Error deactivating payments:`, settingsError);
      }
    }

    // Criar notificação de pagamento
    const { error: notificationError } = await supabaseClient
      .from('payment_notifications')
      .insert({
        user_id: userId,
        plan_type: planType,
        status: 'completed',
        payment_id: requestId
      });

    if (notificationError) {
      console.error(`[${requestId}] Error creating payment notification:`, notificationError);
    }

    console.log(`[${requestId}] Access granted successfully`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Access granted successfully',
        requestId,
        requiresPayment: totalGenerations >= 3
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        requestId 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
