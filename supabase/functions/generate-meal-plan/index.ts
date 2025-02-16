
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { calculateHarrisBenedict, calculateMifflinStJeor, adjustCaloriesForGoal, calculateMacroDistribution } from './calculators.ts';
import { analyzeWorkoutCompatibility, optimizeMealCombinations, generateWeeklyPlan } from './meal-optimizer.ts';
import { generateTimingRecommendations } from './recommendations.ts';
import type { UserData, DietaryPreferences, Food, FoodWithPortion } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'content-length, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const requestData = await req.json();
    console.log('Received request data:', requestData);

    const { userData, selectedFoods, dietaryPreferences } = requestData;

    if (!userData || !selectedFoods || !dietaryPreferences) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'userData, selectedFoods, and dietaryPreferences are required'
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const activityFactors = {
      sedentary: 1.2,
      lightlyActive: 1.375,
      moderatelyActive: 1.55,
      veryActive: 1.725,
      extremelyActive: 1.9
    };

    const activityFactor = activityFactors[userData.activityLevel] || 1.2;
    
    const harrisBenedictCalories = calculateHarrisBenedict(
      userData.weight,
      userData.height,
      userData.age,
      userData.gender,
      activityFactor
    );

    const mifflinStJeorCalories = calculateMifflinStJeor(
      userData.weight,
      userData.height,
      userData.age,
      userData.gender,
      activityFactor
    );

    const baseCalories = Math.round((harrisBenedictCalories + mifflinStJeorCalories) / 2);
    const adjustedCalories = adjustCaloriesForGoal(baseCalories, userData.goal);
    const macroTargets = calculateMacroDistribution(adjustedCalories, userData.goal, userData.weight);

    console.log('Fetching foods from database...');
    const { data: foodsData, error: foodsError } = await supabase
      .from('protocol_foods')
      .select('*')
      .in('id', selectedFoods);

    if (foodsError) {
      console.error('Error fetching foods:', foodsError);
      throw foodsError;
    }

    if (!foodsData || foodsData.length === 0) {
      throw new Error('No foods found with the provided IDs');
    }

    console.log(`Found ${foodsData.length} foods`);

    const filteredFoods = foodsData.filter(food => {
      if (dietaryPreferences.hasAllergies && 
          food.common_allergens?.some(allergen => 
            dietaryPreferences.allergies.includes(allergen.toLowerCase()))) {
        return false;
      }
      
      if (food.dietary_flags?.some(flag => 
          dietaryPreferences.dietaryRestrictions.includes(flag.toLowerCase()))) {
        return false;
      }

      return true;
    });

    // Distribuição das calorias por refeição
    const mealCalories = {
      breakfast: Math.round(adjustedCalories * 0.25),
      morningSnack: Math.round(adjustedCalories * 0.15),
      lunch: Math.round(adjustedCalories * 0.30),
      afternoonSnack: Math.round(adjustedCalories * 0.10),
      dinner: Math.round(adjustedCalories * 0.20)
    };

    // Organizar alimentos por tipo de refeição
    const breakfastFoods = filteredFoods.filter(food => food.meal_type?.includes('breakfast'));
    const snackFoods = filteredFoods.filter(food => food.meal_type?.includes('snack'));
    const lunchDinnerFoods = filteredFoods.filter(food => 
      food.meal_type?.includes('lunch') || food.meal_type?.includes('dinner')
    );

    // Gerar plano diário
    const dailyPlan = {
      breakfast: {
        foods: optimizeMealCombinations(
          analyzeWorkoutCompatibility(breakfastFoods, dietaryPreferences.trainingTime, true),
          mealCalories.breakfast,
          {
            protein: Math.round(macroTargets.protein * 0.25),
            carbs: Math.round(macroTargets.carbs * 0.25),
            fats: Math.round(macroTargets.fats * 0.25),
            fiber: Math.round(macroTargets.fiber * 0.25)
          },
          userData.goal,
          { likedFoods: userData.lastFeedback?.likedFoods }
        ),
        calories: mealCalories.breakfast,
        macros: {
          protein: Math.round(macroTargets.protein * 0.25),
          carbs: Math.round(macroTargets.carbs * 0.25),
          fats: Math.round(macroTargets.fats * 0.25),
          fiber: Math.round(macroTargets.fiber * 0.25)
        }
      },
      morningSnack: {
        foods: optimizeMealCombinations(
          snackFoods,
          mealCalories.morningSnack,
          {
            protein: Math.round(macroTargets.protein * 0.15),
            carbs: Math.round(macroTargets.carbs * 0.15),
            fats: Math.round(macroTargets.fats * 0.15),
            fiber: Math.round(macroTargets.fiber * 0.15)
          },
          userData.goal,
          { likedFoods: userData.lastFeedback?.likedFoods }
        ),
        calories: mealCalories.morningSnack,
        macros: {
          protein: Math.round(macroTargets.protein * 0.15),
          carbs: Math.round(macroTargets.carbs * 0.15),
          fats: Math.round(macroTargets.fats * 0.15),
          fiber: Math.round(macroTargets.fiber * 0.15)
        }
      },
      lunch: {
        foods: optimizeMealCombinations(
          lunchDinnerFoods,
          mealCalories.lunch,
          {
            protein: Math.round(macroTargets.protein * 0.30),
            carbs: Math.round(macroTargets.carbs * 0.30),
            fats: Math.round(macroTargets.fats * 0.30),
            fiber: Math.round(macroTargets.fiber * 0.30)
          },
          userData.goal,
          { likedFoods: userData.lastFeedback?.likedFoods }
        ),
        calories: mealCalories.lunch,
        macros: {
          protein: Math.round(macroTargets.protein * 0.30),
          carbs: Math.round(macroTargets.carbs * 0.30),
          fats: Math.round(macroTargets.fats * 0.30),
          fiber: Math.round(macroTargets.fiber * 0.30)
        }
      },
      afternoonSnack: {
        foods: optimizeMealCombinations(
          snackFoods,
          mealCalories.afternoonSnack,
          {
            protein: Math.round(macroTargets.protein * 0.10),
            carbs: Math.round(macroTargets.carbs * 0.10),
            fats: Math.round(macroTargets.fats * 0.10),
            fiber: Math.round(macroTargets.fiber * 0.10)
          },
          userData.goal,
          { likedFoods: userData.lastFeedback?.likedFoods }
        ),
        calories: mealCalories.afternoonSnack,
        macros: {
          protein: Math.round(macroTargets.protein * 0.10),
          carbs: Math.round(macroTargets.carbs * 0.10),
          fats: Math.round(macroTargets.fats * 0.10),
          fiber: Math.round(macroTargets.fiber * 0.10)
        }
      },
      dinner: {
        foods: optimizeMealCombinations(
          analyzeWorkoutCompatibility(lunchDinnerFoods, dietaryPreferences.trainingTime, false),
          mealCalories.dinner,
          {
            protein: Math.round(macroTargets.protein * 0.20),
            carbs: Math.round(macroTargets.carbs * 0.20),
            fats: Math.round(macroTargets.fats * 0.20),
            fiber: Math.round(macroTargets.fiber * 0.20)
          },
          userData.goal,
          { likedFoods: userData.lastFeedback?.likedFoods }
        ),
        calories: mealCalories.dinner,
        macros: {
          protein: Math.round(macroTargets.protein * 0.20),
          carbs: Math.round(macroTargets.carbs * 0.20),
          fats: Math.round(macroTargets.fats * 0.20),
          fiber: Math.round(macroTargets.fiber * 0.20)
        }
      }
    };

    const mealPlan = {
      dailyPlan,
      totalNutrition: {
        calories: adjustedCalories,
        protein: macroTargets.protein,
        carbs: macroTargets.carbs,
        fats: macroTargets.fats,
        fiber: macroTargets.fiber
      },
      recommendations: generateTimingRecommendations(
        dietaryPreferences.trainingTime,
        userData.goal,
        userData.healthCondition
      )
    };

    console.log('Generated meal plan:', JSON.stringify(mealPlan, null, 2));

    // Salvar o plano no banco de dados
    const { error: saveError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userData.userId,
        plan_data: mealPlan,
        dietary_preferences: dietaryPreferences,
        calories: adjustedCalories,
        macros: macroTargets,
        training_time: dietaryPreferences.trainingTime,
        active: true
      });

    if (saveError) {
      console.error('Error saving meal plan:', saveError);
      return new Response(
        JSON.stringify({
          error: 'Failed to save meal plan',
          details: saveError.message
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    return new Response(
      JSON.stringify(mealPlan),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('General error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error.message
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
