
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
    const { preferences, userId, exercises } = await req.json();
    console.log("Received rehab request data:", { preferences, userId, exercises });

    if (!DEEPSEEK_API_KEY) {
      throw new Error("Missing DeepSeek API key");
    }

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
            content: "You are a professional physiotherapist AI that creates personalized rehabilitation plans."
          },
          {
            role: "user",
            content: `Create a personalized rehabilitation plan for a user with the following preferences: ${JSON.stringify(preferences)} and available exercises: ${JSON.stringify(exercises)}`
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
    let rehabPlan;

    try {
      rehabPlan = JSON.parse(generatedPlan);
    } catch (error) {
      console.error("Error parsing rehab plan:", error);
      throw new Error("Invalid rehabilitation plan format received from AI");
    }

    return new Response(
      JSON.stringify({ rehabPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-rehab-plan:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
