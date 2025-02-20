
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateMealPlan, standardizeUnits } from "./validator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    
    console.log('Dados recebidos para geração do plano:', {
      goal: userData.goal,
      calories: userData.dailyCalories,
      foodsCount: selectedFoods.length
    });

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key não configurada' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `Como nutricionista, crie um plano alimentar diário usando apenas os alimentos fornecidos.
            Retorne apenas o JSON com a estrutura especificada, sem texto adicional.` 
          },
          { 
            role: 'user', 
            content: `Crie um plano usando:
            - Calorias: ${userData.dailyCalories}kcal
            - Perfil: ${userData.age} anos, ${userData.gender}, ${userData.weight}kg
            - Objetivo: ${userData.goal}
            - Alimentos: ${selectedFoods.map(f => f.name).join(', ')}
            - Restrições: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
            - Alergias: ${dietaryPreferences.allergies?.join(', ') || 'Nenhuma'}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      console.error('Erro OpenAI:', await response.text());
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar plano alimentar' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      return new Response(
        JSON.stringify({ error: 'Resposta inválida do modelo' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const mealPlan = JSON.parse(data.choices[0].message.content);
      const validatedPlan = validateMealPlan(mealPlan);
      
      return new Response(
        JSON.stringify(validatedPlan), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Erro ao processar plano:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar plano alimentar' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Erro na edge function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
