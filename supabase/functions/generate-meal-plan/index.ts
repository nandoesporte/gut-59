
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { calculateHarrisBenedict, calculateMifflinStJeor, calculateMacroDistribution } from './calculators.ts';
import { analyzeWorkoutCompatibility, optimizeMealCombinations } from './meal-optimizer.ts';
import { generateTimingRecommendations } from './recommendations.ts';
import type { UserData, DietaryPreferences, Food } from './types.ts';

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

    const activityFactors: { [key: string]: number } = {
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

    const goalFactors: { [key: string]: number } = {
      lose: 0.8,
      maintain: 1,
      gain: 1.2
    };

    const adjustedCalories = Math.round(baseCalories * (goalFactors[userData.goal] || 1));
    const macroTargets = calculateMacroDistribution(adjustedCalories, userData.goal);

    const { data: foodsData, error: foodsError } = await supabase
      .from('protocol_foods')
      .select(`
        *,
        vitamins,
        minerals,
        preparation_time_minutes,
        is_quick_meal,
        glycemic_index,
        fiber,
        meal_type,
        serving_size,
        serving_unit,
        pre_workout_compatible,
        post_workout_compatible,
        common_allergens,
        dietary_flags
      `)
      .in('id', selectedFoods);

    if (foodsError) {
      console.error('Error fetching foods:', foodsError);
      return new Response(
        JSON.stringify({
          error: 'Database error',
          details: foodsError.message
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

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

    const foodsByGroup = filteredFoods.reduce((acc, food) => {
      const group = food.food_group_id;
      if (!acc[group]) acc[group] = [];
      acc[group].push(food);
      return acc;
    }, {} as Record<number, Food[]>);

    const mealPlan = {
      dailyPlan: {
        breakfast: {
          foods: optimizeMealCombinations(
            analyzeWorkoutCompatibility(foodsByGroup[1] || [], dietaryPreferences.trainingTime, true),
            Math.round(adjustedCalories * 0.25),
            {
              protein: Math.round(macroTargets.protein * 0.25),
              carbs: Math.round(macroTargets.carbs * 0.25),
              fats: Math.round(macroTargets.fats * 0.25)
            },
            userData.goal
          ),
          calories: Math.round(adjustedCalories * 0.25),
          macros: {
            protein: Math.round(macroTargets.protein * 0.25),
            carbs: Math.round(macroTargets.carbs * 0.25),
            fats: Math.round(macroTargets.fats * 0.25)
          }
        },
        lunch: {
          foods: optimizeMealCombinations(
            foodsByGroup[2] || [],
            Math.round(adjustedCalories * 0.35),
            {
              protein: Math.round(macroTargets.protein * 0.35),
              carbs: Math.round(macroTargets.carbs * 0.35),
              fats: Math.round(macroTargets.fats * 0.35)
            },
            userData.goal
          ),
          calories: Math.round(adjustedCalories * 0.35),
          macros: {
            protein: Math.round(macroTargets.protein * 0.35),
            carbs: Math.round(macroTargets.carbs * 0.35),
            fats: Math.round(macroTargets.fats * 0.35)
          }
        },
        snacks: {
          foods: optimizeMealCombinations(
            foodsByGroup[3] || [],
            Math.round(adjustedCalories * 0.15),
            {
              protein: Math.round(macroTargets.protein * 0.15),
              carbs: Math.round(macroTargets.carbs * 0.15),
              fats: Math.round(macroTargets.fats * 0.15)
            },
            userData.goal
          ),
          calories: Math.round(adjustedCalories * 0.15),
          macros: {
            protein: Math.round(macroTargets.protein * 0.15),
            carbs: Math.round(macroTargets.carbs * 0.15),
            fats: Math.round(macroTargets.fats * 0.15)
          }
        },
        dinner: {
          foods: optimizeMealCombinations(
            analyzeWorkoutCompatibility(foodsByGroup[4] || [], dietaryPreferences.trainingTime, false),
            Math.round(adjustedCalories * 0.25),
            {
              protein: Math.round(macroTargets.protein * 0.25),
              carbs: Math.round(macroTargets.carbs * 0.25),
              fats: Math.round(macroTargets.fats * 0.25)
            },
            userData.goal
          ),
          calories: Math.round(adjustedCalories * 0.25),
          macros: {
            protein: Math.round(macroTargets.protein * 0.25),
            carbs: Math.round(macroTargets.carbs * 0.25),
            fats: Math.round(macroTargets.fats * 0.25)
          }
        }
      },
      totalNutrition: {
        calories: adjustedCalories,
        protein: macroTargets.protein,
        carbs: macroTargets.carbs,
        fats: macroTargets.fats
      },
      recommendations: generateTimingRecommendations(dietaryPreferences.trainingTime, userData.goal)
    };

    const { error: saveError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userData.userId,
        plan_data: mealPlan,
        dietary_preferences: dietaryPreferences,
        calories: adjustedCalories,
        macros: macroTargets,
        training_time: dietaryPreferences.trainingTime
      });

    if (saveError) {
      console.error('Error saving meal plan:', saveError);
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
