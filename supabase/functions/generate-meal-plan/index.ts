
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences, agentPrompt } = await req.json();
    console.log("Received request data:", JSON.stringify({ userData, selectedFoods, dietaryPreferences }));

    if (!DEEPSEEK_API_KEY) {
      throw new Error("Missing DeepSeek API key");
    }

    // Preparar o contexto para o modelo
    const context = {
      user: userData,
      foods: selectedFoods,
      preferences: dietaryPreferences,
    };

    // Modificar o prompt para garantir que a resposta seja em JSON
    const systemPrompt = `You are a professional nutritionist AI that creates personalized meal plans. 
VERY IMPORTANT RULES:
1. You must ALWAYS respond with a valid JSON object.
2. Your response must STRICTLY follow this exact format, no additional text or explanations allowed:
{
  "weeklyPlan": {
    "monday": {
      "meals": {
        "breakfast": {
          "description": string,
          "foods": [{ "name": string, "portion": number, "unit": string, "details": string }],
          "calories": number,
          "macros": { "protein": number, "carbs": number, "fats": number, "fiber": number }
        },
        "morningSnack": { same structure as breakfast },
        "lunch": { same structure as breakfast },
        "afternoonSnack": { same structure as breakfast },
        "dinner": { same structure as breakfast }
      },
      "dailyTotals": { "calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number }
    },
    "tuesday": { same structure as monday },
    "wednesday": { same structure as monday },
    "thursday": { same structure as monday },
    "friday": { same structure as monday },
    "saturday": { same structure as monday },
    "sunday": { same structure as monday }
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
    "timing": string[]
  }
}`;

    // Formatar o prompt com os dados do usuário
    const formattedPrompt = agentPrompt
      .replace("{{user}}", JSON.stringify(context.user))
      .replace("{{foods}}", JSON.stringify(context.foods))
      .replace("{{preferences}}", JSON.stringify(context.preferences));

    console.log("Sending request to DeepSeek API...");
    
    const requestBody = {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: formattedPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    };

    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error response:", errorText);
      throw new Error(`DeepSeek API error: ${response.status} - ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log("Raw API response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error("Failed to parse API response as JSON:", error);
      console.error("Response text:", responseText);
      throw new Error("Invalid JSON response from API");
    }

    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Unexpected API response structure:", data);
      throw new Error("Invalid response structure from API");
    }

    const generatedPlan = data.choices[0].message.content;
    console.log("Generated plan (raw):", generatedPlan);

    let mealPlan;
    try {
      // Attempt to parse the response as JSON if it's a string
      if (typeof generatedPlan === 'string') {
        mealPlan = JSON.parse(generatedPlan);
      } else {
        mealPlan = generatedPlan; // If it's already an object
      }

      // Validate the structure of the meal plan
      if (!mealPlan.weeklyPlan || !mealPlan.weeklyTotals || !mealPlan.recommendations) {
        console.error("Invalid meal plan structure:", mealPlan);
        throw new Error("Invalid meal plan structure");
      }

      // Validate that all required fields are present
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const meals = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];
      
      for (const day of days) {
        if (!mealPlan.weeklyPlan[day]) {
          throw new Error(`Missing day: ${day}`);
        }
        for (const meal of meals) {
          if (!mealPlan.weeklyPlan[day].meals[meal]) {
            throw new Error(`Missing meal ${meal} for ${day}`);
          }
        }
      }

    } catch (error) {
      console.error("Error parsing or validating meal plan:", error);
      console.error("Generated plan content:", generatedPlan);
      throw new Error(`Invalid meal plan format: ${error.message}`);
    }

    console.log("Successfully validated meal plan structure");

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
