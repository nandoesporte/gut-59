
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

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Log raw request body for debugging
    const rawBody = await req.text();
    console.log(`[${requestId}] Raw request body:`, rawBody);

    // Parse request body
    let body: RequestBody;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse error:`, parseError);
      throw new Error('Invalid JSON in request body');
    }

    const { userId, planType } = body;
    console.log(`[${requestId}] Processing request:`, { userId, planType });

    // Validate required parameters
    if (!userId) {
      throw new Error('Missing userId parameter');
    }
    if (!planType) {
      throw new Error('Missing planType parameter');
    }
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

    if (userError) {
      console.error(`[${requestId}] Database error checking user:`, userError);
      throw new Error('Error checking user existence');
    }

    if (!user) {
      console.error(`[${requestId}] User not found:`, userId);
      throw new Error('User not found');
    }

    console.log(`[${requestId}] User verified, granting access to plan`);

    // Inserir ou atualizar o acesso ao plano
    const { error: accessError } = await supabaseClient
      .from('plan_access')
      .upsert({
        user_id: userId,
        plan_type: planType,
        is_active: true,
        updated_at: new Date().toISOString()
      });

    if (accessError) {
      console.error(`[${requestId}] Database error granting access:`, accessError);
      throw new Error('Error granting plan access');
    }

    // Criar notificação de pagamento
    const { error: notificationError } = await supabaseClient
      .from('payment_notifications')
      .insert({
        user_id: userId,
        plan_type: planType,
        status: 'completed',
        payment_id: requestId // Usando requestId como identificador único
      });

    if (notificationError) {
      console.error(`[${requestId}] Error creating payment notification:`, notificationError);
      // Não vamos falhar o processo por erro na notificação
    }

    console.log(`[${requestId}] Access granted successfully`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Access granted successfully',
        requestId
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
