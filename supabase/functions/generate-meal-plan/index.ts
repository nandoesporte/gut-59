
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'content-length, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Validate required fields
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

    // Get selected foods details from database
    const { data: foodsData, error: foodsError } = await supabase
      .from('protocol_foods')
      .select('*')
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

    if (!foodsData || foodsData.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No foods found',
          details: 'No foods found for the selected IDs'
        }),
        { 
          status: 404,
          headers: corsHeaders
        }
      );
    }

    // Organize foods by group
    const foodsByGroup = foodsData.reduce((acc, food) => {
      const group = food.food_group_id;
      if (!acc[group]) acc[group] = [];
      acc[group].push(food);
      return acc;
    }, {} as Record<number, typeof foodsData>);

    // Create meal plan structure
    const mealPlan = {
      dailyPlan: {
        breakfast: {
          foods: (foodsByGroup[1] || []).slice(0, 3),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0 }
        },
        lunch: {
          foods: (foodsByGroup[2] || []).slice(0, 4),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0 }
        },
        snacks: {
          foods: (foodsByGroup[3] || []).slice(0, 3),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0 }
        },
        dinner: {
          foods: (foodsByGroup[4] || []).slice(0, 4),
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
        preworkout: "30 minutos antes do treino, consuma uma refeição leve rica em carboidratos",
        postworkout: "Logo após o treino, priorize proteínas de rápida absorção e carboidratos",
        general: "Mantenha-se hidratado bebendo água ao longo do dia. Evite alimentos processados."
      }
    };

    // Calculate macros for each meal
    Object.values(mealPlan.dailyPlan).forEach(meal => {
      meal.foods.forEach(food => {
        meal.calories += food.calories;
        meal.macros.protein += food.protein;
        meal.macros.carbs += food.carbs;
        meal.macros.fats += food.fats;

        mealPlan.totalNutrition.calories += food.calories;
        mealPlan.totalNutrition.protein += food.protein;
        mealPlan.totalNutrition.carbs += food.carbs;
        mealPlan.totalNutrition.fats += food.fats;
      });
    });

    // Arredondar todos os valores numéricos
    Object.values(mealPlan.dailyPlan).forEach(meal => {
      meal.calories = Math.round(meal.calories);
      meal.macros.protein = Math.round(meal.macros.protein);
      meal.macros.carbs = Math.round(meal.macros.carbs);
      meal.macros.fats = Math.round(meal.macros.fats);
    });

    mealPlan.totalNutrition.calories = Math.round(mealPlan.totalNutrition.calories);
    mealPlan.totalNutrition.protein = Math.round(mealPlan.totalNutrition.protein);
    mealPlan.totalNutrition.carbs = Math.round(mealPlan.totalNutrition.carbs);
    mealPlan.totalNutrition.fats = Math.round(mealPlan.totalNutrition.fats);

    // Ajustar recomendações baseadas nas preferências
    if (dietaryPreferences.trainingTime) {
      const trainingTime = dietaryPreferences.trainingTime;
      if (trainingTime === "morning") {
        mealPlan.recommendations.preworkout = "Café da manhã leve 30 minutos antes do treino, focando em carboidratos de rápida absorção";
        mealPlan.recommendations.postworkout = "Logo após o treino matinal, consuma proteínas e carboidratos para recuperação";
      } else if (trainingTime === "afternoon") {
        mealPlan.recommendations.preworkout = "Lanche leve 30 minutos antes do treino da tarde, evitando gorduras";
        mealPlan.recommendations.postworkout = "Após o treino da tarde, priorize proteínas e carboidratos no lanche ou jantar";
      } else {
        mealPlan.recommendations.preworkout = "Lanche leve 30 minutos antes do treino noturno, evitando refeições pesadas";
        mealPlan.recommendations.postworkout = "Após o treino noturno, consuma uma refeição com proteínas para recuperação muscular";
      }
    }

    if (dietaryPreferences.hasAllergies && dietaryPreferences.allergies.length > 0) {
      mealPlan.recommendations.general += " Atenção especial às suas alergias alimentares: " + 
        dietaryPreferences.allergies.join(", ") + ".";
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
