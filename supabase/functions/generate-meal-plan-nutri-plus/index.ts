
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY");
const LLAMA_API_URL = "https://api.llama-api.com";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { userData, selectedFoods, dietaryPreferences, foodsByMealType } = requestData;
    
    console.log("Generate Meal Plan Nutri+ Function - Request received");
    console.log("Using model: nous-hermes-2-mixtral-8x7b for advanced nutrition plan");
    
    // Create a detailed system prompt for the advanced nutrition plan
    const systemPrompt = `You are NutriPlus, an advanced nutritionist AI specialized in creating comprehensive, personalized meal plans.
You have expertise in nutrition science, dietary requirements, food combinations, and meal timing optimization.
Create a detailed, nutritionally balanced 7-day meal plan with optimal macronutrient distribution.

Your response must be valid JSON in the exact format specified below without any additional text:

{
  "mealPlan": {
    "userCalories": number,
    "weeklyPlan": {
      "monday": { 
        "dayName": "Monday", 
        "meals": {
          "breakfast": { "description": string, "foods": [{"name": string, "portion": number, "unit": string, "details": string}], "calories": number, "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number} },
          "morningSnack": { "description": string, "foods": [{"name": string, "portion": number, "unit": string, "details": string}], "calories": number, "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number} },
          "lunch": { "description": string, "foods": [{"name": string, "portion": number, "unit": string, "details": string}], "calories": number, "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number} },
          "afternoonSnack": { "description": string, "foods": [{"name": string, "portion": number, "unit": string, "details": string}], "calories": number, "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number} },
          "dinner": { "description": string, "foods": [{"name": string, "portion": number, "unit": string, "details": string}], "calories": number, "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number} }
        },
        "dailyTotals": { "calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number }
      },
      // Similar structure for tuesday, wednesday, thursday, friday, saturday, sunday
    },
    "weeklyTotals": {
      "averageCalories": number,
      "averageProtein": number,
      "averageCarbs": number,
      "averageFats": number,
      "averageFiber": number
    },
    "recommendations": {
      "general": string,
      "preworkout": string,
      "postworkout": string,
      "timing": [string]
    }
  }
}`;

    // Create a comprehensive user prompt with all nutrition details
    let userPrompt = `Create an advanced, personalized meal plan for a ${userData.age} year old ${userData.gender}, weighing ${userData.weight}kg, height ${userData.height}cm, with ${userData.activityLevel} activity level. The daily calorie target is ${userData.dailyCalories} calories with a goal to ${userData.goal}.`;
    
    // Add detailed dietary restrictions
    if (dietaryPreferences.hasAllergies && dietaryPreferences.allergies.length > 0) {
      userPrompt += ` The person has allergies to: ${dietaryPreferences.allergies.join(", ")}.`;
    }
    
    if (dietaryPreferences.dietaryRestrictions && dietaryPreferences.dietaryRestrictions.length > 0) {
      userPrompt += ` The person follows these dietary restrictions: ${dietaryPreferences.dietaryRestrictions.join(", ")}.`;
    }
    
    if (dietaryPreferences.trainingTime) {
      userPrompt += ` The person typically trains at: ${dietaryPreferences.trainingTime}.`;
    }
    
    // Add detailed food preferences with nutritional information
    userPrompt += ` Here are the foods the person likes to eat with their nutritional information:`;
    selectedFoods.forEach(food => {
      userPrompt += ` ${food.name} (${food.calories} calories, ${food.protein}g protein, ${food.carbs}g carbs, ${food.fats}g fats, ${food.fiber || 0}g fiber)`;
    });
    
    // Add food by meal type preferences if available
    if (foodsByMealType) {
      userPrompt += " The person prefers specific foods by meal type:";
      
      for (const [mealType, foods] of Object.entries(foodsByMealType)) {
        if (Array.isArray(foods) && foods.length > 0) {
          userPrompt += ` For ${mealType}: ${foods.map(f => f.name).join(", ")}.`;
        }
      }
    }
    
    userPrompt += ` Create a comprehensive, optimized 7-day meal plan with 5 meals per day that precisely meets the calorie target and offers optimal macronutrient distribution for the person's goal. Include exact portion sizes in grams and complete nutritional information for each meal. Provide specific recommendations for meal timing, especially around workout times, and include advanced nutritional guidance.`;
    
    console.log("Sending request to Llama API for NutriPlus plan");
    
    // Call the Llama API with the Nous-Hermes model
    const llamaResponse = await fetch(`${LLAMA_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: "nous-hermes-2-mixtral-8x7b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error("Llama API error:", errorText);
      throw new Error(`Llama API error: ${llamaResponse.status} - ${errorText}`);
    }

    const llamaData = await llamaResponse.json();
    console.log("Llama API response received for NutriPlus plan");
    
    // Extract the content from the response
    let mealPlanJson;
    try {
      const content = llamaData.choices[0].message.content;
      mealPlanJson = JSON.parse(content);
      console.log("Successfully parsed NutriPlus meal plan JSON");
    } catch (parseError) {
      console.error("Error parsing JSON from Llama response:", parseError);
      throw new Error("Invalid meal plan format in Llama response");
    }
    
    // Add user calories to the meal plan if not present
    if (mealPlanJson.mealPlan && !mealPlanJson.mealPlan.userCalories) {
      mealPlanJson.mealPlan.userCalories = userData.dailyCalories;
    }
    
    return new Response(JSON.stringify(mealPlanJson), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-meal-plan-nutri-plus function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
