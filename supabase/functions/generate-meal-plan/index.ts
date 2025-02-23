
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();

    // Validate input data
    if (!userData || !selectedFoods || !dietaryPreferences) {
      throw new Error('Dados incompletos para geração do plano');
    }

    console.log('Buscando prompt ativo mais recente...');
    const { data: promptData, error: promptError } = await supabase
      .from('ai_agent_prompts')
      .select('*')
      .eq('agent_type', 'meal_plan')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (promptError) {
      console.error('Erro ao buscar prompt:', promptError);
      throw new Error('Erro ao buscar prompt: ' + promptError.message);
    }
    
    if (!promptData) {
      console.error('Nenhum prompt ativo encontrado');
      throw new Error('Nenhum prompt ativo encontrado para geração de plano alimentar');
    }

    console.log('Prompt encontrado:', promptData.name);
    const prompt = promptData.prompt;

    // Preparar os dados para o modelo
    const modelInput = {
      userData,
      selectedFoods,
      dietaryPreferences
    };

    console.log('Fazendo chamada para OpenAI...');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: JSON.stringify(modelInput)
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`Erro na API do OpenAI: ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    console.log('Processando resposta da OpenAI...');
    const aiResponse = await response.json();
    let mealPlan;

    try {
      mealPlan = JSON.parse(aiResponse.choices[0].message.content);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw AI response:', aiResponse.choices[0].message.content);
      throw new Error('A resposta da IA não está no formato JSON esperado');
    }

    // Validar estrutura básica do plano
    if (!mealPlan || !mealPlan.dailyPlan) {
      console.error('Invalid meal plan structure:', mealPlan);
      throw new Error('Plano alimentar gerado com estrutura inválida');
    }

    console.log('Analisando plano gerado...');
    const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
      'analyze-meal-plan',
      {
        body: {
          mealPlan,
          userData,
          dietaryPreferences
        }
      }
    );

    if (analysisError) {
      console.error('Error in meal plan analysis:', analysisError);
      throw new Error('Erro na análise do plano alimentar: ' + analysisError.message);
    }

    if (!analysisData?.isApproved) {
      console.error('Meal plan not approved:', analysisData?.analysis);
      throw new Error('O plano gerado não atende aos critérios nutricionais');
    }

    console.log('Plano alimentar gerado e aprovado com sucesso');
    return new Response(JSON.stringify({ mealPlan, analysis: analysisData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-meal-plan:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno ao gerar plano alimentar',
        details: error.stack
      }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
