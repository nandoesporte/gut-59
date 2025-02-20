
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
    
    console.log('Dados recebidos:', JSON.stringify({
      userData: {
        goal: userData.goal,
        calories: userData.dailyCalories,
      },
      selectedFoodsCount: selectedFoods.length,
      dietaryPreferences: {
        hasAllergies: dietaryPreferences.hasAllergies,
        trainingTime: dietaryPreferences.trainingTime,
      }
    }, null, 2));

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const mealPlanExample = {
      dailyPlan: {
        breakfast: {
          foods: selectedFoods.slice(0, 2).map(food => ({
            name: food.name,
            portion: 100,
            portionUnit: 'g'
          })),
          calories: 400,
          macros: { protein: 20, carbs: 40, fats: 15, fiber: 5 }
        },
        morningSnack: {
          foods: selectedFoods.slice(2, 3).map(food => ({
            name: food.name,
            portion: 100,
            portionUnit: 'g'
          })),
          calories: 200,
          macros: { protein: 10, carbs: 25, fats: 8, fiber: 3 }
        },
        lunch: {
          foods: selectedFoods.slice(3, 5).map(food => ({
            name: food.name,
            portion: 100,
            portionUnit: 'g'
          })),
          calories: 600,
          macros: { protein: 35, carbs: 65, fats: 20, fiber: 8 }
        },
        afternoonSnack: {
          foods: selectedFoods.slice(5, 6).map(food => ({
            name: food.name,
            portion: 100,
            portionUnit: 'g'
          })),
          calories: 200,
          macros: { protein: 10, carbs: 25, fats: 8, fiber: 3 }
        },
        dinner: {
          foods: selectedFoods.slice(6, 8).map(food => ({
            name: food.name,
            portion: 100,
            portionUnit: 'g'
          })),
          calories: 500,
          macros: { protein: 30, carbs: 50, fats: 17, fiber: 6 }
        }
      },
      recommendations: {
        preworkout: "Consuma sua refeição 2 horas antes do treino",
        postworkout: "Faça sua refeição até 1 hora após o treino",
        general: "Mantenha-se hidratado e siga os horários das refeições",
        timing: ["Café da manhã: 7h", "Lanche: 10h", "Almoço: 13h", "Lanche: 16h", "Jantar: 19h"]
      },
      totalNutrition: {
        calories: 1900,
        protein: 105,
        carbs: 205,
        fats: 68,
        fiber: 25
      }
    };

    console.log('Plano alimentar gerado');
    
    return new Response(JSON.stringify(mealPlanExample), {
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
