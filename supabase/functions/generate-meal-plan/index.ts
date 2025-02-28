
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateMealPlanRequest } from "./validator.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Food, DietaryPreferences, UserData, MealPlan } from "./types.ts";

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  console.log("Edge function called:", req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log("Method not allowed:", req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    // Parse the request body
    const requestData = await req.json();
    console.log("Received request data:", JSON.stringify({
      hasUserData: !!requestData.userData,
      selectedFoodsCount: requestData.selectedFoods?.length || 0,
      hasFoodsByMealType: !!requestData.foodsByMealType,
      hasPreferences: !!requestData.preferences
    }));
    
    // Validate the request data
    const validation = validateMealPlanRequest(requestData);
    if (!validation.isValid) {
      console.error("Validation failed:", validation.error);
      return new Response(JSON.stringify({ error: validation.error }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const { userData, selectedFoods, foodsByMealType, preferences } = validation;
    console.log("Validation successful, generating meal plan for user:", userData?.id);

    // Process the payment transaction if the addTransaction function was provided
    if (requestData.addTransaction) {
      try {
        // Logic for payment transaction would go here
        console.log("Processing payment transaction");
      } catch (error) {
        console.error("Error processing payment:", error);
      }
    }

    // Here you would generate the meal plan
    // For demonstration purposes, generating a placeholder plan
    const mealPlan: MealPlan = generatePlaceholderMealPlan(userData!, selectedFoods!, preferences!);
    
    // Save the meal plan to the database
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData!.id,
          plan_data: mealPlan,
          calories: userData!.dailyCalories || 0
        });
        
      if (error) {
        console.error("Error saving meal plan:", error);
      } else {
        console.log("Meal plan saved successfully");
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
    }
    
    // Return the meal plan to the client
    return new Response(JSON.stringify({ mealPlan }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
    
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: 'Internal server error: ' + error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// This function would be replaced with your real meal plan generation logic
function generatePlaceholderMealPlan(userData: UserData, selectedFoods: Food[], preferences: DietaryPreferences): MealPlan {
  // Implement the meal plan generation logic here
  // For now, a simple placeholder
  
  console.log("Generating placeholder meal plan");
  console.log("Selected Foods Count:", selectedFoods.length);
  console.log("User Calories Target:", userData.dailyCalories);
  
  const caloriesPerDay = userData.dailyCalories || 2000;
  
  // Create a basic meal structure
  const createMeal = (calories: number, description: string): any => ({
    foods: selectedFoods.slice(0, 3).map(food => ({
      name: food.name,
      portion: 1,
      unit: food.portionUnit || "porção",
      details: ""
    })),
    calories: calories,
    macros: {
      protein: calories * 0.3 / 4, // 30% protein, 4 calories per gram
      carbs: calories * 0.4 / 4,   // 40% carbs, 4 calories per gram
      fats: calories * 0.3 / 9,    // 30% fat, 9 calories per gram
      fiber: calories * 0.05 / 2   // Rough estimate for fiber
    },
    description
  });
  
  // Create a basic day plan
  const createDayPlan = (dayName: string): any => ({
    dayName,
    meals: {
      breakfast: createMeal(caloriesPerDay * 0.25, "Café da manhã balanceado"),
      morningSnack: createMeal(caloriesPerDay * 0.1, "Lanche da manhã nutritivo"),
      lunch: createMeal(caloriesPerDay * 0.3, "Almoço completo"),
      afternoonSnack: createMeal(caloriesPerDay * 0.1, "Lanche da tarde energético"),
      dinner: createMeal(caloriesPerDay * 0.25, "Jantar leve e nutritivo")
    },
    dailyTotals: {
      calories: caloriesPerDay,
      protein: caloriesPerDay * 0.3 / 4,
      carbs: caloriesPerDay * 0.4 / 4,
      fats: caloriesPerDay * 0.3 / 9,
      fiber: caloriesPerDay * 0.05 / 2
    }
  });
  
  return {
    weeklyPlan: {
      monday: createDayPlan("Segunda-feira"),
      tuesday: createDayPlan("Terça-feira"),
      wednesday: createDayPlan("Quarta-feira"),
      thursday: createDayPlan("Quinta-feira"),
      friday: createDayPlan("Sexta-feira"),
      saturday: createDayPlan("Sábado"),
      sunday: createDayPlan("Domingo")
    },
    weeklyTotals: {
      averageCalories: caloriesPerDay,
      averageProtein: caloriesPerDay * 0.3 / 4,
      averageCarbs: caloriesPerDay * 0.4 / 4,
      averageFats: caloriesPerDay * 0.3 / 9,
      averageFiber: caloriesPerDay * 0.05 / 2
    },
    recommendations: {
      general: "Mantenha uma alimentação balanceada com variedade de nutrientes.",
      preworkout: "Consuma carboidratos complexos 1-2 horas antes do treino.",
      postworkout: "Proteínas e carboidratos são essenciais para recuperação muscular.",
      timing: ["Café da manhã: até 1h após acordar", "Intervalos de 3-4h entre refeições", "Última refeição: 2-3h antes de dormir"]
    }
  };
}
