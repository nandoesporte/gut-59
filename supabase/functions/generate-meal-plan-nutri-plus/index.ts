
import { serve } from "@std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request payload
    const requestData = await req.json();
    console.log('Received request:', JSON.stringify(requestData, null, 2));

    const {
      userData,
      selectedFoods,
      foodsByMealType,
      dietaryPreferences,
      modelConfig
    } = requestData;

    // Log key information for debugging
    console.log(`Generating meal plan for user: ${userData.userId}`);
    console.log(`Daily calories target: ${userData.dailyCalories}`);
    console.log(`Selected foods count: ${selectedFoods.length}`);
    console.log(`Using model: ${modelConfig?.model || 'default'}`);

    // Mock response structure for testing
    // In a real implementation, this would call an AI service
    const mockMealPlan = generateMockMealPlan(userData, selectedFoods, dietaryPreferences);

    // Add a record to the meal_plans table (optional, for tracking)
    try {
      const { error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.userId,
          plan_data: mockMealPlan,
          daily_calories: userData.dailyCalories,
          dietary_preferences: JSON.stringify(dietaryPreferences)
        });

      if (error) {
        console.error('Error saving meal plan to database:', error);
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Meal plan generated successfully", 
        mealPlan: mockMealPlan 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error('Error in generate-meal-plan-nutri-plus:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Error generating meal plan: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});

// Helper function to generate a mock meal plan for testing
function generateMockMealPlan(userData: any, selectedFoods: any[], dietaryPreferences: any) {
  // Create basic meal structure
  const createMeal = (name: string, calorieRatio: number) => {
    const calories = Math.round(userData.dailyCalories * calorieRatio);
    const protein = Math.round(calories * 0.3 / 4); // 30% calories from protein
    const carbs = Math.round(calories * 0.4 / 4);   // 40% calories from carbs
    const fats = Math.round(calories * 0.3 / 9);    // 30% calories from fats
    
    // Select random foods from available foods
    const mealFoods = selectedFoods
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(food => ({
        name: food.name,
        portion: Math.round(100 * Math.random() + 50),
        unit: food.portionUnit || 'g',
        details: `Source of ${food.protein > 10 ? 'protein' : food.carbs > 10 ? 'carbs' : 'healthy fats'}`
      }));
    
    return {
      description: `${name} (${calories} kcal)`,
      foods: mealFoods,
      calories,
      macros: {
        protein,
        carbs,
        fats,
        fiber: Math.round(carbs * 0.2) // Estimate fiber as 20% of carbs
      }
    };
  };

  // Create daily meal plan for each day
  const createDailyPlan = (dayName: string) => {
    const breakfast = createMeal('Breakfast', 0.25);
    const morningSnack = createMeal('Morning Snack', 0.1);
    const lunch = createMeal('Lunch', 0.35);
    const afternoonSnack = createMeal('Afternoon Snack', 0.1);
    const dinner = createMeal('Dinner', 0.2);
    
    const dailyTotals = {
      calories: breakfast.calories + morningSnack.calories + lunch.calories + 
                afternoonSnack.calories + dinner.calories,
      protein: breakfast.macros.protein + morningSnack.macros.protein + lunch.macros.protein + 
               afternoonSnack.macros.protein + dinner.macros.protein,
      carbs: breakfast.macros.carbs + morningSnack.macros.carbs + lunch.macros.carbs + 
             afternoonSnack.macros.carbs + dinner.macros.carbs,
      fats: breakfast.macros.fats + morningSnack.macros.fats + lunch.macros.fats + 
            afternoonSnack.macros.fats + dinner.macros.fats,
      fiber: breakfast.macros.fiber + morningSnack.macros.fiber + lunch.macros.fiber + 
             afternoonSnack.macros.fiber + dinner.macros.fiber
    };
    
    return {
      dayName,
      meals: {
        breakfast,
        morningSnack,
        lunch,
        afternoonSnack,
        dinner
      },
      dailyTotals
    };
  };

  // Create weekly plan
  const weeklyPlan = {
    monday: createDailyPlan('Monday'),
    tuesday: createDailyPlan('Tuesday'),
    wednesday: createDailyPlan('Wednesday'),
    thursday: createDailyPlan('Thursday'),
    friday: createDailyPlan('Friday'),
    saturday: createDailyPlan('Saturday'),
    sunday: createDailyPlan('Sunday')
  };
  
  // Calculate weekly averages
  const days = Object.values(weeklyPlan);
  const weeklyTotals = {
    averageCalories: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.calories, 0) / 7),
    averageProtein: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.protein, 0) / 7),
    averageCarbs: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.carbs, 0) / 7),
    averageFats: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.fats, 0) / 7),
    averageFiber: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.fiber, 0) / 7)
  };
  
  // Generate recommendations based on dietary preferences
  const recommendations = {
    general: "Consume a variety of fruits, vegetables, and whole grains. Stay hydrated by drinking at least 2 liters of water per day.",
    preworkout: "Consume complex carbohydrates and protein 1-2 hours before workout. Example: banana with peanut butter or oatmeal with protein powder.",
    postworkout: "Consume protein and carbohydrates within 30 minutes post-workout. Example: protein shake with fruit or chicken with rice.",
    timing: [
      "Eat breakfast within an hour of waking up",
      "Space meals 3-4 hours apart",
      "Avoid heavy meals 2-3 hours before bedtime"
    ]
  };
  
  // Add allergies consideration if applicable
  if (dietaryPreferences?.hasAllergies && dietaryPreferences?.allergies?.length > 0) {
    recommendations.general += ` Strictly avoid foods containing ${dietaryPreferences.allergies.join(', ')}.`;
  }
  
  // Account for dietary restrictions
  if (dietaryPreferences?.dietaryRestrictions?.length > 0) {
    recommendations.general += ` Following your ${dietaryPreferences.dietaryRestrictions.join(', ')} diet guidelines.`;
  }
  
  return {
    userCalories: userData.dailyCalories,
    weeklyPlan,
    weeklyTotals,
    recommendations
  };
}
