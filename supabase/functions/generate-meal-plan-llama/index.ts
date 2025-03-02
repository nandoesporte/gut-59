
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the Auth context of the function
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// AIML API configuration
const AIML_API_KEY = "a5463eee746b41b8b267b7492648a9f3"; // Using the provided API key
const AIML_API_URL = "https://api.aimlapi.com/v1/chat/completions";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const requestData = await req.json();
    console.log("Request received:", JSON.stringify(requestData, null, 2));

    const { 
      userData, 
      selectedFoods,
      foodsByMealType,
      dietaryPreferences 
    } = requestData;

    if (!userData || !selectedFoods || selectedFoods.length === 0) {
      throw new Error("Missing required data: userData or selectedFoods");
    }

    console.log(`Generating meal plan for user: ${userData.userId} with ${selectedFoods.length} foods`);
    
    // Create a structured prompt for the meal plan generation
    const systemPrompt = getSystemPrompt(userData, selectedFoods, foodsByMealType, dietaryPreferences);
    
    // Prepare messages for AIML API
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user", 
        content: "Generate a complete weekly meal plan based on the provided information. Make sure to include all days of the week and all meals for each day."
      }
    ];

    console.log("Sending request to AIML API...");
    
    // Call AIML API to generate meal plan
    const aimlResponse = await fetch(AIML_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIML_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
        messages: messages,
        max_tokens: 8000,
        temperature: 0.7,
        top_p: 0.95,
        response_format: { type: "json_object" }
      }),
    });

    if (!aimlResponse.ok) {
      const errorDetails = await aimlResponse.text();
      console.error("AIML API error:", errorDetails);
      throw new Error(`AIML API returned error: ${aimlResponse.status} - ${errorDetails}`);
    }

    const aimlResult = await aimlResponse.json();
    console.log("AIML API response received:", JSON.stringify(aimlResult, null, 2));

    let mealPlanContent = "";
    if (aimlResult.choices && aimlResult.choices.length > 0 && aimlResult.choices[0].message) {
      mealPlanContent = aimlResult.choices[0].message.content;
    } else {
      throw new Error("Unexpected response format from AIML API");
    }

    // Process the generated meal plan
    let mealPlan;
    try {
      // Clean the response if needed (sometimes AI outputs markdown JSON blocks)
      mealPlanContent = cleanJsonResponse(mealPlanContent);
      mealPlan = JSON.parse(mealPlanContent);
      console.log("Successfully parsed meal plan JSON");
    } catch (parseError) {
      console.error("Failed to parse meal plan JSON:", parseError);
      console.log("Raw content received:", mealPlanContent);
      
      // Attempt to extract JSON from the response if it's within markdown code blocks
      try {
        const jsonMatch = mealPlanContent.match(/```json\n([\s\S]*?)\n```/) || 
                         mealPlanContent.match(/```\n([\s\S]*?)\n```/);
        
        if (jsonMatch && jsonMatch[1]) {
          mealPlan = JSON.parse(jsonMatch[1]);
          console.log("Successfully parsed JSON from markdown code block");
        } else {
          throw new Error("Could not extract JSON from the response");
        }
      } catch (extractError) {
        console.error("Failed to extract and parse JSON:", extractError);
        // Generate a basic meal plan as fallback
        mealPlan = generateDefaultMealPlan(userData, selectedFoods);
      }
    }

    // Validate and fix the meal plan structure if needed
    mealPlan = validateAndFixMealPlan(mealPlan, userData, selectedFoods);
    
    // Store the meal plan in the database
    try {
      const { data: savedPlan, error: dbError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.userId,
          plan_data: mealPlan,
          daily_calories: userData.dailyCalories,
          dietary_preferences: JSON.stringify(dietaryPreferences || {}),
          created_at: new Date().toISOString()
        });
      
      if (dbError) {
        console.error("Error saving meal plan to database:", dbError);
      } else {
        console.log("Meal plan saved to database successfully");
      }
    } catch (dbException) {
      console.error("Exception while saving meal plan:", dbException);
    }

    // Return the generated meal plan
    return new Response(JSON.stringify({ mealPlan }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    console.error("Error generating meal plan:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message || "An unexpected error occurred",
      mealPlan: null 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});

function cleanJsonResponse(content: string): string {
  // Remove any markdown code block markers
  return content
    .replace(/```json\n/g, '')
    .replace(/```\n/g, '')
    .replace(/```/g, '')
    .trim();
}

function getSystemPrompt(userData: any, selectedFoods: any[], foodsByMealType: any, preferences: any): string {
  return `You are a professional nutritionist tasked with creating a personalized 7-day meal plan. 
Your goal is to generate a complete meal plan that meets the user's nutritional needs and preferences.

USER INFORMATION:
- Gender: ${userData.gender}
- Age: ${userData.age}
- Weight: ${userData.weight} kg
- Height: ${userData.height} cm
- Activity Level: ${userData.activityLevel}
- Goal: ${userData.goal}
- Daily Calorie Target: ${userData.dailyCalories} calories

DIETARY PREFERENCES:
${preferences ? `
${preferences.hasAllergies ? `- Allergies: ${preferences.allergies?.join(', ') || 'None specified'}` : '- No allergies'}
${preferences.dietaryRestrictions?.length > 0 ? `- Dietary Restrictions: ${preferences.dietaryRestrictions.join(', ')}` : '- No dietary restrictions'}
${preferences.trainingTime ? `- Training Time: ${preferences.trainingTime}` : '- No specific training time'}` : '- No specific dietary preferences'}

AVAILABLE FOODS:
${selectedFoods.map(food => 
  `- ${food.name}: ${food.calories} calories, ${food.protein}g protein, ${food.carbs}g carbs, ${food.fats}g fats`
).join('\n')}

INSTRUCTIONS:
1. Create a 7-day meal plan (Monday through Sunday) using ONLY the foods listed above.
2. Each day should include: breakfast, morning snack, lunch, afternoon snack, and dinner.
3. Each meal should specify the foods, portions, and nutritional information.
4. The total daily calories should be approximately ${userData.dailyCalories} calories.
5. Provide nutritional totals for each day.
6. Include general nutritional recommendations.
7. Provide pre and post-workout meal recommendations if training time is specified.

YOUR RESPONSE MUST BE A VALID JSON OBJECT with the following structure:
{
  "userCalories": number,
  "weeklyPlan": {
    "monday": {
      "dayName": "Monday",
      "meals": {
        "breakfast": {
          "foods": [{"name": string, "portion": number, "unit": string, "details": string}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        "morningSnack": {...same structure as breakfast},
        "lunch": {...same structure as breakfast},
        "afternoonSnack": {...same structure as breakfast},
        "dinner": {...same structure as breakfast}
      },
      "dailyTotals": {"calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number}
    },
    "tuesday": {...same structure as monday},
    "wednesday": {...same structure as monday},
    "thursday": {...same structure as monday},
    "friday": {...same structure as monday},
    "saturday": {...same structure as monday},
    "sunday": {...same structure as monday}
  },
  "weeklyTotals": {
    "averageCalories": number,
    "averageProtein": number,
    "averageCarbs": number,
    "averageFats": number,
    "averageFiber": number
  },
  "recommendations": [string]
}

DO NOT include any explanations or additional text outside of the JSON structure. Your response must be valid JSON that can be parsed directly.`;
}

function validateAndFixMealPlan(mealPlan: any, userData: any, selectedFoods: any[]): any {
  if (!mealPlan) {
    console.log("Meal plan is null or undefined, generating default plan");
    return generateDefaultMealPlan(userData, selectedFoods);
  }

  try {
    // Ensure the meal plan has the required top-level properties
    mealPlan.userCalories = mealPlan.userCalories || userData.dailyCalories;
    mealPlan.weeklyTotals = mealPlan.weeklyTotals || calculateWeeklyAverages(mealPlan.weeklyPlan || {});
    mealPlan.recommendations = mealPlan.recommendations || getDefaultRecommendations(userData.goal);

    // Check if weeklyPlan exists
    if (!mealPlan.weeklyPlan) {
      console.log("Meal plan is missing weeklyPlan property, creating default");
      mealPlan.weeklyPlan = createDefaultWeeklyPlan(userData, selectedFoods);
      return mealPlan;
    }

    // Check each day of the week
    const requiredDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const existingDays = Object.keys(mealPlan.weeklyPlan);
    
    // If any day is missing, create it using a template from an existing day or default
    if (existingDays.length === 0) {
      console.log("No days found in weeklyPlan, creating defaults");
      mealPlan.weeklyPlan = createDefaultWeeklyPlan(userData, selectedFoods);
    } else {
      const templateDay = mealPlan.weeklyPlan[existingDays[0]];
      
      requiredDays.forEach(day => {
        if (!mealPlan.weeklyPlan[day]) {
          console.log(`Adding missing day: ${day}`);
          mealPlan.weeklyPlan[day] = JSON.parse(JSON.stringify(templateDay));
          mealPlan.weeklyPlan[day].dayName = day.charAt(0).toUpperCase() + day.slice(1);
        }
        
        // Ensure each day has all required meal types and properties
        validateAndFixDay(mealPlan.weeklyPlan[day], userData, selectedFoods);
      });
    }

    // Recalculate weekly totals based on fixed daily values
    mealPlan.weeklyTotals = calculateWeeklyAverages(mealPlan.weeklyPlan);
    
    return mealPlan;
  } catch (error) {
    console.error("Error validating meal plan:", error);
    return generateDefaultMealPlan(userData, selectedFoods);
  }
}

function validateAndFixDay(day: any, userData: any, selectedFoods: any[]): void {
  if (!day.meals) {
    day.meals = {};
  }
  
  const mealTypes = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"];
  mealTypes.forEach(mealType => {
    if (!day.meals[mealType]) {
      day.meals[mealType] = createDefaultMeal(mealType, userData.dailyCalories, selectedFoods);
    } else {
      // Ensure each meal has proper structure
      const meal = day.meals[mealType];
      if (!meal.foods || !Array.isArray(meal.foods) || meal.foods.length === 0) {
        meal.foods = createDefaultMeal(mealType, userData.dailyCalories, selectedFoods).foods;
      }
      
      meal.calories = meal.calories || estimateMealCalories(mealType, userData.dailyCalories);
      meal.macros = meal.macros || {
        protein: Math.round(meal.calories * 0.25 / 4),
        carbs: Math.round(meal.calories * 0.5 / 4),
        fats: Math.round(meal.calories * 0.25 / 9),
        fiber: Math.round(meal.calories * 0.01)
      };
    }
  });
  
  // Calculate daily totals
  day.dailyTotals = calculateDailyTotals(day.meals);
}

function createDefaultMeal(mealType: string, dailyCalories: number, foods: any[]): any {
  const calorieDistribution: Record<string, number> = {
    breakfast: 0.25,
    morningSnack: 0.1,
    lunch: 0.3,
    afternoonSnack: 0.1,
    dinner: 0.25
  };
  
  const calories = Math.round(dailyCalories * (calorieDistribution[mealType] || 0.2));
  const protein = Math.round(calories * 0.25 / 4); // 25% of calories from protein
  const carbs = Math.round(calories * 0.5 / 4);    // 50% of calories from carbs
  const fats = Math.round(calories * 0.25 / 9);    // 25% of calories from fats
  const fiber = Math.round(calories * 0.01);       // rough estimate for fiber
  
  // Try to select appropriate foods for this meal type from the available foods
  let mealFoods: any[] = [];
  
  if (foods && foods.length > 0) {
    // Select 1-3 foods that would make sense for this meal type
    const filterByMealType = (foodGroup: number): any[] => {
      return foods.filter(food => food.food_group_id === foodGroup).slice(0, 3);
    };
    
    switch (mealType) {
      case 'breakfast':
        mealFoods = filterByMealType(1); // breakfast foods
        break;
      case 'lunch':
      case 'dinner':
        mealFoods = filterByMealType(2); // main meals
        break;
      case 'morningSnack':
      case 'afternoonSnack':
        mealFoods = filterByMealType(3); // snacks
        break;
      default:
        // Mix of foods
        mealFoods = foods.slice(0, Math.min(3, foods.length));
    }
  }
  
  // If we couldn't find appropriate foods, use generic placeholder
  if (mealFoods.length === 0) {
    return {
      foods: [
        { name: "Example food 1", portion: 100, unit: "g", details: "Healthy option" },
        { name: "Example food 2", portion: 50, unit: "g", details: "Good source of protein" }
      ],
      calories,
      macros: { protein, carbs, fats, fiber }
    };
  }
  
  // Create meal with selected foods
  return {
    foods: mealFoods.map(food => ({
      name: food.name,
      portion: 100,
      unit: food.portionUnit || "g",
      details: `Contains ${food.protein}g protein, ${food.carbs}g carbs, ${food.fats}g fats`
    })),
    calories,
    macros: { protein, carbs, fats, fiber }
  };
}

function estimateMealCalories(mealType: string, dailyCalories: number): number {
  const calorieDistribution: Record<string, number> = {
    breakfast: 0.25,
    morningSnack: 0.1,
    lunch: 0.3,
    afternoonSnack: 0.1,
    dinner: 0.25
  };
  
  return Math.round(dailyCalories * (calorieDistribution[mealType] || 0.2));
}

function calculateDailyTotals(meals: any): any {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  let fiber = 0;
  
  Object.values(meals).forEach((meal: any) => {
    calories += meal.calories || 0;
    protein += meal.macros?.protein || 0;
    carbs += meal.macros?.carbs || 0;
    fats += meal.macros?.fats || 0;
    fiber += meal.macros?.fiber || 0;
  });
  
  return { calories, protein, carbs, fats, fiber };
}

function calculateWeeklyAverages(weeklyPlan: any): any {
  const days = Object.keys(weeklyPlan);
  if (days.length === 0) {
    return {
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFats: 0,
      averageFiber: 0
    };
  }
  
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalFiber = 0;
  
  days.forEach(day => {
    const dailyTotals = weeklyPlan[day].dailyTotals || { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    totalCalories += dailyTotals.calories || 0;
    totalProtein += dailyTotals.protein || 0;
    totalCarbs += dailyTotals.carbs || 0;
    totalFats += dailyTotals.fats || 0;
    totalFiber += dailyTotals.fiber || 0;
  });
  
  const count = days.length;
  return {
    averageCalories: Math.round(totalCalories / count),
    averageProtein: Math.round(totalProtein / count),
    averageCarbs: Math.round(totalCarbs / count),
    averageFats: Math.round(totalFats / count),
    averageFiber: Math.round(totalFiber / count)
  };
}

function createDefaultWeeklyPlan(userData: any, selectedFoods: any[]): any {
  const weeklyPlan: any = {};
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  days.forEach(day => {
    const meals: any = {};
    const mealTypes = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"];
    
    mealTypes.forEach(mealType => {
      meals[mealType] = createDefaultMeal(mealType, userData.dailyCalories, selectedFoods);
    });
    
    weeklyPlan[day] = {
      dayName: day.charAt(0).toUpperCase() + day.slice(1),
      meals,
      dailyTotals: calculateDailyTotals(meals)
    };
  });
  
  return weeklyPlan;
}

function generateDefaultMealPlan(userData: any, selectedFoods: any[]): any {
  const weeklyPlan = createDefaultWeeklyPlan(userData, selectedFoods);
  
  return {
    userCalories: userData.dailyCalories,
    weeklyPlan,
    weeklyTotals: calculateWeeklyAverages(weeklyPlan),
    recommendations: getDefaultRecommendations(userData.goal)
  };
}

function getDefaultRecommendations(goal: string): string[] {
  const baseRecommendations = [
    "Stay hydrated by drinking at least 2-3 liters of water daily.",
    "Include a variety of colorful fruits and vegetables in your diet.",
    "Prioritize whole foods over processed options whenever possible.",
    "Consume protein with each main meal to support muscle maintenance and satiety.",
    "Include healthy fats like olive oil, avocados, and nuts in your diet.",
    "Try to consume complex carbohydrates rather than simple sugars."
  ];
  
  const goalSpecificRecommendations: Record<string, string[]> = {
    lose_weight: [
      "Create a calorie deficit of 300-500 calories per day for sustainable weight loss.",
      "Focus on high-fiber foods that promote satiety and help control hunger.",
      "Consider intermittent fasting approaches like 16:8 to help control calorie intake.",
      "Prioritize protein intake to preserve muscle mass during weight loss."
    ],
    gain_weight: [
      "Aim for a calorie surplus of 300-500 calories per day for healthy weight gain.",
      "Consume protein-rich foods frequently to support muscle growth.",
      "Consider eating 5-6 smaller meals throughout the day to increase overall intake.",
      "Include calorie-dense but nutritious foods like nuts, nut butters, and healthy oils."
    ],
    maintain: [
      "Focus on portion control to maintain your current weight.",
      "Ensure a balanced macronutrient distribution across all meals.",
      "Practice mindful eating to stay attuned to hunger and fullness cues.",
      "Adjust calorie intake based on activity levels on different days."
    ]
  };
  
  // Map the goal to the corresponding recommendations
  let mappedGoal = "maintain";
  if (goal === "lose" || goal === "lose_weight") {
    mappedGoal = "lose_weight";
  } else if (goal === "gain" || goal === "gain_weight") {
    mappedGoal = "gain_weight";
  }
  
  return [...baseRecommendations, ...(goalSpecificRecommendations[mappedGoal] || [])];
}
