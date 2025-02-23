
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { userId, planType } = await req.json();
    console.log(`[${requestId}] Granting access for user ${userId} to plan ${planType}`);

    if (!userId || !planType) {
      throw new Error('Missing required parameters');
    }

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error(`[${requestId}] User not found:`, userError);
      throw new Error('User not found');
    }

    // Inserir ou atualizar o acesso ao plano
    const { error: accessError } = await supabaseClient
      .from('plan_access')
      .upsert({
        user_id: userId,
        plan_type: planType,
        status: 'active',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,plan_type'
      });

    if (accessError) {
      console.error(`[${requestId}] Error granting access:`, accessError);
      throw accessError;
    }

    console.log(`[${requestId}] Access granted successfully`);
    
    return new Response(
      JSON.stringify({ success: true, message: 'Access granted successfully' }),
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
