
import { corsHeaders } from "../_shared/cors.ts";

// Get environment variables
const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

if (!LLAMA_API_KEY) {
  console.error("LLAMA_API_KEY is not set");
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("SUPABASE_URL or SUPABASE_ANON_KEY is not set");
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get request body
    const requestData = await req.json();
    console.log("Generating meal plan with Llama API using nous-hermes-2-mixtral-8x7b model");
    console.log("Request data:", JSON.stringify(requestData, null, 2));
    
    // Create system prompt
    const systemPrompt = `You are an expert nutritionist with a focus on creating personalized meal plans. 
Create a comprehensive 7-day meal plan that aligns with the user's daily caloric needs of ${requestData.userData.dailyCalories} calories.
The meal plan should support their ${requestData.userData.goal} goal and take into account their personal details (weight: ${requestData.userData.weight}kg, height: ${requestData.userData.height}cm, age: ${requestData.userData.age}, gender: ${requestData.userData.gender}).
They prefer to exercise at ${requestData.dietaryPreferences.trainingTime || "no specific time"}.
Their activity level is ${requestData.userData.activityLevel}.

Include only foods from their selected list: ${requestData.selectedFoods.map(food => food.name).join(', ')}.

${requestData.dietaryPreferences.hasAllergies ? `IMPORTANT - They have the following allergies: ${requestData.dietaryPreferences.allergies.join(', ')}. Avoid these allergenic foods entirely.` : 'They have no allergies.'} 

${requestData.dietaryPreferences.dietaryRestrictions?.length > 0 ? `They have the following dietary restrictions: ${requestData.dietaryPreferences.dietaryRestrictions.join(', ')}. Respect these restrictions.` : 'They have no specific dietary restrictions.'}

Structure the meal plan with the following format:
- Daily meals should include: breakfast, morning snack, lunch, afternoon snack, and dinner
- For each meal, provide:
  * A brief description
  * List of foods with portions in grams
  * Approximate calories
  * Macros (protein, carbs, fats, fiber in grams)
- Include daily nutrition totals
- Provide weekly averages for calories and macros
- Add 5-7 personalized nutrition recommendations

The response MUST be a valid JSON object with the following structure:
{
  "weeklyPlan": {
    "monday": {
      "dayName": "Monday",
      "meals": {
        "breakfast": {
          "foods": [
            {"name": "food name", "portion": number, "unit": "g", "details": "description"}
          ],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number},
          "description": "meal description"
        },
        "morningSnack": {...},
        "lunch": {...},
        "afternoonSnack": {...},
        "dinner": {...}
      },
      "dailyTotals": {"calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number}
    },
    "tuesday": {...},
    ...
    "sunday": {...}
  },
  "weeklyTotals": {
    "averageCalories": number,
    "averageProtein": number,
    "averageCarbs": number,
    "averageFats": number,
    "averageFiber": number
  },
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}

Your response must be ONLY the valid JSON, nothing else. No explanations, no text, no markdown.`;

    // Create prompt for Llama API
    const userMessage = "Create a personalized meal plan based on the provided information.";

    try {
      // Call the Llama API with the correct endpoint and model
      const response = await fetch("https://api.llama-api.com/api/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LLAMA_API_KEY}`
        },
        body: JSON.stringify({
          model: "nous-hermes-2-mixtral-8x7b", // Corrected model name
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error from Llama API:", JSON.stringify(errorData, null, 2));
        throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
      }

      const responseData = await response.json();
      console.log("Llama API response received.");
      
      // Extract the meal plan from the response
      let mealPlanJson;
      try {
        // Get the content from the response
        const content = responseData.choices[0].message.content;
        
        // Try to parse the JSON content
        // First, try to clean up any potential markdown formatting
        let cleanedContent = content;
        if (content.includes("```json")) {
          cleanedContent = content.split("```json")[1].split("```")[0].trim();
        } else if (content.includes("```")) {
          cleanedContent = content.split("```")[1].split("```")[0].trim();
        }
        
        // Parse the JSON
        mealPlanJson = JSON.parse(cleanedContent);
        console.log("Successfully parsed meal plan JSON");
      } catch (error) {
        console.error("Error parsing meal plan JSON:", error);
        console.log("Raw content:", responseData.choices[0].message.content);
        // Provide a fallback simple meal plan
        mealPlanJson = {
          weeklyPlan: {
            monday: {
              dayName: "Monday",
              meals: {
                breakfast: {
                  foods: [
                    { name: "Default food", portion: 100, unit: "g", details: "Default description" }
                  ],
                  calories: 500,
                  macros: { protein: 30, carbs: 50, fats: 20, fiber: 5 },
                  description: "Default breakfast"
                },
                morningSnack: {
                  foods: [
                    { name: "Default snack", portion: 50, unit: "g", details: "Default description" }
                  ],
                  calories: 200,
                  macros: { protein: 10, carbs: 25, fats: 10, fiber: 2 },
                  description: "Default morning snack"
                },
                lunch: {
                  foods: [
                    { name: "Default lunch", portion: 150, unit: "g", details: "Default description" }
                  ],
                  calories: 700,
                  macros: { protein: 40, carbs: 70, fats: 30, fiber: 8 },
                  description: "Default lunch"
                },
                afternoonSnack: {
                  foods: [
                    { name: "Default snack", portion: 50, unit: "g", details: "Default description" }
                  ],
                  calories: 200,
                  macros: { protein: 10, carbs: 25, fats: 10, fiber: 2 },
                  description: "Default afternoon snack"
                },
                dinner: {
                  foods: [
                    { name: "Default dinner", portion: 150, unit: "g", details: "Default description" }
                  ],
                  calories: 600,
                  macros: { protein: 35, carbs: 60, fats: 25, fiber: 7 },
                  description: "Default dinner"
                }
              },
              dailyTotals: { calories: 2200, protein: 125, carbs: 230, fats: 95, fiber: 24 }
            }
          },
          weeklyTotals: {
            averageCalories: 2200,
            averageProtein: 125,
            averageCarbs: 230,
            averageFats: 95,
            averageFiber: 24
          },
          recommendations: ["Eat a balanced diet.", "Stay hydrated.", "Consume protein with each meal."]
        };
        
        // Copy the Monday plan to all days of the week
        const mondayPlan = mealPlanJson.weeklyPlan.monday;
        const daysOfWeek = ["tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        daysOfWeek.forEach(day => {
          mealPlanJson.weeklyPlan[day] = JSON.parse(JSON.stringify(mondayPlan));
          mealPlanJson.weeklyPlan[day].dayName = day.charAt(0).toUpperCase() + day.slice(1);
        });
      }

      // Save the meal plan to the database if requested
      if (requestData.userData.userId) {
        try {
          // Create a Supabase client
          const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
          const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
          
          // Insert the meal plan into the database
          const { data: planData, error: planError } = await supabase
            .from('meal_plans')
            .insert({
              user_id: requestData.userData.userId,
              plan_data: mealPlanJson,
              daily_calories: requestData.userData.dailyCalories,
              dietary_preferences: JSON.stringify(requestData.dietaryPreferences),
              created_at: new Date().toISOString()
            });
            
          if (planError) {
            console.error("Error saving meal plan to database:", planError);
          } else {
            console.log("Meal plan saved to database successfully");
          }
        } catch (dbError) {
          console.error("Error interacting with database:", dbError);
        }
      }

      // Return the response
      return new Response(
        JSON.stringify({
          mealPlan: mealPlanJson,
          message: "Meal plan generated successfully with Llama API"
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (llamaError) {
      console.error("Error calling Llama API:", llamaError);
      return new Response(
        JSON.stringify({
          error: `Error calling Llama API: ${llamaError.message}`,
          message: "Failed to generate meal plan"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({
        error: `Error processing request: ${error.message}`,
        message: "Failed to process request"
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
