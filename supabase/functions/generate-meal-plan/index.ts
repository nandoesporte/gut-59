
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    console.log('Received request data:', { userData, selectedFoods, dietaryPreferences });

    // Validate input data
    if (!userData || !selectedFoods || !dietaryPreferences) {
      throw new Error('Dados incompletos recebidos');
    }

    if (selectedFoods.length === 0) {
      throw new Error('Nenhum alimento selecionado');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare system prompt
    const systemPrompt = `Você é um nutricionista profissional criando um plano alimentar personalizado.
    Considere os seguintes parâmetros:
    - Objetivo: ${userData.goal}
    - Calorias Diárias: ${userData.dailyCalories} calorias
    - Nível de Atividade: ${userData.activityLevel}
    - Alergias: ${dietaryPreferences.allergies?.join(', ') || 'Nenhuma'}
    - Restrições Alimentares: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
    - Horário de Treino: ${dietaryPreferences.trainingTime || 'Não especificado'}`;

    // Prepare foods data
    const foodsData = selectedFoods.map(food => ({
      nome: food.name,
      calorias: food.calories,
      proteina: food.protein,
      carboidratos: food.carbs,
      gorduras: food.fats,
      porcao: food.portion,
      unidade: food.portionUnit
    }));

    const userPrompt = `Gere um plano alimentar detalhado usando apenas estes alimentos: ${JSON.stringify(foodsData)}
    Formate a resposta como um objeto JSON com a seguinte estrutura:
    {
      "dailyPlan": {
        "breakfast": {
          "foods": [{"name": "Nome do Alimento", "portion": 100, "unit": "g"}],
          "calories": 0,
          "macros": {"protein": 0, "carbs": 0, "fats": 0}
        },
        "morningSnack": {
          "foods": [{"name": "Nome do Alimento", "portion": 100, "unit": "g"}],
          "calories": 0,
          "macros": {"protein": 0, "carbs": 0, "fats": 0}
        },
        "lunch": {
          "foods": [{"name": "Nome do Alimento", "portion": 100, "unit": "g"}],
          "calories": 0,
          "macros": {"protein": 0, "carbs": 0, "fats": 0}
        },
        "afternoonSnack": {
          "foods": [{"name": "Nome do Alimento", "portion": 100, "unit": "g"}],
          "calories": 0,
          "macros": {"protein": 0, "carbs": 0, "fats": 0}
        },
        "dinner": {
          "foods": [{"name": "Nome do Alimento", "portion": 100, "unit": "g"}],
          "calories": 0,
          "macros": {"protein": 0, "carbs": 0, "fats": 0}
        }
      },
      "totalNutrition": {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fats": 0
      },
      "recommendations": {
        "general": "",
        "preworkout": "",
        "postworkout": "",
        "timing": []
      }
    }`;

    // Call OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    console.log('Chamando API do OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4', // Corrigido o nome do modelo
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
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
    console.log('Resposta da OpenAI:', aiResponse);
    
    if (!aiResponse.choices || !aiResponse.choices[0]) {
      throw new Error('Resposta inválida da OpenAI');
    }

    let mealPlan;
    try {
      mealPlan = JSON.parse(aiResponse.choices[0].message.content);
    } catch (e) {
      console.error('Erro ao processar resposta da IA:', e);
      throw new Error('Falha ao processar dados do plano alimentar');
    }

    // Adicionar recomendações de treino se houver horário especificado
    if (dietaryPreferences.trainingTime) {
      const trainingTime = new Date(`1970-01-01T${dietaryPreferences.trainingTime}`);
      const hour = trainingTime.getHours();

      mealPlan.recommendations.timing.push(
        `Refeição pré-treino: ${hour - 2}:00`,
        `Refeição pós-treino: ${hour + 1}:00`
      );
    }

    console.log('Plano alimentar gerado:', mealPlan);

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
