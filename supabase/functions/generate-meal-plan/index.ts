
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openai = {
  key: Deno.env.get('OPENAI_API_KEY'),
  url: 'https://api.openai.com/v1/chat/completions',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    
    console.log('Dados recebidos:', {
      userData,
      selectedFoodsCount: selectedFoods.length,
      dietaryPreferences
    });

    if (!openai.key) {
      throw new Error('OpenAI API key não configurada');
    }

    const systemPrompt = `Você é um nutricionista especializado em criar planos alimentares personalizados. 
    Forneça um plano alimentar detalhado no formato JSON que seja compatível com o seguinte tipo:
    {
      dailyPlan: {
        breakfast: { foods: Array<Food>, calories: number, macros: { protein: number, carbs: number, fats: number, fiber: number } },
        morningSnack: { foods: Array<Food>, calories: number, macros: { protein: number, carbs: number, fats: number, fiber: number } },
        lunch: { foods: Array<Food>, calories: number, macros: { protein: number, carbs: number, fats: number, fiber: number } },
        afternoonSnack: { foods: Array<Food>, calories: number, macros: { protein: number, carbs: number, fats: number, fiber: number } },
        dinner: { foods: Array<Food>, calories: number, macros: { protein: number, carbs: number, fats: number, fiber: number } }
      },
      recommendations: {
        preworkout: string,
        postworkout: string,
        general: string,
        timing: string[]
      }
    }`;

    const userPrompt = `Crie um plano alimentar personalizado com base nas seguintes informações:
    
    Objetivo: ${userData.goal}
    Calorias diárias necessárias: ${userData.dailyCalories}
    Gênero: ${userData.gender}
    Peso: ${userData.weight}kg
    Altura: ${userData.height}cm
    Idade: ${userData.age} anos
    Nível de atividade: ${userData.activityLevel}
    
    Alergias: ${dietaryPreferences.allergies?.join(', ') || 'Nenhuma'}
    Restrições alimentares: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
    Horário de treino: ${dietaryPreferences.trainingTime || 'Não especificado'}
    
    Alimentos disponíveis para seleção:
    ${selectedFoods.map(food => 
      `- ${food.name} (Proteína: ${food.protein}g, Carboidratos: ${food.carbs}g, Gorduras: ${food.fats}g)`
    ).join('\n')}
    
    Importante:
    1. Use APENAS os alimentos listados acima
    2. Distribua as ${userData.dailyCalories} calorias entre as 5 refeições
    3. Calcule os macronutrientes para cada refeição
    4. Forneça recomendações específicas considerando o horário de treino
    5. A resposta deve ser um objeto JSON válido`;

    console.log('Chamando OpenAI...');
    
    const aiResponse = await fetch(openai.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openai.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('Erro na resposta da OpenAI:', error);
      throw new Error(`Erro na chamada da OpenAI: ${error}`);
    }

    const aiData = await aiResponse.json();
    if (!aiData.choices?.[0]?.message?.content) {
      throw new Error('Resposta inválida da OpenAI');
    }

    console.log('Resposta da IA recebida, processando...');

    let mealPlan;
    try {
      mealPlan = JSON.parse(aiData.choices[0].message.content);
      
      // Validar estrutura básica do plano
      if (!mealPlan.dailyPlan || !mealPlan.recommendations) {
        throw new Error('Estrutura do plano alimentar inválida');
      }

      // Calcular totais
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

      mealPlan.totalNutrition = {
        calories: Math.round(totalNutrition.calories),
        protein: Math.round(totalNutrition.protein),
        carbs: Math.round(totalNutrition.carbs),
        fats: Math.round(totalNutrition.fats),
        fiber: Math.round(totalNutrition.fiber)
      };

      console.log('Plano alimentar processado com sucesso:', {
        totalCalorias: mealPlan.totalNutrition.calories,
        refeicoes: Object.keys(mealPlan.dailyPlan).length
      });

    } catch (error) {
      console.error('Erro ao processar resposta da IA:', error);
      throw new Error('Formato inválido na resposta da IA');
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
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
