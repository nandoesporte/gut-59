
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

    // Buscar o prompt ativo mais recente para planos alimentares
    const { data: promptData, error: promptError } = await supabase
      .from('ai_agent_prompts')
      .select('*')
      .eq('agent_type', 'meal_plan')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (promptError) throw new Error('Erro ao buscar prompt: ' + promptError.message);
    if (!promptData || promptData.length === 0) throw new Error('Nenhum prompt ativo encontrado');

    const prompt = promptData[0].prompt;

    // Preparar os dados para o modelo
    const modelInput = {
      prompt,
      userData,
      selectedFoods,
      dietaryPreferences
    };

    // Fazer a chamada para a API da OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
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
            content: JSON.stringify({
              userData,
              selectedFoods,
              dietaryPreferences
            })
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error('Erro ao gerar plano alimentar');
    }

    const aiResponse = await response.json();
    let mealPlan;

    try {
      mealPlan = JSON.parse(aiResponse.choices[0].message.content);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw AI response:', aiResponse.choices[0].message.content);
      throw new Error('Erro ao processar resposta da IA');
    }

    // Validar e analisar o plano gerado
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
      throw new Error('Erro na análise do plano alimentar');
    }

    if (!analysisData.isApproved) {
      throw new Error('O plano gerado não atende aos critérios nutricionais');
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
