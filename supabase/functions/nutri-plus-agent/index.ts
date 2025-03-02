
// nutri-plus-agent: Uses Groq API to analyze user data and generate personalized meal plans
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log start of process with timestamp
    const startTime = new Date().toISOString();
    console.log(`[NUTRI+] Processing started at ${startTime}`);

    // Parse the request body
    const requestData = await req.json();
    
    // Validate request data
    if (!requestData || !requestData.userData) {
      console.error("[NUTRI+] Error: Invalid request data - missing userData");
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = requestData;
    console.log(`[NUTRI+] Received data for user: ${userData.id || 'anonymous'}`);
    console.log(`[NUTRI+] User profile: ${userData.age}yo, ${userData.gender}, ${userData.weight}kg, ${userData.height}cm`);
    console.log(`[NUTRI+] Goal: ${userData.goal}, Daily calories: ${userData.dailyCalories}kcal`);
    console.log(`[NUTRI+] Selected foods count: ${selectedFoods?.length || 0}`);
    
    if (!selectedFoods || selectedFoods.length === 0) {
      console.error("[NUTRI+] Error: No foods selected");
      return new Response(
        JSON.stringify({ error: "No foods selected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if GROQ API key is available
    if (!GROQ_API_KEY) {
      console.error("[NUTRI+] Error: GROQ_API_KEY not found in environment variables");
      return new Response(
        JSON.stringify({ error: "API configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Prepare system message for Nutri+ agent
    const systemMessage = `You are Nutri+, an expert nutrition agent specializing in creating personalized meal plans. 
Your task is to analyze the user data and create a detailed, scientifically-sound weekly meal plan.

IMPORTANT OUTPUT FORMAT RULES:
1. Your response MUST be valid JSON that can be parsed with JSON.parse().
2. Your response should be ONLY the JSON object with no explanation, narrative, or additional text.
3. The output must follow this exact structure:
{
  "mealPlan": {
    "weeklyPlan": {
      "monday": { /* day plan structure */ },
      "tuesday": { /* day plan structure */ },
      /* ... other days ... */
    },
    "weeklyTotals": { /* weekly nutrition averages */ },
    "recommendations": { /* personalized recommendations */ }
  }
}

Make sure the weeklyPlan contains ALL 7 days (monday through sunday). Each day must have the following structure:
{
  "dayName": "Day Name",
  "meals": {
    "breakfast": {
      "description": "Breakfast description",
      "foods": [{"name": "Food name", "portion": 100, "unit": "g", "details": "Details about the food"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    /* other meals: morningSnack, lunch, afternoonSnack, dinner */
  },
  "dailyTotals": {"calories": 2000, "protein": 120, "carbs": 180, "fats": 60, "fiber": 25}
}

Recommendations should include:
{
  "general": "General nutrition advice",
  "preworkout": "Pre-workout nutrition advice",
  "postworkout": "Post-workout nutrition advice",
  "timing": ["Specific meal timing advice", "Another timing advice"]
}`;

    // Construct user message with all relevant data
    const userMessage = `Create a personalized weekly meal plan based on this data:

USER PROFILE:
- Age: ${userData.age}
- Gender: ${userData.gender}
- Weight: ${userData.weight}kg
- Height: ${userData.height}cm
- Activity Level: ${userData.activityLevel}
- Goal: ${userData.goal}
- Daily Calorie Target: ${userData.dailyCalories}kcal

DIETARY PREFERENCES:
${dietaryPreferences.hasAllergies ? `- Allergies: ${dietaryPreferences.allergies.join(', ')}` : '- No known allergies'}
${dietaryPreferences.dietaryRestrictions ? `- Dietary Restrictions: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : '- No dietary restrictions'}
${dietaryPreferences.trainingTime ? `- Training Time: ${dietaryPreferences.trainingTime}` : '- No specific training time'}

AVAILABLE FOODS (${selectedFoods.length} total):
${selectedFoods.map(food => `- ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, F:${food.fats}g)`).join('\n').substring(0, 1500)}

${foodsByMealType ? `FOODS CATEGORIZED BY MEAL:
${Object.entries(foodsByMealType).map(([mealType, foods]) => 
  `- ${mealType}: ${Array.isArray(foods) ? foods.length : 0} foods`
).join('\n')}` : ''}

Please create a 7-day meal plan that:
1. Meets the daily calorie target with proper macronutrient distribution
2. Uses the available foods provided
3. Respects dietary preferences and restrictions
4. Provides variety across the week
5. Includes all required meal types: breakfast, morningSnack, lunch, afternoonSnack, dinner
6. Accurately calculates calories and macros for each meal and day`;

    // Track time for API call preparation
    console.log(`[NUTRI+] Preparing API call at ${new Date().toISOString()}`);

    // Prepare the API call to Groq
    const groqPayload = {
      model: "llama3-8b-8192", // Using Llama3 8B model
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.3, // Lower temperature for more consistent output
      max_tokens: 7000, // Allow enough tokens for a full meal plan
      top_p: 0.9,
      response_format: { type: "json_object" } // Request JSON format response
    };

    console.log(`[NUTRI+] Calling Groq API with model: ${groqPayload.model}`);

    // Call the Groq API
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(groqPayload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[NUTRI+] Groq API error (${response.status}):`, errorData);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}`, details: errorData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Get the API response
    const apiResponse = await response.json();
    console.log(`[NUTRI+] Received response from Groq API at ${new Date().toISOString()}`);
    
    // Check for valid response content
    if (!apiResponse.choices || !apiResponse.choices[0] || !apiResponse.choices[0].message) {
      console.error("[NUTRI+] Invalid API response format:", JSON.stringify(apiResponse).substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Invalid API response format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Get the model's response content
    const mealPlanContent = apiResponse.choices[0].message.content;
    
    // Ensure the response is valid JSON
    try {
      // Parse and validate the JSON response
      const mealPlanJson = JSON.parse(mealPlanContent);
      
      // Validate the structure
      if (!mealPlanJson.mealPlan || !mealPlanJson.mealPlan.weeklyPlan) {
        console.error("[NUTRI+] API response missing required structure. Response:", mealPlanContent.substring(0, 500));
        return new Response(
          JSON.stringify({ error: "Invalid meal plan structure" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Complete meal plan with the latest data
      const mealPlan = {
        ...mealPlanJson.mealPlan,
        userCalories: userData.dailyCalories,
        generatedBy: "nutri-plus-agent-llama3"
      };
      
      console.log(`[NUTRI+] Successfully generated meal plan at ${new Date().toISOString()}`);
      console.log(`[NUTRI+] Process duration: ${(new Date().getTime() - new Date(startTime).getTime()) / 1000}s`);
      
      // Return the successful response
      return new Response(
        JSON.stringify({ mealPlan }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (jsonError) {
      // If the response is not valid JSON, log the error and return error response
      console.error("[NUTRI+] JSON parsing error:", jsonError);
      console.error("[NUTRI+] Invalid JSON response:", mealPlanContent.substring(0, 1000));
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse meal plan JSON",
          details: jsonError.message,
          rawContent: mealPlanContent.substring(0, 500) + "..." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
  } catch (error) {
    // Handle any unexpected errors
    console.error("[NUTRI+] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
