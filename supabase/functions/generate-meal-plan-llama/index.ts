
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Llama API key and base URL
const LLAMA_API_KEY = "0aaa32ca-d683-49b4-ad9c-e38752b6f0df";
const LLAMA_API_URL = "https://api.llama-api.com";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log("[LLAMA] Function started");
  const startTime = Date.now();
  
  try {
    // Parse request body
    const requestData = await req.json();
    console.log("[LLAMA] Request received:", JSON.stringify({
      userId: requestData.userData?.userId,
      model: requestData.modelConfig?.model,
      provider: requestData.modelConfig?.provider,
      goal: requestData.userData?.goal,
      calories: requestData.userData?.dailyCalories,
      selectedFoodsCount: requestData.selectedFoods?.length
    }));
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Format the prompt for meal plan generation
    const prompt = generatePrompt(requestData);
    console.log("[LLAMA] Prompt generated, length:", prompt.length);
    
    // Default model if not specified
    const model = requestData.modelConfig?.model || "nous-hermes-2-mixtral-8x7b";
    console.log("[LLAMA] Using model:", model);
    
    // Call Llama API
    const llamaResponse = await callLlamaAPI(prompt, model);
    console.log("[LLAMA] API response received, processing...");
    
    // Process and format the response
    const mealPlan = processMealPlanResponse(llamaResponse, requestData);
    
    // Return the meal plan
    const responseTime = Date.now() - startTime;
    console.log(`[LLAMA] Request completed in ${responseTime}ms`);
    
    return new Response(
      JSON.stringify({ mealPlan }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("[LLAMA] Error:", error.message);
    console.error("[LLAMA] Stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
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

async function callLlamaAPI(prompt: string, model: string): Promise<any> {
  console.log(`[LLAMA] Calling API with model: ${model}`);
  
  try {
    // Set timeout to 90 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    
    const response = await fetch(`${LLAMA_API_URL}/v1/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.95,
        stream: false,
        stop: ["</MEAL_PLAN>"]
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LLAMA] API error: ${response.status}`, errorText);
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("[LLAMA] API response status:", response.status);
    console.log("[LLAMA] API response length:", JSON.stringify(data).length);
    
    return data;
  } catch (error) {
    console.error("[LLAMA] API call error:", error.message);
    if (error.name === "AbortError") {
      throw new Error("API request timed out after 90 seconds");
    }
    throw error;
  }
}

function generatePrompt(requestData: any): string {
  const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = requestData;
  
  let prompt = `
<INSTRUCTION>
You are a professional nutritionist specialized in creating personalized meal plans. Create a 7-day meal plan based on the following information:

User Profile:
- Gender: ${userData.gender}
- Age: ${userData.age} years
- Weight: ${userData.weight} kg
- Height: ${userData.height} cm
- Activity Level: ${userData.activityLevel}
- Goal: ${userData.goal}
- Daily Calorie Target: ${userData.dailyCalories} calories

Dietary Preferences:`;

  if (dietaryPreferences?.hasAllergies && dietaryPreferences.allergies?.length > 0) {
    prompt += `\n- Allergies: ${dietaryPreferences.allergies.join(', ')}`;
  }
  
  if (dietaryPreferences?.dietaryRestrictions?.length > 0) {
    prompt += `\n- Restrictions: ${dietaryPreferences.dietaryRestrictions.join(', ')}`;
  }
  
  if (dietaryPreferences?.trainingTime) {
    prompt += `\n- Training Time: ${dietaryPreferences.trainingTime}`;
  }
  
  prompt += `\n\nAvailable Foods (${selectedFoods.length} total):`;
  
  // Add selected foods organized by meal types if available
  if (foodsByMealType && Object.keys(foodsByMealType).length > 0) {
    prompt += "\nFoods organized by meal types:";
    
    for (const [mealType, foods] of Object.entries(foodsByMealType)) {
      if (foods.length > 0) {
        prompt += `\n${mealType.charAt(0).toUpperCase() + mealType.slice(1)}:`;
        foods.slice(0, 10).forEach((food: any) => {
          prompt += `\n- ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, F:${food.fats}g)`;
        });
        if (foods.length > 10) {
          prompt += `\n- And ${foods.length - 10} more foods...`;
        }
      }
    }
  } else {
    // Add all selected foods if not organized by meal type
    selectedFoods.slice(0, 15).forEach((food: any) => {
      prompt += `\n- ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, F:${food.fats}g)`;
    });
    if (selectedFoods.length > 15) {
      prompt += `\n- And ${selectedFoods.length - 15} more foods...`;
    }
  }
  
  prompt += `\n
Create a complete meal plan with the following structure:
1. Weekly meal plan for all 7 days of the week (Monday through Sunday)
2. Each day should include: breakfast, morning snack, lunch, afternoon snack, and dinner
3. For each meal, include:
   - A short description of the meal
   - List of foods with portions in grams or ml
   - Nutritional information (calories, protein, carbs, fats, fiber)
4. Daily nutritional totals for each day
5. Weekly averages for calories, protein, carbs, fats, and fiber
6. Include personalized recommendations for:
   - General nutrition advice
   - Pre-workout nutrition
   - Post-workout nutrition
   - Meal timing recommendations

Output in JSON format with this structure:
{
  "weeklyPlan": {
    "monday": {
      "dayName": "Monday",
      "meals": {
        "breakfast": {
          "description": "string",
          "foods": [
            { "name": "string", "portion": number, "unit": "string", "details": "string" }
          ],
          "calories": number,
          "macros": { "protein": number, "carbs": number, "fats": number, "fiber": number }
        },
        "morningSnack": { ... },
        "lunch": { ... },
        "afternoonSnack": { ... },
        "dinner": { ... }
      },
      "dailyTotals": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number,
        "fiber": number
      }
    },
    "tuesday": { ... },
    ...
    "sunday": { ... }
  },
  "weeklyTotals": {
    "averageCalories": number,
    "averageProtein": number,
    "averageCarbs": number,
    "averageFats": number,
    "averageFiber": number
  },
  "recommendations": {
    "general": "string",
    "preworkout": "string",
    "postworkout": "string",
    "timing": ["string"]
  }
}

Ensure:
1. All calculations are accurate (daily totals match the sum of meal nutrients)
2. Meal plans meet the daily calorie target (${userData.dailyCalories} calories)
3. Protein intake is appropriate for the user's goal (${userData.goal})
4. Meals include primarily foods from the available foods list
5. Format the response as valid JSON
</INSTRUCTION>

<MEAL_PLAN>`;

  return prompt;
}

function processMealPlanResponse(response: any, requestData: any): any {
  try {
    console.log("[LLAMA] Processing API response");
    
    // Extract the generated text from the API response
    let generatedText = "";
    if (response.choices && response.choices.length > 0) {
      generatedText = response.choices[0].text || "";
    } else if (response.generations && response.generations.length > 0) {
      generatedText = response.generations[0].text || "";
    } else {
      generatedText = response.generation || response.output || "";
    }
    
    console.log(`[LLAMA] Generated text length: ${generatedText.length}`);
    
    // Try to extract JSON from the response text
    let mealPlanJson = extractJsonFromText(generatedText);
    
    if (!mealPlanJson || !mealPlanJson.weeklyPlan) {
      console.warn("[LLAMA] Invalid or incomplete meal plan structure, trying to fix");
      mealPlanJson = repairMealPlanStructure(generatedText, requestData);
    }
    
    // Add user ID and generated timestamp
    mealPlanJson.userId = requestData.userData.userId;
    mealPlanJson.generatedAt = new Date().toISOString();
    
    return mealPlanJson;
  } catch (error) {
    console.error("[LLAMA] Error processing response:", error);
    throw new Error(`Failed to process meal plan: ${error.message}`);
  }
}

function extractJsonFromText(text: string): any {
  console.log("[LLAMA] Extracting JSON from text");
  
  try {
    // Try to find JSON object in the text
    const jsonRegex = /{[\s\S]*}/;
    const match = text.match(jsonRegex);
    
    if (match && match[0]) {
      console.log("[LLAMA] JSON pattern found, trying to parse");
      return JSON.parse(match[0]);
    }
    
    console.warn("[LLAMA] No JSON pattern found in text");
    return null;
  } catch (error) {
    console.error("[LLAMA] JSON extraction error:", error.message);
    return null;
  }
}

function repairMealPlanStructure(text: string, requestData: any): any {
  console.log("[LLAMA] Attempting to repair meal plan structure");
  
  // Create a basic meal plan structure
  const basicMealPlan = {
    weeklyPlan: {
      monday: createBasicDay("Monday", requestData),
      tuesday: createBasicDay("Tuesday", requestData),
      wednesday: createBasicDay("Wednesday", requestData),
      thursday: createBasicDay("Thursday", requestData),
      friday: createBasicDay("Friday", requestData),
      saturday: createBasicDay("Saturday", requestData),
      sunday: createBasicDay("Sunday", requestData)
    },
    weeklyTotals: {
      averageCalories: Math.round(requestData.userData.dailyCalories),
      averageProtein: Math.round(requestData.userData.dailyCalories * 0.3 / 4),
      averageCarbs: Math.round(requestData.userData.dailyCalories * 0.45 / 4),
      averageFats: Math.round(requestData.userData.dailyCalories * 0.25 / 9),
      averageFiber: Math.round(30)
    },
    recommendations: {
      general: "Focus on whole foods and maintain adequate hydration throughout the day.",
      preworkout: "Consume a balanced meal with complex carbs and protein 1-2 hours before training.",
      postworkout: "Consume protein and carbs within 30-45 minutes after training to support recovery.",
      timing: [
        "Space meals 3-4 hours apart",
        "Stay hydrated by drinking water regularly",
        "Avoid heavy meals before bedtime"
      ]
    }
  };
  
  console.log("[LLAMA] Basic meal plan structure created");
  return basicMealPlan;
}

function createBasicDay(dayName: string, requestData: any): any {
  const dailyCalories = requestData.userData.dailyCalories || 2000;
  
  // Create a basic day structure
  return {
    dayName: dayName,
    meals: {
      breakfast: createBasicMeal("Breakfast", dailyCalories * 0.25),
      morningSnack: createBasicMeal("Morning Snack", dailyCalories * 0.1),
      lunch: createBasicMeal("Lunch", dailyCalories * 0.35),
      afternoonSnack: createBasicMeal("Afternoon Snack", dailyCalories * 0.1),
      dinner: createBasicMeal("Dinner", dailyCalories * 0.2)
    },
    dailyTotals: {
      calories: dailyCalories,
      protein: Math.round(dailyCalories * 0.3 / 4),
      carbs: Math.round(dailyCalories * 0.45 / 4),
      fats: Math.round(dailyCalories * 0.25 / 9),
      fiber: 30
    }
  };
}

function createBasicMeal(mealType: string, calories: number): any {
  const protein = Math.round(calories * 0.3 / 4);
  const carbs = Math.round(calories * 0.45 / 4);
  const fats = Math.round(calories * 0.25 / 9);
  
  return {
    description: `Balanced ${mealType.toLowerCase()} with approximately ${Math.round(calories)} calories`,
    foods: [
      {
        name: "Example food item",
        portion: 100,
        unit: "g",
        details: "Rich in nutrients and balanced macros"
      }
    ],
    calories: Math.round(calories),
    macros: {
      protein: protein,
      carbs: carbs,
      fats: fats,
      fiber: Math.round(calories / 100)
    }
  };
}
