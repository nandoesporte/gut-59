
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import { DietaryPreferences, ProtocolFood, MealPlan } from './types.ts'

const MEAL_DISTRIBUTION = {
  breakfast: { percentage: 0.25 },
  morningSnack: { percentage: 0.15 },
  lunch: { percentage: 0.30 },
  afternoonSnack: { percentage: 0.10 },
  dinner: { percentage: 0.20 }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json()
    console.log('Received request:', { userData, selectedFoods, dietaryPreferences })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar alimentos selecionados
    const { data: foodsData, error: foodsError } = await supabaseClient
      .from('protocol_foods')
      .select('*, food_groups!fk_food_group(name)')
      .in('id', selectedFoods)

    if (foodsError) {
      throw new Error(`Error fetching foods: ${foodsError.message}`)
    }

    const foods = foodsData as ProtocolFood[]
    
    // Remover duplicatas
    const uniqueFoods = Array.from(new Map(foods.map(food => [food.id, food])).values());

    // Categorizar alimentos por grupo
    const foodsByGroup = uniqueFoods.reduce((acc, food) => {
      const group = food.food_group_id;
      if (!acc[group]) acc[group] = [];
      acc[group].push(food);
      return acc;
    }, {});

    // Criar plano de refeições
    const mealPlan: MealPlan = {
      dailyPlan: {
        breakfast: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        morningSnack: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        lunch: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        afternoonSnack: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        dinner: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        }
      },
      totalNutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0
      },
      recommendations: {
        preworkout: "",
        postworkout: "",
        general: "",
        timing: [],
        healthCondition: userData.healthCondition
      }
    };

    // Distribuir alimentos por refeição
    Object.entries(MEAL_DISTRIBUTION).forEach(([meal, distribution]) => {
      const mealCalorieTarget = userData.dailyCalories * distribution.percentage;
      let selectedMealFoods = [];

      // Selecionar alimentos apropriados para cada refeição
      if (meal === 'breakfast') {
        selectedMealFoods = foodsByGroup[1] || []; // Grupo café da manhã
      } else if (meal === 'lunch' || meal === 'dinner') {
        selectedMealFoods = foodsByGroup[2] || []; // Grupo almoço/jantar
      } else {
        selectedMealFoods = foodsByGroup[3] || []; // Grupo lanches
      }

      // Limitar a 3 alimentos por refeição
      mealPlan.dailyPlan[meal].foods = selectedMealFoods.slice(0, 3);

      // Calcular nutrientes
      const mealNutrition = mealPlan.dailyPlan[meal].foods.reduce((sum, food) => ({
        calories: sum.calories + (food.calories || 0),
        protein: sum.protein + (food.protein || 0),
        carbs: sum.carbs + (food.carbs || 0),
        fats: sum.fats + (food.fats || 0),
        fiber: sum.fiber + (food.fiber || 0)
      }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

      mealPlan.dailyPlan[meal].calories = mealNutrition.calories;
      mealPlan.dailyPlan[meal].macros = {
        protein: mealNutrition.protein,
        carbs: mealNutrition.carbs,
        fats: mealNutrition.fats,
        fiber: mealNutrition.fiber
      };
    });

    // Calcular totais
    mealPlan.totalNutrition = Object.values(mealPlan.dailyPlan).reduce((total, meal) => ({
      calories: total.calories + meal.calories,
      protein: total.protein + meal.macros.protein,
      carbs: total.carbs + meal.macros.carbs,
      fats: total.fats + meal.macros.fats,
      fiber: total.fiber + meal.macros.fiber
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

    // Gerar recomendações básicas
    const recommendations = [
      "Mantenha uma alimentação equilibrada e variada",
      "Realize 5-6 refeições por dia",
      "Mantenha um intervalo de 2-3 horas entre as refeições"
    ];

    if (dietaryPreferences.trainingTime) {
      recommendations.push(
        `Faça uma refeição leve 2 horas antes do treino das ${dietaryPreferences.trainingTime}`,
        "Consuma proteínas e carboidratos após o treino"
      );
    }

    mealPlan.recommendations = {
      preworkout: "Realize uma refeição leve 2 horas antes do treino",
      postworkout: "Consuma proteínas e carboidratos após o treino",
      general: "Mantenha-se hidratado ao longo do dia",
      timing: recommendations,
      healthCondition: userData.healthCondition
    };

    return new Response(
      JSON.stringify(mealPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
