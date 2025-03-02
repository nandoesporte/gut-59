
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { ...corsHeaders },
      status: 204,
    });
  }

  try {
    // Parse request body
    const requestData = await req.json();
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = requestData;

    if (!userData || !selectedFoods) {
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    console.log("Generating meal plan for user:", userData.userId);
    console.log("Using Llama API for meal plan generation");

    // Prepare prompt for the Llama model
    const systemPrompt = `
      You are a professional nutritionist AI specialized in creating personalized meal plans.
      Create a detailed weekly meal plan based on the user's requirements.
      Include calories and macros (protein, carbs, fats, fiber) for each meal and daily totals.
      Use only the foods provided in the selectedFoods list.
      Format your response as a valid, clean JSON object without any explanations or markdown.
    `;

    // Create user prompt with all the details
    const userPrompt = `
      Create a 7-day meal plan for a person with these characteristics:
      - Weight: ${userData.weight}kg
      - Height: ${userData.height}cm
      - Age: ${userData.age}
      - Gender: ${userData.gender}
      - Activity level: ${userData.activityLevel}
      - Goal: ${userData.goal}
      - Daily calorie target: ${userData.dailyCalories} calories

      ${dietaryPreferences?.hasAllergies ? 
        `Allergies: ${dietaryPreferences.allergies?.join(", ")}` : 
        "No allergies"}
      ${dietaryPreferences?.dietaryRestrictions?.length > 0 ? 
        `Dietary restrictions: ${dietaryPreferences.dietaryRestrictions.join(", ")}` : 
        "No dietary restrictions"}
      ${dietaryPreferences?.trainingTime ? 
        `Training time: ${dietaryPreferences.trainingTime}` : 
        "No specific training time"}

      Available foods (use ONLY these foods):
      ${JSON.stringify(selectedFoods, null, 2)}

      Create a JSON object with this structure:
      {
        "weeklyPlan": {
          "monday": {
            "dayName": "Monday",
            "meals": {
              "breakfast": {
                "foods": [
                  {"name": "Food Name", "portion": 100, "unit": "g", "details": "Additional information"}
                ],
                "calories": 500,
                "macros": {"protein": 30, "carbs": 40, "fats": 20, "fiber": 5}
              },
              "morningSnack": {...},
              "lunch": {...},
              "afternoonSnack": {...},
              "dinner": {...}
            },
            "dailyTotals": {"calories": 2000, "protein": 120, "carbs": 180, "fats": 70, "fiber": 25}
          },
          "tuesday": {...},
          ...
          "sunday": {...}
        },
        "weeklyTotals": {
          "averageCalories": 2000,
          "averageProtein": 120,
          "averageCarbs": 180,
          "averageFats": 70,
          "averageFiber": 25
        },
        "recommendations": {
          "general": "General nutrition advice",
          "preworkout": "Pre-workout meal advice",
          "postworkout": "Post-workout meal advice",
          "timing": ["Meal timing tip 1", "Meal timing tip 2"]
        }
      }

      IMPORTANT: Return ONLY the JSON object, without any explanations, code blocks, or additional text.
    `;

    // Call the Llama API via our edge function
    console.log("Calling Llama API via edge function...");
    const { data: llamaResponse, error: llamaError } = await supabase.functions.invoke(
      "llama-edge",
      {
        body: {
          prompt: userPrompt,
          model: "nous-hermes-2-mixtral-8x7b",
          maxTokens: 4000,
          temperature: 0.7
        }
      }
    );

    if (llamaError) {
      console.error("Error calling Llama API:", llamaError);
      throw new Error(`Failed to generate meal plan: ${llamaError.message}`);
    }

    if (!llamaResponse || !llamaResponse.choices || llamaResponse.choices.length === 0) {
      console.error("Invalid response from Llama API:", llamaResponse);
      throw new Error("Failed to generate meal plan: Invalid response");
    }

    // Extract and parse the response
    const responseText = llamaResponse.choices[0].message.content.trim();
    console.log("Llama API response (preview):", responseText.substring(0, 500) + "...");

    // Try to extract JSON from the response
    let mealPlanJson;
    try {
      // Try to extract JSON if it's wrapped in code blocks or has extra text
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```([\s\S]*?)```/) ||
                        responseText.match(/\{[\s\S]*\}/);
                        
      const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json\n|```/g, '') : responseText;
      mealPlanJson = JSON.parse(jsonStr);
    } catch (jsonError) {
      console.error("Error parsing JSON from Llama response:", jsonError);
      console.log("Response that failed to parse:", responseText);
      throw new Error("Failed to parse meal plan data");
    }

    // Save the meal plan to the database if needed
    if (userData.userId) {
      try {
        const { error: saveError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userData.userId,
            plan_data: mealPlanJson,
            daily_calories: userData.dailyCalories,
            dietary_preferences: dietaryPreferences ? JSON.stringify(dietaryPreferences) : null,
            created_at: new Date().toISOString()
          });

        if (saveError) {
          console.error("Error saving meal plan to database:", saveError);
          // Continue even if save fails
        } else {
          console.log("Meal plan saved to database for user:", userData.userId);
        }
      } catch (dbError) {
        console.error("Error during database save:", dbError);
        // Continue even if save fails
      }
    }

    // Return the meal plan
    return new Response(
      JSON.stringify({ mealPlan: mealPlanJson }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    console.error("Error generating meal plan:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate meal plan",
        details: error.message
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
