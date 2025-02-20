
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    console.log('Received request:', { userData, selectedFoods, dietaryPreferences });

    // Validate input data
    if (!userData || !selectedFoods || !dietaryPreferences) {
      throw new Error('Missing required data');
    }

    // Calculate meal distribution based on caloric needs
    const mealDistribution = {
      breakfast: Math.round(userData.dailyCalories * 0.25),
      morningSnack: Math.round(userData.dailyCalories * 0.15),
      lunch: Math.round(userData.dailyCalories * 0.30),
      afternoonSnack: Math.round(userData.dailyCalories * 0.10),
      dinner: Math.round(userData.dailyCalories * 0.20)
    };

    // Group foods by meal type
    const foodsByMealType = selectedFoods.reduce((acc, food) => {
      const mealTypes = food.meal_type || ['any'];
      mealTypes.forEach(type => {
        if (!acc[type]) acc[type] = [];
        acc[type].push(food);
      });
      return acc;
    }, {});

    // Helper function to select foods for a meal
    const selectFoodsForMeal = (availableFoods, targetCalories) => {
      let meal = [];
      let currentCalories = 0;

      // Sort foods by protein content for better nutrition
      const sortedFoods = [...availableFoods].sort((a, b) => (b.protein || 0) - (a.protein || 0));

      for (const food of sortedFoods) {
        if (currentCalories + food.calories <= targetCalories * 1.1) {
          meal.push(food);
          currentCalories += food.calories;
        }
      }

      return meal;
    };

    // Generate meal plan
    const mealPlan = {
      breakfast: selectFoodsForMeal(foodsByMealType['breakfast'] || foodsByMealType['any'] || [], mealDistribution.breakfast),
      morningSnack: selectFoodsForMeal(foodsByMealType['morning_snack'] || foodsByMealType['any'] || [], mealDistribution.morningSnack),
      lunch: selectFoodsForMeal(foodsByMealType['lunch'] || foodsByMealType['any'] || [], mealDistribution.lunch),
      afternoonSnack: selectFoodsForMeal(foodsByMealType['afternoon_snack'] || foodsByMealType['any'] || [], mealDistribution.afternoonSnack),
      dinner: selectFoodsForMeal(foodsByMealType['dinner'] || foodsByMealType['any'] || [], mealDistribution.dinner)
    };

    // Calculate total macros
    const calculateTotalMacros = () => {
      const totals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0
      };

      Object.values(mealPlan).forEach(meal => {
        meal.forEach(food => {
          totals.calories += food.calories || 0;
          totals.protein += food.protein || 0;
          totals.carbs += food.carbs || 0;
          totals.fats += food.fats || 0;
          totals.fiber += food.fiber || 0;
        });
      });

      return totals;
    };

    const macros = calculateTotalMacros();

    // Format the response according to the expected MealPlan type
    const formattedMealPlan = {
      dailyPlan: {
        breakfast: {
          foods: mealPlan.breakfast,
          calories: mealDistribution.breakfast,
          macros: {
            protein: mealPlan.breakfast.reduce((sum, food) => sum + (food.protein || 0), 0),
            carbs: mealPlan.breakfast.reduce((sum, food) => sum + (food.carbs || 0), 0),
            fats: mealPlan.breakfast.reduce((sum, food) => sum + (food.fats || 0), 0),
            fiber: mealPlan.breakfast.reduce((sum, food) => sum + (food.fiber || 0), 0),
          }
        },
        morningSnack: {
          foods: mealPlan.morningSnack,
          calories: mealDistribution.morningSnack,
          macros: {
            protein: mealPlan.morningSnack.reduce((sum, food) => sum + (food.protein || 0), 0),
            carbs: mealPlan.morningSnack.reduce((sum, food) => sum + (food.carbs || 0), 0),
            fats: mealPlan.morningSnack.reduce((sum, food) => sum + (food.fats || 0), 0),
            fiber: mealPlan.morningSnack.reduce((sum, food) => sum + (food.fiber || 0), 0),
          }
        },
        lunch: {
          foods: mealPlan.lunch,
          calories: mealDistribution.lunch,
          macros: {
            protein: mealPlan.lunch.reduce((sum, food) => sum + (food.protein || 0), 0),
            carbs: mealPlan.lunch.reduce((sum, food) => sum + (food.carbs || 0), 0),
            fats: mealPlan.lunch.reduce((sum, food) => sum + (food.fats || 0), 0),
            fiber: mealPlan.lunch.reduce((sum, food) => sum + (food.fiber || 0), 0),
          }
        },
        afternoonSnack: {
          foods: mealPlan.afternoonSnack,
          calories: mealDistribution.afternoonSnack,
          macros: {
            protein: mealPlan.afternoonSnack.reduce((sum, food) => sum + (food.protein || 0), 0),
            carbs: mealPlan.afternoonSnack.reduce((sum, food) => sum + (food.carbs || 0), 0),
            fats: mealPlan.afternoonSnack.reduce((sum, food) => sum + (food.fats || 0), 0),
            fiber: mealPlan.afternoonSnack.reduce((sum, food) => sum + (food.fiber || 0), 0),
          }
        },
        dinner: {
          foods: mealPlan.dinner,
          calories: mealDistribution.dinner,
          macros: {
            protein: mealPlan.dinner.reduce((sum, food) => sum + (food.protein || 0), 0),
            carbs: mealPlan.dinner.reduce((sum, food) => sum + (food.carbs || 0), 0),
            fats: mealPlan.dinner.reduce((sum, food) => sum + (food.fats || 0), 0),
            fiber: mealPlan.dinner.reduce((sum, food) => sum + (food.fiber || 0), 0),
          }
        }
      },
      totalNutrition: macros,
      recommendations: {
        preworkout: dietaryPreferences.trainingTime 
          ? `Consuma uma refeição leve 2 horas antes do treino (${dietaryPreferences.trainingTime})`
          : "",
        postworkout: "Consuma proteínas e carboidratos até 1 hora após o treino",
        general: "Mantenha um intervalo de 2.5-3.5 horas entre as refeições",
        timing: [
          `Distribuição calórica diária: ${userData.dailyCalories} kcal`,
          `Consumo de água recomendado: ${Math.round(userData.weight * 35)}ml por dia`
        ]
      }
    };

    return new Response(JSON.stringify(formattedMealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-meal-plan function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
