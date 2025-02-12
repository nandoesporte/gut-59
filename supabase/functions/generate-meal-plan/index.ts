
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

function distributeMacros(totalCalories: number, goal: string) {
  let proteinPercentage = 0.3;
  let carbsPercentage = 0.4;
  let fatsPercentage = 0.3;

  // Adjust macros based on goal
  switch (goal) {
    case 'lose':
      proteinPercentage = 0.35;
      carbsPercentage = 0.35;
      fatsPercentage = 0.3;
      break;
    case 'gain':
      proteinPercentage = 0.3;
      carbsPercentage = 0.45;
      fatsPercentage = 0.25;
      break;
    // maintain uses default distribution
  }

  return {
    protein: Math.round((totalCalories * proteinPercentage) / 4), // 4 calories per gram of protein
    carbs: Math.round((totalCalories * carbsPercentage) / 4), // 4 calories per gram of carbs
    fats: Math.round((totalCalories * fatsPercentage) / 9), // 9 calories per gram of fat
  };
}

function distributeCalories(totalCalories: number) {
  return {
    breakfast: Math.round(totalCalories * 0.25),
    morningSnack: Math.round(totalCalories * 0.15),
    lunch: Math.round(totalCalories * 0.3),
    afternoonSnack: Math.round(totalCalories * 0.1),
    dinner: Math.round(totalCalories * 0.2),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      userData,
      selectedFoods,
      dietaryPreferences
    } = await req.json();

    // Validate input data
    if (!userData || !selectedFoods || !dietaryPreferences) {
      throw new Error('Missing required input data');
    }

    console.log('Input data:', { userData, selectedFoods, dietaryPreferences });

    // Get foods data from database
    const { data: foodsData, error: foodsError } = await supabase
      .from('protocol_foods')
      .select('*')
      .in('id', selectedFoods);

    if (foodsError) throw foodsError;

    const foods = foodsData as Food[];
    const calorieDistribution = distributeCalories(userData.dailyCalories);
    const macroTargets = distributeMacros(userData.dailyCalories, userData.goal);

    // Generate meal plan
    const mealPlan = {
      dailyPlan: {
        breakfast: {
          foods: foods.filter(f => f.calories <= calorieDistribution.breakfast).slice(0, 3),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0 }
        },
        morningSnack: {
          foods: foods.filter(f => f.calories <= calorieDistribution.morningSnack).slice(0, 2),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0 }
        },
        lunch: {
          foods: foods.filter(f => f.calories <= calorieDistribution.lunch).slice(0, 4),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0 }
        },
        afternoonSnack: {
          foods: foods.filter(f => f.calories <= calorieDistribution.afternoonSnack).slice(0, 2),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0 }
        },
        dinner: {
          foods: foods.filter(f => f.calories <= calorieDistribution.dinner).slice(0, 3),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0 }
        }
      },
      totalNutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0
      },
      recommendations: {
        preworkout: dietaryPreferences.trainingTime 
          ? "Consuma uma refeição leve 2 horas antes do treino."
          : "",
        postworkout: dietaryPreferences.trainingTime 
          ? "Consuma proteínas e carboidratos em até 30 minutos após o treino."
          : "",
        general: "Mantenha uma boa hidratação ao longo do dia."
      }
    };

    // Calculate totals for each meal
    Object.keys(mealPlan.dailyPlan).forEach((meal) => {
      const mealFoods = mealPlan.dailyPlan[meal].foods;
      mealPlan.dailyPlan[meal].calories = mealFoods.reduce((sum, food) => sum + food.calories, 0);
      mealPlan.dailyPlan[meal].macros = {
        protein: mealFoods.reduce((sum, food) => sum + food.protein, 0),
        carbs: mealFoods.reduce((sum, food) => sum + food.carbs, 0),
        fats: mealFoods.reduce((sum, food) => sum + food.fats, 0)
      };
    });

    // Calculate total nutrition
    mealPlan.totalNutrition = {
      calories: Object.values(mealPlan.dailyPlan).reduce((sum, meal) => sum + meal.calories, 0),
      protein: Object.values(mealPlan.dailyPlan).reduce((sum, meal) => sum + meal.macros.protein, 0),
      carbs: Object.values(mealPlan.dailyPlan).reduce((sum, meal) => sum + meal.macros.carbs, 0),
      fats: Object.values(mealPlan.dailyPlan).reduce((sum, meal) => sum + meal.macros.fats, 0)
    };

    // Save meal plan to database
    const { error: saveError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userData.userId,
        daily_calories: mealPlan.totalNutrition.calories,
        protein_target: mealPlan.totalNutrition.protein,
        carbs_target: mealPlan.totalNutrition.carbs,
        fats_target: mealPlan.totalNutrition.fats,
        meal_recommendations: mealPlan
      });

    if (saveError) {
      console.error('Database save error:', saveError);
      throw saveError;
    }

    return new Response(
      JSON.stringify(mealPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-meal-plan function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
