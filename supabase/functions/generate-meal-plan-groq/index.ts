
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Groq API endpoint
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

// Function to create a system prompt based on user data and preferences
function createSystemPrompt(userData: any, selectedFoods: any[], foodsByMealType: any, dietaryPreferences: any) {
  const { weight, height, age, gender, activityLevel, goal, dailyCalories } = userData;
  
  return `You are an expert nutritionist and meal planner AI. Your task is to create a detailed, personalized 7-day meal plan based on the following information:

USER PROFILE:
- Weight: ${weight} kg
- Height: ${height} cm
- Age: ${age} years
- Gender: ${gender}
- Activity Level: ${activityLevel}
- Goal: ${goal}
- Daily Caloric Needs: ${dailyCalories} calories

DIETARY PREFERENCES:
- Allergies: ${dietaryPreferences.hasAllergies ? dietaryPreferences.allergies.join(", ") : "None"}
- Restrictions: ${dietaryPreferences.dietaryRestrictions.length > 0 ? dietaryPreferences.dietaryRestrictions.join(", ") : "None"}
- Training Time: ${dietaryPreferences.trainingTime || "Not specified"}

AVAILABLE FOODS:
The user has selected specific foods they prefer to include in their meal plan. I'll provide these foods categorized by meal type.

Your response should follow a strict JSON structure that includes:
1. A weekly meal plan with days of the week as keys (monday, tuesday, etc.)
2. Each day should include meals (breakfast, morningSnack, lunch, afternoonSnack, dinner)
3. Each meal should have foods (array of objects with name, portion, unit), calories, macros (protein, carbs, fats, fiber), and a description
4. For each day, include dailyTotals (calories, protein, carbs, fats, fiber)
5. Include weeklyTotals (averageCalories, averageProtein, averageCarbs, averageFats, averageFiber)
6. Include nutritional recommendations (general, preworkout, postworkout, timing)

Focus on creating realistic, tasty meals using the provided foods. Balance macronutrients according to the user's goals.`;
}

// Process the meal plan response from Groq
function processMealPlanResponse(responseText: string) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                      responseText.match(/```\n([\s\S]*?)\n```/) ||
                      responseText.match(/{[\s\S]*}/);
    
    let jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    // Clean up the JSON string if it starts with ```json or ``` and ends with ```
    if (jsonStr.startsWith('```json\n')) {
      jsonStr = jsonStr.replace(/```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```\n')) {
      jsonStr = jsonStr.replace(/```\n/, '').replace(/\n```$/, '');
    }
    
    // Parse the JSON
    let mealPlan = JSON.parse(jsonStr);
    
    // Ensure the meal plan has the expected structure
    if (!mealPlan.weeklyPlan) {
      throw new Error("Response does not have the expected 'weeklyPlan' structure");
    }
    
    return mealPlan;
  } catch (error) {
    console.error("Error processing meal plan response:", error);
    throw new Error(`Failed to process meal plan: ${error.message}`);
  }
}

// Construct example meals for the prompt
function constructExampleMeals(foodsByMealType: any) {
  let exampleMeals = "";
  
  for (const [mealType, foods] of Object.entries(foodsByMealType)) {
    exampleMeals += `\n${mealType.toUpperCase()}:\n`;
    if (Array.isArray(foods) && foods.length > 0) {
      foods.slice(0, 5).forEach((food: any) => {
        exampleMeals += `- ${food.name} (${food.calories || '?'} kcal per ${food.portion || 100}${food.portionUnit || 'g'})\n`;
      });
    } else {
      exampleMeals += "No specific foods selected for this meal.\n";
    }
  }
  
  return exampleMeals;
}

// Main function to generate a meal plan
async function generateMealPlan(userData: any, selectedFoods: any[], foodsByMealType: any, dietaryPreferences: any) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set. Please configure this environment variable.");
  }

  const systemPrompt = createSystemPrompt(userData, selectedFoods, foodsByMealType, dietaryPreferences);
  
  // Create an example meals string from foodsByMealType
  const exampleMeals = constructExampleMeals(foodsByMealType);
  
  const userPrompt = `Based on my dietary preferences and selected foods, please create a 7-day meal plan.

My selected foods by meal type are:
${exampleMeals}

Please make sure to:
1. Use ONLY the foods I've selected for each meal type
2. Meet my daily caloric target of ${userData.dailyCalories} calories
3. Balance macronutrients appropriately for my ${userData.goal} goal
4. Provide variety throughout the week
5. Include detailed information for each meal (foods, portions, calories, macros)
6. Return ONLY the JSON structure without any additional explanation

Response format should strictly follow JSON with this structure:
{
  "weeklyPlan": {
    "monday": {
      "dayName": "Monday",
      "meals": {
        "breakfast": { "foods": [...], "calories": 500, "macros": {...}, "description": "..." },
        ...
      },
      "dailyTotals": { "calories": 2000, "protein": 150, "carbs": 200, "fats": 70, "fiber": 30 }
    },
    ...
  },
  "weeklyTotals": { ... },
  "recommendations": { ... }
}`;

  console.log("Sending request to Groq API...");
  
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192", // Using Llama 3 8B model for balanced performance and cost
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2, // Lower temperature for more consistent results
      max_tokens: 4000, // Generous token limit for detailed meal plans
      top_p: 0.95,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Groq API error:", errorData);
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const generatedContent = data.choices[0].message.content;
  
  console.log("Received response from Groq API");
  
  try {
    // Process the response into a structured meal plan
    const mealPlan = processMealPlanResponse(generatedContent);
    return { mealPlan };
  } catch (error) {
    console.error("Error processing meal plan:", error);
    throw new Error(`Failed to generate meal plan: ${error.message}`);
  }
}

// Main serve function for the Edge Function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = await req.json();
    
    console.log("Received request to generate meal plan with Groq");
    console.log(`User: ${userData.id}, Goal: ${userData.goal}, Calories: ${userData.dailyCalories}`);
    console.log(`Selected foods: ${selectedFoods.length}`);
    console.log(`Dietary preferences: Allergies: ${dietaryPreferences.hasAllergies}, Restrictions: ${dietaryPreferences.dietaryRestrictions.length}`);

    const result = await generateMealPlan(userData, selectedFoods, foodsByMealType, dietaryPreferences);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating meal plan:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
