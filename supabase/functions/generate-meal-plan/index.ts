
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    console.log('Iniciando processamento dos dados recebidos');

    // Validações iniciais
    if (!userData || !selectedFoods || !dietaryPreferences) {
      throw new Error('Dados incompletos recebidos');
    }

    if (selectedFoods.length === 0) {
      throw new Error('É necessário selecionar pelo menos um alimento');
    }

    // Preparar dados de alimentos de forma mais concisa
    const foodsList = selectedFoods.map(food => 
      `${food.name} (${food.calories}kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`
    ).join(', ');

    const prompt = `Como nutricionista experiente, crie um plano alimentar personalizado para:

Perfil: ${userData.gender}, ${userData.age} anos, ${userData.weight}kg, ${userData.height}cm
Objetivo: ${userData.goal}
Calorias: ${userData.dailyCalories}kcal/dia
Nível de Atividade: ${userData.activityLevel}
${dietaryPreferences.allergies?.length ? `Alergias: ${dietaryPreferences.allergies.join(', ')}` : ''}
${dietaryPreferences.dietaryRestrictions?.length ? `Restrições: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : ''}
${dietaryPreferences.trainingTime ? `Horário de Treino: ${dietaryPreferences.trainingTime}` : ''}

Alimentos disponíveis: ${foodsList}

Gere um plano detalhado no formato JSON com a seguinte estrutura:
{
  "dailyPlan": {
    "breakfast": {
      "description": "Descrição do café da manhã",
      "foods": [{"name": "Nome", "portion": 0, "unit": "g", "details": "Preparo"}],
      "calories": 0,
      "macros": {"protein": 0, "carbs": 0, "fats": 0, "fiber": 0}
    },
    "morningSnack": { /* mesma estrutura */ },
    "lunch": { /* mesma estrutura */ },
    "afternoonSnack": { /* mesma estrutura */ },
    "dinner": { /* mesma estrutura */ }
  },
  "totalNutrition": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fats": 0,
    "fiber": 0
  },
  "recommendations": {
    "general": "",
    "timing": [],
    "preparation": [],
    "substitutions": []
  }
}`;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    console.log('Enviando requisição para OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um nutricionista especializado em criar planos alimentares personalizados. Responda sempre em português do Brasil.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro na resposta da OpenAI:', errorData);
      throw new Error(`Erro na API do OpenAI: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('Resposta da OpenAI recebida');

    if (!aiResponse.choices?.[0]?.message?.content) {
      throw new Error('Resposta inválida da OpenAI');
    }

    let mealPlan;
    try {
      const content = aiResponse.choices[0].message.content.trim();
      mealPlan = JSON.parse(content);
      console.log('Plano alimentar processado com sucesso');
    } catch (e) {
      console.error('Erro ao processar JSON da resposta:', e);
      throw new Error('Formato inválido na resposta da IA');
    }

    // Processar horários de treino
    if (dietaryPreferences.trainingTime) {
      const trainingTime = new Date(`1970-01-01T${dietaryPreferences.trainingTime}`);
      const hour = trainingTime.getHours();
      
      if (!mealPlan.recommendations.timing) {
        mealPlan.recommendations.timing = [];
      }

      mealPlan.recommendations.timing.push(
        `Café da manhã: 7:00`,
        `Lanche da manhã: 10:00`,
        `Almoço: 12:00`,
        `Pré-treino: ${hour - 1}:00`,
        `Pós-treino: ${hour + 1}:00`,
        `Jantar: 20:00`
      );
    }

    console.log('Enviando resposta final');

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na função generate-meal-plan:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno ao gerar plano alimentar'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
