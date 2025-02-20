
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
    console.log('Dados recebidos:', { userData, selectedFoods: selectedFoods.length });

    // Montar resposta estática para depuração
    const mealPlan = {
      dailyPlan: {
        breakfast: {
          description: "Café da manhã nutritivo e equilibrado",
          foods: selectedFoods.slice(0, 2).map(food => ({
            name: food.name,
            portion: food.portion,
            unit: food.portionUnit,
            details: "Consumir pela manhã"
          })),
          calories: 400,
          macros: { protein: 20, carbs: 40, fats: 15, fiber: 5 }
        },
        morningSnack: {
          description: "Lanche da manhã leve",
          foods: selectedFoods.slice(2, 3).map(food => ({
            name: food.name,
            portion: food.portion,
            unit: food.portionUnit,
            details: "Consumir entre as refeições principais"
          })),
          calories: 200,
          macros: { protein: 10, carbs: 25, fats: 8, fiber: 3 }
        },
        lunch: {
          description: "Almoço balanceado",
          foods: selectedFoods.slice(3, 5).map(food => ({
            name: food.name,
            portion: food.portion,
            unit: food.portionUnit,
            details: "Refeição principal do dia"
          })),
          calories: 600,
          macros: { protein: 30, carbs: 60, fats: 20, fiber: 8 }
        },
        afternoonSnack: {
          description: "Lanche da tarde energético",
          foods: selectedFoods.slice(5, 6).map(food => ({
            name: food.name,
            portion: food.portion,
            unit: food.portionUnit,
            details: "Ideal para manter a energia"
          })),
          calories: 200,
          macros: { protein: 10, carbs: 25, fats: 8, fiber: 3 }
        },
        dinner: {
          description: "Jantar leve e nutritivo",
          foods: selectedFoods.slice(6, 8).map(food => ({
            name: food.name,
            portion: food.portion,
            unit: food.portionUnit,
            details: "Última refeição do dia"
          })),
          calories: 500,
          macros: { protein: 25, carbs: 45, fats: 18, fiber: 6 }
        }
      },
      totalNutrition: {
        calories: userData.dailyCalories,
        protein: 95,
        carbs: 195,
        fats: 69,
        fiber: 25
      },
      recommendations: {
        general: "Mantenha uma boa hidratação ao longo do dia e procure fazer as refeições em horários regulares.",
        timing: [
          "Café da manhã: 7:00",
          "Lanche da manhã: 10:00",
          "Almoço: 12:30",
          "Lanche da tarde: 15:30",
          "Jantar: 19:00"
        ],
        preparation: [
          "Prepare as refeições com antecedência quando possível",
          "Evite pular refeições",
          "Mastigue bem os alimentos"
        ],
        substitutions: [
          "Em caso de necessidade, substitua alimentos por outros do mesmo grupo alimentar",
          "Mantenha as proporções de macronutrientes ao fazer substituições"
        ]
      }
    };

    // Processar horários de treino
    if (dietaryPreferences.trainingTime) {
      const trainingTime = new Date(`1970-01-01T${dietaryPreferences.trainingTime}`);
      const hour = trainingTime.getHours();
      
      mealPlan.recommendations.timing = [
        "Café da manhã: 7:00",
        "Lanche da manhã: 10:00",
        "Almoço: 12:00",
        `Pré-treino: ${hour - 1}:00`,
        `Pós-treino: ${hour + 1}:00`,
        "Jantar: 20:00"
      ];
    }

    console.log('Plano alimentar gerado com sucesso');

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
