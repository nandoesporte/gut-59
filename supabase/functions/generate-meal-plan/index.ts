
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { analyzeMealDistribution, analyzeNutrientBalance } from "./meal-analyzer.ts";
import { optimizeMealPlan } from "./meal-optimizer.ts";
import { calculateMacroTargets } from "./calculators.ts";
import { validatePayload } from "./validator.ts";
import { generateRecommendations } from "./recommendations.ts";
import { analyzeWorkoutSync } from "./workout-analyzer.ts";
import Ajv from "https://esm.sh/ajv@8.12.0";

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
    console.log("Iniciando função generate-meal-plan");
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestData = await req.json();
    console.log("Dados recebidos:", JSON.stringify(requestData));

    // Standardize foodsByMealType to ensure all IDs are strings
    if (requestData.foodsByMealType) {
      console.log("Standardizando foodsByMealType");
      Object.keys(requestData.foodsByMealType).forEach(mealType => {
        if (Array.isArray(requestData.foodsByMealType[mealType])) {
          requestData.foodsByMealType[mealType] = requestData.foodsByMealType[mealType].map((id: any) => String(id));
        } else {
          // If not an array, initialize it as an empty array
          requestData.foodsByMealType[mealType] = [];
        }
      });
    }

    // Validate input with more flexible validation
    const isValid = validatePayload(requestData);
    if (!isValid) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input data',
        payload: requestData 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userData, selectedFoods, dietaryPreferences, options } = requestData;
    
    // Log received data
    console.log("Calorias diárias fornecidas:", userData.dailyCalories, "kcal");
    
    // Calculate macro targets based on user data
    const macroTargets = calculateMacroTargets(userData);
    
    // Check for workout synchronization
    let workoutAnalysis = null;
    if (dietaryPreferences.trainingTime) {
      workoutAnalysis = analyzeWorkoutSync(dietaryPreferences.trainingTime);
    }
    
    // Standardize foodsByMealType further for the optimization process
    const standardizedFoodsByMealType = requestData.foodsByMealType || {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: []
    };

    // Generate the optimized meal plan
    const mealPlan = await optimizeMealPlan(
      userData, 
      selectedFoods, 
      macroTargets, 
      dietaryPreferences,
      standardizedFoodsByMealType
    );
    
    // Analyze meal distribution
    const distributionAnalysis = analyzeMealDistribution(mealPlan, macroTargets);
    
    // Analyze nutrient balance
    const balanceAnalysis = analyzeNutrientBalance(mealPlan, userData.dailyCalories);
    
    // Generate recommendations
    const recommendations = generateRecommendations(
      mealPlan, 
      macroTargets, 
      dietaryPreferences,
      workoutAnalysis
    );
    
    // Prepare the response
    const response = {
      mealPlan,
      analysis: {
        distribution: distributionAnalysis,
        balance: balanceAnalysis
      },
      recommendations
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
