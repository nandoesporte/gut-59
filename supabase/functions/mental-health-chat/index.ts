
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userPrompt, userId } = await req.json();
    
    if (!userPrompt) {
      throw new Error('userPrompt é obrigatório');
    }

    console.log('Processando prompt de saúde mental para o usuário:', userId);
    console.log('Prompt do usuário:', userPrompt);

    // Buscar o prompt ativo para saúde mental
    const promptResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_agent_prompts?agent_type=eq.mental_health&is_active=eq.true&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!promptResponse.ok) {
      throw new Error('Erro ao buscar prompt de saúde mental');
    }

    const prompts = await promptResponse.json();
    
    if (!prompts || prompts.length === 0) {
      throw new Error('Nenhum prompt de saúde mental ativo encontrado');
    }

    const systemPrompt = prompts[0].prompt;
    console.log('Usando prompt do sistema:', systemPrompt.substring(0, 100) + '...');

    // Usar a função Llama para gerar a resposta
    const llamaResponse = await fetch(`${SUPABASE_URL}/functions/v1/llama-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        temperature: 0.7
      })
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error('Erro na chamada da função llama-completion:', errorText);
      throw new Error('Erro ao gerar resposta com o modelo Llama');
    }

    const llamaData = await llamaResponse.json();
    const responseText = llamaData.choices[0].message.content;

    console.log('Resposta gerada com sucesso');

    return new Response(JSON.stringify({ response: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido', 
        stack: error instanceof Error ? error.stack : undefined 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
