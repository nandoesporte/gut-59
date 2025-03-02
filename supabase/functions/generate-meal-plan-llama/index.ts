
import "xhr";
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// AIML API token
const AIML_API_TOKEN = "JWT"; // Replace with your actual JWT token

serve(async (req) => {
  console.log("Edge Function: generate-meal-plan-llama started");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const requestData = await req.json();
    console.log("Received request data:", JSON.stringify(requestData, null, 2));

    const { userData, selectedFoods, foodsByMealType, dietaryPreferences, modelConfig } = requestData;
    
    if (!userData || !userData.dailyCalories) {
      throw new Error("Missing required user data or calorie information");
    }

    // Create a system prompt with all the necessary details
    const systemPrompt = createSystemPrompt(userData, selectedFoods, foodsByMealType, dietaryPreferences);
    console.log("Generated system prompt");

    // Create messages array for the AIML API
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Generate a complete weekly meal plan for someone with ${userData.dailyCalories} calories per day, following their dietary preferences and using their preferred foods.`
      }
    ];

    console.log("Calling AIML API with Nous-Hermes-2-Mixtral-8x7B-DPO model");
    
    // Call the AIML API
    const aimlResponse = await callAIMLAPI(messages);
    console.log("Received response from AIML API");

    // Parse the response and format it into a meal plan structure
    const mealPlan = parseMealPlanResponse(aimlResponse, userData);
    console.log("Successfully parsed meal plan structure");

    // Save the meal plan data to the database (optional)
    try {
      const { data: savedPlan, error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.userId,
          plan_data: mealPlan,
          daily_calories: userData.dailyCalories,
          dietary_preferences: dietaryPreferences,
          created_at: new Date().toISOString()
        });
        
      if (saveError) {
        console.error("Error saving meal plan to database:", saveError);
      } else {
        console.log("Meal plan saved to database");
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      // Continue even if saving fails
    }

    return new Response(
      JSON.stringify({ 
        mealPlan,
        status: "success",
        model: "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error in generate-meal-plan-llama function:", error);
    
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});

async function callAIMLAPI(messages: any[]) {
  try {
    console.log("Preparing AIML API request");
    
    const requestBody = {
      max_tokens: 4096, // Larger token limit for complete meal plans
      stream: false,
      n: 1,
      temperature: 0.7, // Good for creative yet structured content
      model: "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
      messages: messages,
      response_format: {
        type: "json_object" // Specify JSON for structured response
      }
    };
    
    console.log("AIML API request body:", JSON.stringify(requestBody, null, 2));

    // API call with a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
    
    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIML_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("AIML API error response:", errorText);
      throw new Error(`AIML API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("AIML API response received");
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error("Invalid AIML API response format:", JSON.stringify(data, null, 2));
      throw new Error("Invalid response from AIML API");
    }
    
    const content = data.choices[0].message.content;
    return content;
  } catch (error) {
    console.error("Error calling AIML API:", error);
    throw error;
  }
}

function createSystemPrompt(userData: any, selectedFoods: any[], foodsByMealType: any, dietaryPreferences: any) {
  return `
  You are a professional nutrition expert. Your task is to create a personalized 7-day meal plan in JSON format.
  
  IMPORTANT GUIDELINES:
  - Create a complete weekly meal plan with all 7 days (monday through sunday).
  - For each day, include breakfast, morningSnack, lunch, afternoonSnack, and dinner.
  - Make sure each day's total calories are around ${userData.dailyCalories} calories.
  - For each meal, include a list of foods with portions, calories, and macronutrients.
  - Calculate and include daily totals for calories, protein, carbs, fats, and fiber.
  - Include weekly averages for calories, protein, carbs, fats, and fiber.
  - Provide nutritional recommendations tailored to the user's goal: ${userData.goal}.
  - Only use foods from the provided list.
  - Be precise with portions to match calorie and macro targets.
  
  USER DATA:
  - Weight: ${userData.weight} kg
  - Height: ${userData.height} cm
  - Age: ${userData.age} years
  - Gender: ${userData.gender}
  - Activity Level: ${userData.activityLevel}
  - Goal: ${userData.goal}
  - Daily Calorie Target: ${userData.dailyCalories} calories
  
  DIETARY PREFERENCES:
  ${dietaryPreferences.hasAllergies ? 
    `- Allergies: ${dietaryPreferences.allergies.join(', ')}` : 
    '- No food allergies'
  }
  ${dietaryPreferences.dietaryRestrictions?.length > 0 ? 
    `- Dietary Restrictions: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : 
    '- No dietary restrictions'
  }
  ${dietaryPreferences.trainingTime ? 
    `- Training Time: ${dietaryPreferences.trainingTime}` : 
    '- No specific training time'
  }
  
  AVAILABLE FOODS (${selectedFoods.length} foods):
  ${selectedFoods.map(food => 
    `- ${food.name}: ${food.calories} kcal, protein ${food.protein}g, carbs ${food.carbs}g, fats ${food.fats}g, fiber ${food.fiber || 0}g`
  ).join('\n')}
  
  RESPONSE FORMAT:
  Your response must be a valid JSON object with the following structure:
  {
    "weeklyPlan": {
      "monday": {
        "dayName": "Monday",
        "meals": {
          "breakfast": {
            "description": "...",
            "foods": [
              {"name": "Food Name", "portion": 100, "unit": "g", "details": "..."}
            ],
            "calories": 0,
            "macros": {"protein": 0, "carbs": 0, "fats": 0, "fiber": 0}
          },
          // Similar structure for morningSnack, lunch, afternoonSnack, dinner
        },
        "dailyTotals": {"calories": 0, "protein": 0, "carbs": 0, "fats": 0, "fiber": 0}
      },
      // Similar structure for tuesday through sunday
    },
    "weeklyTotals": {
      "averageCalories": 0,
      "averageProtein": 0,
      "averageCarbs": 0,
      "averageFats": 0,
      "averageFiber": 0
    },
    "recommendations": {
      "general": "...",
      "preworkout": "...",
      "postworkout": "...",
      "timing": ["...", "..."]
    }
  }
  
  Keep all numeric values as numbers (not strings). Ensure the response is a properly formatted JSON object with no errors.
  `;
}

function parseMealPlanResponse(responseContent: string, userData: any) {
  try {
    // Try to parse the JSON from the response
    let mealPlanData;
    
    // First, try to extract JSON if it's wrapped in markdown code blocks
    const jsonRegex = /```(?:json)?([\s\S]*?)```/;
    const match = responseContent.match(jsonRegex);
    
    if (match && match[1]) {
      try {
        mealPlanData = JSON.parse(match[1].trim());
        console.log("Successfully extracted JSON from markdown code blocks");
      } catch (innerError) {
        console.error("Error parsing JSON from markdown:", innerError);
      }
    }
    
    // If that didn't work, try to parse the whole response as JSON
    if (!mealPlanData) {
      try {
        mealPlanData = JSON.parse(responseContent.trim());
        console.log("Successfully parsed response as JSON");
      } catch (jsonError) {
        console.error("Error parsing full response as JSON:", jsonError);
        // Try one more approach: look for a JSON-like structure in the text
        const possibleJsonStart = responseContent.indexOf('{');
        const possibleJsonEnd = responseContent.lastIndexOf('}');
        
        if (possibleJsonStart >= 0 && possibleJsonEnd > possibleJsonStart) {
          const jsonCandidate = responseContent.substring(possibleJsonStart, possibleJsonEnd + 1);
          try {
            mealPlanData = JSON.parse(jsonCandidate);
            console.log("Successfully extracted JSON from text content");
          } catch (extractError) {
            console.error("Error parsing extracted JSON:", extractError);
          }
        }
      }
    }
    
    // If we still don't have valid data, create a default structure
    if (!mealPlanData || !mealPlanData.weeklyPlan) {
      console.log("Could not parse meal plan data, using default structure");
      return createDefaultMealPlan(userData);
    }
    
    // Validate and fix the meal plan structure if needed
    validateAndFixMealPlanStructure(mealPlanData);
    
    // Add metadata
    mealPlanData.userId = userData.userId;
    mealPlanData.dailyCalories = userData.dailyCalories;
    mealPlanData.goal = userData.goal;
    mealPlanData.generatedAt = new Date().toISOString();
    
    return mealPlanData;
  } catch (error) {
    console.error("Error parsing meal plan response:", error);
    // Return a default meal plan as fallback
    return createDefaultMealPlan(userData);
  }
}

function validateAndFixMealPlanStructure(mealPlan: any) {
  // Check if weeklyPlan exists
  if (!mealPlan.weeklyPlan) {
    mealPlan.weeklyPlan = {};
  }
  
  // Ensure all days of the week exist
  const requiredDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  requiredDays.forEach(day => {
    if (!mealPlan.weeklyPlan[day]) {
      // If this day is missing, copy another day's data or create a default
      const availableDays = Object.keys(mealPlan.weeklyPlan);
      if (availableDays.length > 0) {
        // Clone an existing day
        const templateDay = JSON.parse(JSON.stringify(mealPlan.weeklyPlan[availableDays[0]]));
        templateDay.dayName = day.charAt(0).toUpperCase() + day.slice(1);
        mealPlan.weeklyPlan[day] = templateDay;
      } else {
        // Create a default day
        mealPlan.weeklyPlan[day] = createDefaultDay(day);
      }
    }
    
    // Ensure each day has the required meals
    const dayPlan = mealPlan.weeklyPlan[day];
    if (!dayPlan.meals) {
      dayPlan.meals = {};
    }
    
    // Check each meal type
    const mealTypes = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"];
    mealTypes.forEach(mealType => {
      if (!dayPlan.meals[mealType]) {
        dayPlan.meals[mealType] = createDefaultMeal(mealType);
      }
      
      // Ensure each meal has the required properties
      const meal = dayPlan.meals[mealType];
      if (!meal.foods || !Array.isArray(meal.foods)) {
        meal.foods = [];
      }
      if (typeof meal.calories !== 'number') {
        meal.calories = estimateMealCalories(mealType);
      }
      if (!meal.macros) {
        meal.macros = { protein: 0, carbs: 0, fats: 0, fiber: 0 };
      }
      if (!meal.description) {
        meal.description = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} meal`;
      }
    });
    
    // Ensure daily totals
    if (!dayPlan.dailyTotals) {
      dayPlan.dailyTotals = calculateDailyTotals(dayPlan.meals);
    }
  });
  
  // Ensure weekly totals
  if (!mealPlan.weeklyTotals) {
    mealPlan.weeklyTotals = calculateWeeklyAverages(mealPlan.weeklyPlan);
  }
  
  // Ensure recommendations
  if (!mealPlan.recommendations) {
    mealPlan.recommendations = {
      general: "Maintain a balanced diet with a variety of foods.",
      preworkout: "Consume a meal rich in carbohydrates and moderate in protein 1-2 hours before training.",
      postworkout: "After training, consume protein and carbohydrates within 30-60 minutes for optimal recovery.",
      timing: [
        "Eat breakfast within an hour of waking up",
        "Space meals every 3-4 hours",
        "Consume your last meal 2-3 hours before bedtime"
      ]
    };
  }
}

function createDefaultMeal(mealType: string) {
  const calories = estimateMealCalories(mealType);
  const protein = Math.round(calories * 0.25 / 4); // 25% of calories from protein (4 cal/g)
  const carbs = Math.round(calories * 0.5 / 4);    // 50% of calories from carbs (4 cal/g)
  const fats = Math.round(calories * 0.25 / 9);    // 25% of calories from fats (9 cal/g)
  
  return {
    description: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} meal with balanced nutrients`,
    foods: [
      { name: "Food example", portion: 100, unit: "g", details: "Nutritious option" }
    ],
    calories,
    macros: {
      protein,
      carbs,
      fats,
      fiber: Math.round(calories / 100) // Rough estimate
    }
  };
}

function estimateMealCalories(mealType: string) {
  // Default distribution for a 2000 calorie diet
  switch (mealType) {
    case "breakfast": return 500;     // 25%
    case "morningSnack": return 200;  // 10%
    case "lunch": return 700;         // 35%
    case "afternoonSnack": return 200; // 10%
    case "dinner": return 400;        // 20%
    default: return 300;
  }
}

function calculateDailyTotals(meals: any) {
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

function calculateWeeklyAverages(weeklyPlan: any) {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalFiber = 0;
  let dayCount = 0;
  
  Object.values(weeklyPlan).forEach((day: any) => {
    if (day.dailyTotals) {
      totalCalories += day.dailyTotals.calories || 0;
      totalProtein += day.dailyTotals.protein || 0;
      totalCarbs += day.dailyTotals.carbs || 0;
      totalFats += day.dailyTotals.fats || 0;
      totalFiber += day.dailyTotals.fiber || 0;
      dayCount++;
    }
  });
  
  const divisor = dayCount || 1; // Avoid division by zero
  
  return {
    averageCalories: Math.round(totalCalories / divisor),
    averageProtein: Math.round(totalProtein / divisor),
    averageCarbs: Math.round(totalCarbs / divisor),
    averageFats: Math.round(totalFats / divisor),
    averageFiber: Math.round(totalFiber / divisor)
  };
}

function createDefaultDay(dayName: string) {
  const meals = {
    breakfast: createDefaultMeal("breakfast"),
    morningSnack: createDefaultMeal("morningSnack"),
    lunch: createDefaultMeal("lunch"),
    afternoonSnack: createDefaultMeal("afternoonSnack"),
    dinner: createDefaultMeal("dinner")
  };
  
  return {
    dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
    meals,
    dailyTotals: calculateDailyTotals(meals)
  };
}

function createDefaultMealPlan(userData: any) {
  const weeklyPlan: Record<string, any> = {};
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  days.forEach(day => {
    weeklyPlan[day] = createDefaultDay(day);
  });
  
  const weeklyTotals = calculateWeeklyAverages(weeklyPlan);
  
  return {
    userId: userData.userId,
    dailyCalories: userData.dailyCalories,
    goal: userData.goal,
    weeklyPlan,
    weeklyTotals,
    recommendations: {
      general: "Maintain a balanced diet with a variety of foods to ensure adequate nutrient intake.",
      preworkout: "Consume a meal rich in carbohydrates and moderate in protein 1-2 hours before training.",
      postworkout: "After training, consume protein and carbohydrates within 30-60 minutes for optimal recovery.",
      timing: [
        "Eat breakfast within an hour of waking up",
        "Space meals every 3-4 hours",
        "Consume your last meal 2-3 hours before bedtime"
      ]
    },
    generatedAt: new Date().toISOString()
  };
}
