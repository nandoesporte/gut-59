
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
    console.log("Received request data:", { userData, selectedFoods, dietaryPreferences });

    if (!DEEPSEEK_API_KEY) {
      throw new Error("Missing DeepSeek API key");
    }

    // Preparar o contexto para o modelo
    const context = {
      user: userData,
      foods: selectedFoods,
      preferences: dietaryPreferences,
    };

    // Formatar o prompt com os dados do usuário
    const formattedPrompt = agentPrompt
      .replace("{{user}}", JSON.stringify(context.user))
      .replace("{{foods}}", JSON.stringify(context.foods))
      .replace("{{preferences}}", JSON.stringify(context.preferences));

    console.log("Sending request to DeepSeek API...");
    
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a professional nutritionist AI that creates personalized meal plans."
          },
          {
            role: "user",
            content: formattedPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("DeepSeek API response received");

    const generatedPlan = data.choices[0].message.content;
    let mealPlan;

    try {
      mealPlan = JSON.parse(generatedPlan);
    } catch (error) {
      console.error("Error parsing meal plan:", error);
      throw new Error("Invalid meal plan format received from AI");
    }

    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-meal-plan:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
