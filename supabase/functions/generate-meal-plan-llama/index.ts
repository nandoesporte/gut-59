
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY") || "0aaa32ca-d683-49b4-ad9c-e38752b6f0df";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

interface QueryResponse {
  id: string;
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  try {
    const requestData = await req.json();
    console.log("Received request data:", JSON.stringify(requestData, null, 2));

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Prepare structured prompt for the AI
    const {
      userData,
      selectedFoods,
      foodsByMealType,
      dietaryPreferences,
      modelConfig
    } = requestData;

    // Build comprehensive system prompt
    const systemPrompt = `You are a professional nutritionist and meal planner specializing in creating personalized meal plans.
Your task is to create a detailed 7-day meal plan using only the foods provided. 
The meal plan should be tailored to the person's specific needs and preferences.

USER INFORMATION:
- Gender: ${userData.gender}
- Age: ${userData.age}
- Weight: ${userData.weight} kg
- Height: ${userData.height} cm
- Activity level: ${userData.activityLevel}
- Goal: ${userData.goal}
- Daily calorie target: ${userData.dailyCalories} calories

SELECTED FOODS: 
${JSON.stringify(selectedFoods, null, 2)}

${foodsByMealType ? `FOODS BY MEAL TYPE:
${JSON.stringify(foodsByMealType, null, 2)}` : ''}

${dietaryPreferences ? `DIETARY PREFERENCES:
${JSON.stringify(dietaryPreferences, null, 2)}` : ''}

IMPORTANT GUIDELINES:
1. ONLY include foods from the provided list.
2. Maintain balanced macronutrients suitable for the user's goal.
3. Suggest appropriate portion sizes in grams.
4. Create a 7-day plan with 5 meals per day: breakfast, morning snack, lunch, afternoon snack, and dinner.
5. Ensure the total daily calories approximate the user's calorie target.
6. Add brief descriptions for each meal explaining its nutritional benefits.
7. Include macronutrient breakdowns (protein, carbs, fats) for each meal.
8. Calculate daily totals for calories and macronutrients.
9. Add weekly nutrition recommendations.

YOUR RESPONSE MUST BE A VALID JSON OBJECT following this structure:

{
  "mealPlan": {
    "userId": "${userData.userId}",
    "dailyCalories": ${userData.dailyCalories},
    "goal": "${userData.goal}",
    "weeklyPlan": {
      "monday": {
        "dayName": "Monday",
        "meals": {
          "breakfast": {
            "foods": [{"name": "food name", "portion": 100, "unit": "g", "details": "Short description"}],
            "calories": 500,
            "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5},
            "description": "Brief description of this meal"
          },
          "morningSnack": {...},
          "lunch": {...},
          "afternoonSnack": {...},
          "dinner": {...}
        },
        "dailyTotals": {"calories": 2000, "protein": 150, "carbs": 200, "fats": 70, "fiber": 25}
      },
      "tuesday": {...},
      "wednesday": {...},
      "thursday": {...},
      "friday": {...},
      "saturday": {...},
      "sunday": {...}
    },
    "weeklyTotals": {
      "averageCalories": 2000,
      "averageProtein": 150,
      "averageCarbs": 200,
      "averageFats": 70,
      "averageFiber": 25
    },
    "recommendations": [
      "Drink at least 2L of water daily.",
      "Other recommendations..."
    ],
    "generatedAt": "${new Date().toISOString()}"
  }
}

Do not include any text before or after the JSON object. Ensure the output is properly formatted JSON.`;

    // Build user prompt with specific dietary requests
    const userPrompt = `Please create a personalized 7-day meal plan for me with the provided information. 
${dietaryPreferences?.hasAllergies ? `I have allergies to: ${dietaryPreferences.allergies?.join(', ')}` : ''} 
${dietaryPreferences?.dietaryRestrictions?.length ? `My dietary restrictions are: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : ''}
${dietaryPreferences?.trainingTime ? `I typically train at: ${dietaryPreferences.trainingTime}` : ''}
Please optimize my meal plan for my ${userData.goal} goal while ensuring nutrition is balanced.`;

    console.log("System prompt:", systemPrompt);
    console.log("User prompt:", userPrompt);

    // API call to Llama endpoint
    const llamaEndpoint = "https://api.llama-api.com/chat";
    console.log(`Calling Llama API at ${llamaEndpoint} with API key: ${LLAMA_API_KEY.substring(0, 5)}...`);

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`,
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model: "nous-hermes-2-mixtral-8x7b-dpo",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        stream: false,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    };

    console.log("Request options:", JSON.stringify(requestOptions, null, 2));

    const response = await fetch(llamaEndpoint, requestOptions);
    console.log("API Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`Failed to generate meal plan: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("API Response:", JSON.stringify(result, null, 2));

    // Process the response
    let mealPlanData;

    try {
      // Extract content from the completion
      const content = result.choices[0].message.content;
      console.log("Extracted content:", content);

      // Try to parse the JSON response
      try {
        // Handle potential JSON within markdown code blocks
        let jsonString = content;
        
        // If content is wrapped in markdown code blocks, extract just the JSON
        const jsonMatch = content.match(/```(?:json)?([\s\S]+?)```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonString = jsonMatch[1].trim();
        }
        
        mealPlanData = JSON.parse(jsonString);
        console.log("Successfully parsed JSON from response");
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        
        // Attempt to extract just the JSON part
        const jsonRegex = /\{[\s\S]*"mealPlan"[\s\S]*\}/;
        const match = content.match(jsonRegex);
        
        if (match) {
          try {
            mealPlanData = JSON.parse(match[0]);
            console.log("Successfully parsed JSON using regex extraction");
          } catch (secondParseError) {
            console.error("Failed second JSON parse attempt:", secondParseError);
            throw new Error("Unable to parse meal plan data from AI response");
          }
        } else {
          throw new Error("Could not find valid JSON in the AI response");
        }
      }
    } catch (processingError) {
      console.error("Error processing AI response:", processingError);
      throw new Error(`Failed to process meal plan data: ${processingError.message}`);
    }

    // Validate the meal plan data
    if (!mealPlanData || !mealPlanData.mealPlan) {
      console.error("Invalid meal plan data structure", mealPlanData);
      throw new Error("AI generated an invalid meal plan format");
    }

    console.log("Final meal plan data:", JSON.stringify(mealPlanData, null, 2));

    // Insert the meal plan into the database
    try {
      const { error: insertError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.userId,
          plan_data: mealPlanData.mealPlan,
          daily_calories: userData.dailyCalories,
          dietary_preferences: dietaryPreferences ? JSON.stringify(dietaryPreferences) : null,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("Error inserting meal plan:", insertError);
        // Continue even if database insert fails
      } else {
        console.log("Meal plan successfully saved to database");
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      // Continue even if database operation fails
    }

    return new Response(JSON.stringify({ data: mealPlanData }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error("Error generating meal plan:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate meal plan",
        details: error.message,
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
});
