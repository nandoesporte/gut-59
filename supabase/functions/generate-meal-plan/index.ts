
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences, agentPrompt } = await req.json();
    console.log("Received request data:", { userData, selectedFoods, dietaryPreferences });

    if (!OPENAI_API_KEY) {
      throw new Error("Missing OpenAI API key");
    }

    // Prepare context for the model
    const context = {
      user: userData,
      foods: selectedFoods,
      preferences: dietaryPreferences,
    };

    // Format the system prompt for OpenAI
    const systemPrompt = `You are a professional nutritionist AI. Create a personalized meal plan following these exact rules:
1. Response MUST be a valid JSON object
2. Follow this EXACT format without any additional text:

{
  "weeklyPlan": {
    "monday": {
      "meals": {
        "breakfast": {
          "description": "string",
          "foods": [{"name": "string", "portion": number, "unit": "string", "details": "string"}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        "morningSnack": {"same structure as breakfast"},
        "lunch": {"same structure as breakfast"},
        "afternoonSnack": {"same structure as breakfast"},
        "dinner": {"same structure as breakfast"}
      },
      "dailyTotals": {"calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number}
    }
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
}`;

    // Format the user prompt with context
    const userPrompt = `Create a meal plan with these parameters:
User info: ${JSON.stringify(userData)}
Available foods: ${JSON.stringify(selectedFoods)}
Dietary preferences: ${JSON.stringify(dietaryPreferences)}
Additional instructions: ${agentPrompt}`;

    console.log("Sending request to OpenAI API...");
    
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error response:", errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("OpenAI API response:", JSON.stringify(data));

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response structure from OpenAI API");
    }

    const generatedContent = data.choices[0].message.content;
    console.log("Generated content:", generatedContent);

    let mealPlan;
    try {
      if (typeof generatedContent === 'string') {
        mealPlan = JSON.parse(generatedContent.trim());
      } else {
        mealPlan = generatedContent;
      }

      // Validate meal plan structure
      if (!mealPlan.weeklyPlan || !mealPlan.weeklyTotals || !mealPlan.recommendations) {
        console.error("Invalid meal plan structure:", mealPlan);
        throw new Error("Generated meal plan is missing required sections");
      }

      // Validate all days and meals
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
        if (!mealPlan.weeklyPlan[day]) {
          throw new Error(`Missing day: ${day}`);
        }

        ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'].forEach(meal => {
          if (!mealPlan.weeklyPlan[day].meals[meal]) {
            throw new Error(`Missing meal ${meal} for ${day}`);
          }
        });
      });

      console.log("Successfully validated meal plan structure");
    } catch (error) {
      console.error("Error parsing or validating meal plan:", error);
      console.error("Generated content:", generatedContent);
      throw new Error(`Failed to create valid meal plan: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-meal-plan:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
