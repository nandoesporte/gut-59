
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import { DietaryPreferences, ProtocolFood, MealPlan } from './types.ts'

const MEAL_DISTRIBUTION = {
  breakfast: { calories: 0.25, protein: 0.2, carbs: 0.3, fats: 0.25 },
  morningSnack: { calories: 0.15, protein: 0.2, carbs: 0.2, fats: 0.15 },
  lunch: { calories: 0.3, protein: 0.35, carbs: 0.3, fats: 0.3 },
  afternoonSnack: { calories: 0.1, protein: 0.1, carbs: 0.1, fats: 0.15 },
  dinner: { calories: 0.2, protein: 0.15, carbs: 0.1, fats: 0.15 }
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

    // Buscar alimentos com informações nutricionais completas
    const { data: foodsData, error: foodsError } = await supabaseClient
      .from('protocol_foods')
      .select('*, food_groups!fk_food_group(name)')
      .in('id', selectedFoods)

    if (foodsError) {
      throw new Error(`Error fetching foods: ${foodsError.message}`)
    }

    if (!foodsData || foodsData.length === 0) {
      throw new Error('No foods data returned')
    }

    const foods = foodsData as ProtocolFood[]
    
    // Remover duplicatas baseado no ID do alimento
    const uniqueFoods = Array.from(new Map(foods.map(food => [food.id, food])).values());
    console.log(`Found ${uniqueFoods.length} unique foods`)

    // Categorizar alimentos por grupo
    const foodsByGroup = uniqueFoods.reduce((acc, food) => {
      const group = food.food_group_id;
      if (!acc[group]) acc[group] = [];
      acc[group].push(food);
      return acc;
    }, {});

    // Distribuir alimentos considerando restrições e preferências
    const distributeFoods = (foods: ProtocolFood[], targetCalories: number) => {
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
      Object.entries(MEAL_DISTRIBUTION).forEach(([meal, targets]) => {
        const mealCalorieTarget = targetCalories * targets.calories;
        const mealFoods = [];

        // Selecionar alimentos apropriados para a refeição
        if (meal === 'breakfast') {
          mealFoods.push(...(foodsByGroup[1] || [])); // Grupo café da manhã
        } else if (meal === 'lunch' || meal === 'dinner') {
          mealFoods.push(...(foodsByGroup[2] || [])); // Grupo almoço/jantar
        } else {
          mealFoods.push(...(foodsByGroup[3] || [])); // Grupo lanches
        }

        mealPlan.dailyPlan[meal].foods = mealFoods.slice(0, 3); // Limitar a 3 alimentos por refeição
      });

      // Calcular nutrição para cada refeição
      Object.keys(mealPlan.dailyPlan).forEach(mealKey => {
        const meal = mealPlan.dailyPlan[mealKey];
        meal.calories = meal.foods.reduce((sum, food) => sum + food.calories, 0);
        meal.macros = meal.foods.reduce((macros, food) => ({
          protein: macros.protein + (food.protein || 0),
          carbs: macros.carbs + (food.carbs || 0),
          fats: macros.fats + (food.fats || 0),
          fiber: macros.fiber + (food.fiber || 0)
        }), { protein: 0, carbs: 0, fats: 0, fiber: 0 });
      });

      // Calcular nutrição total
      mealPlan.totalNutrition = Object.values(mealPlan.dailyPlan).reduce((total, meal) => ({
        calories: total.calories + meal.calories,
        protein: total.protein + meal.macros.protein,
        carbs: total.carbs + meal.macros.carbs,
        fats: total.fats + meal.macros.fats,
        fiber: total.fiber + meal.macros.fiber
      }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

      // Gerar recomendações baseadas no perfil e preferências
      const trainingTime = dietaryPreferences.trainingTime;
      const recommendations = [];

      if (trainingTime) {
        recommendations.push(`Organize suas refeições considerando seu treino às ${trainingTime}`);
        recommendations.push("Consuma carboidratos complexos 2-3 horas antes do treino");
        recommendations.push("Proteína e carboidratos até 30 minutos após o treino");
      }

      if (dietaryPreferences.hasAllergies) {
        recommendations.push("Atenção aos alimentos com potencial alérgico");
      }

      if (userData.healthCondition) {
        recommendations.push(`Cardápio adaptado para ${userData.healthCondition}`);
      }

      mealPlan.recommendations = {
        preworkout: "Consuma uma refeição rica em carboidratos 2-3 horas antes do treino",
        postworkout: "Após o treino, priorize proteínas e carboidratos para recuperação",
        general: "Mantenha-se hidratado ao longo do dia",
        timing: recommendations,
        healthCondition: userData.healthCondition
      };

      return mealPlan;
    };

    const mealPlan = distributeFoods(uniqueFoods, userData.dailyCalories);

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
