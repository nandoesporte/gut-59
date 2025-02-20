
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateMealPlan, standardizeUnits } from "./validator.ts";

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
    
    console.log('Iniciando geração do plano alimentar detalhado...', {
      calories: userData.dailyCalories,
      selectedFoodsCount: selectedFoods.length,
      dietaryPreferences
    });

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const systemPrompt = `You are an expert nutritionist AI that creates detailed meal plans. 
    Create a meal plan that:
    1. Uses ONLY the provided foods
    2. Follows the daily calorie target
    3. Distributes meals throughout the day
    4. Considers dietary preferences and restrictions
    5. MUST return a valid JSON object following this exact structure:
    {
      "dailyPlan": {
        "breakfast": {
          "description": string,
          "foods": [{"name": string, "portion": number, "unit": string, "details": string}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        "morningSnack": {...},
        "lunch": {...},
        "afternoonSnack": {...},
        "dinner": {...}
      },
      "totalNutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number,
        "fiber": number
      },
      "recommendations": {
        "general": string,
        "preworkout": string,
        "postworkout": string,
        "timing": string[]
      }
    }`;

    const userPrompt = `Create a meal plan with these parameters:
    User Data:
    - Daily Calories: ${userData.dailyCalories}
    - Weight: ${userData.weight}kg
    - Height: ${userData.height}cm
    - Age: ${userData.age}
    - Gender: ${userData.gender}
    - Activity Level: ${userData.activityLevel}
    - Goal: ${userData.goal}

    Available Foods:
    ${selectedFoods.map(food => 
      `- ${food.name}:
         Calories: ${food.calories}kcal
         Protein: ${food.protein}g
         Carbs: ${food.carbs}g
         Fats: ${food.fats}g
         Portion: ${food.portion}${food.portionUnit}`
    ).join('\n')}

    Dietary Preferences:
    - Allergies: ${dietaryPreferences.allergies?.join(', ') || 'None'}
    - Restrictions: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'None'}
    - Training Time: ${dietaryPreferences.trainingTime || 'Not specified'}

    Remember to:
    1. Use ONLY the listed foods
    2. Stay within ${userData.dailyCalories} daily calories
    3. Distribute meals throughout the day
    4. Consider allergies and restrictions
    5. Return a valid JSON object following the specified structure`;

    console.log('Enviando requisição para OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000
      }),
    });

    const responseText = await response.text();
    console.log('Resposta bruta da OpenAI:', responseText);

    if (!response.ok) {
      throw new Error(`Erro na API da OpenAI: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Erro ao fazer parse da resposta:', error);
      throw new Error('Resposta inválida da OpenAI');
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error('Estrutura da resposta inválida:', data);
      throw new Error('Estrutura da resposta da OpenAI inválida');
    }

    let mealPlan;
    try {
      const content = data.choices[0].message.content;
      console.log('Conteúdo da resposta:', content);

      mealPlan = JSON.parse(content);
      console.log('Plano alimentar parseado com sucesso');
      
      // Padronizar unidades de medida
      Object.values(mealPlan.dailyPlan).forEach((meal: any) => {
        meal.foods.forEach((food: any) => {
          food.unit = standardizeUnits(food.unit);
        });
      });

      // Validar estrutura completa
      mealPlan = validateMealPlan(mealPlan);
      console.log('Plano nutricional validado com sucesso');

    } catch (error) {
      console.error('Erro na validação nutricional:', error);
      throw new Error(`Erro na validação do plano nutricional: ${error.message}`);
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro detalhado:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno',
        details: error.stack || 'No stack trace available'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
