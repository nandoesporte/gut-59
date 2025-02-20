
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    console.log('Dados recebidos para geração do plano:', {
      goal: userData.goal,
      calories: userData.dailyCalories,
      foodsCount: selectedFoods.length
    });

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const prompt = `Como um nutricionista especialista, crie um plano alimentar detalhado para uma pessoa com as seguintes características:
    
    Objetivo: ${userData.goal}
    Calorias diárias: ${userData.dailyCalories}
    Gênero: ${userData.gender}
    Peso: ${userData.weight}kg
    Altura: ${userData.height}cm
    Idade: ${userData.age} anos
    Nível de atividade: ${userData.activityLevel}
    Horário de treino: ${dietaryPreferences.trainingTime || 'Não especificado'}
    
    Alimentos disponíveis:
    ${selectedFoods.map(food => 
      `- ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`
    ).join('\n')}
    
    Retorne um plano alimentar APENAS no formato JSON seguindo exatamente esta estrutura:
    {
      "dailyPlan": {
        "breakfast": {
          "foods": [{"name": "string", "portion": number, "portionUnit": "string"}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        "morningSnack": {
          "foods": [{"name": "string", "portion": number, "portionUnit": "string"}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        "lunch": {
          "foods": [{"name": "string", "portion": number, "portionUnit": "string"}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        "afternoonSnack": {
          "foods": [{"name": "string", "portion": number, "portionUnit": "string"}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        "dinner": {
          "foods": [{"name": "string", "portion": number, "portionUnit": "string"}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        }
      },
      "recommendations": {
        "preworkout": "string",
        "postworkout": "string",
        "general": "string",
        "timing": ["string"]
      }
    }`;

    console.log('Chamando OpenAI...');
    
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Você é um nutricionista especializado que gera planos alimentares em formato JSON estruturado.'
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na resposta da OpenAI:', errorText);
      throw new Error('Erro ao gerar plano alimentar');
    }

    const aiData = await aiResponse.json();
    if (!aiData.choices?.[0]?.message?.content) {
      throw new Error('Resposta inválida da OpenAI');
    }

    console.log('Processando resposta da IA...');

    let mealPlan;
    try {
      mealPlan = JSON.parse(aiData.choices[0].message.content);
      
      if (!mealPlan.dailyPlan || !mealPlan.recommendations) {
        throw new Error('Estrutura do plano alimentar inválida');
      }

      const totalNutrition = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0
      };

      Object.values(mealPlan.dailyPlan).forEach((meal: any) => {
        if (meal.calories) totalNutrition.calories += meal.calories;
        if (meal.macros) {
          totalNutrition.protein += meal.macros.protein || 0;
          totalNutrition.carbs += meal.macros.carbs || 0;
          totalNutrition.fats += meal.macros.fats || 0;
          totalNutrition.fiber += meal.macros.fiber || 0;
        }
      });

      mealPlan.totalNutrition = totalNutrition;
      
      console.log('Plano alimentar gerado com sucesso');
      
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
      throw new Error('Erro ao processar plano alimentar');
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
