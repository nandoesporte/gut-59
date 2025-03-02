
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
    const { preferences, progressData, userId } = await req.json();
    
    console.log("Generate Rehab Plan Function - Request received");
    console.log("Using model: nous-hermes-2-mixtral-8x7b for rehab plan generation");
    console.log("Preferences:", JSON.stringify(preferences, null, 2));
    
    // Create a system prompt for rehabilitation plan generation
    const systemPrompt = `You are an expert physiotherapist specialized in creating personalized rehabilitation plans.
Create a detailed rehabilitation plan based on the user's symptoms, preferences, and progress data.
Your response must be valid JSON in a specific format.`;

    // Create a detailed user prompt
    let userPrompt = `Create a rehabilitation plan for a patient with the following symptoms: ${preferences.symptoms.join(", ")}.`;
    
    if (preferences.painLevel) {
      userPrompt += ` The patient reports a pain level of ${preferences.painLevel}/10.`;
    }
    
    if (preferences.painAreas && preferences.painAreas.length > 0) {
      userPrompt += ` The pain is located in the following areas: ${preferences.painAreas.join(", ")}.`;
    }
    
    if (preferences.symptomDuration) {
      userPrompt += ` The symptoms have been present for ${preferences.symptomDuration}.`;
    }
    
    if (preferences.goals && preferences.goals.length > 0) {
      userPrompt += ` The patient's goals for rehabilitation are: ${preferences.goals.join(", ")}.`;
    }
    
    // Add any progress data if available
    if (progressData && progressData.length > 0) {
      userPrompt += " Based on previous progress data:";
      progressData.slice(0, 5).forEach(item => {
        userPrompt += ` Exercise: ${item.exercise}, Difficulty: ${item.difficulty}/10, Date: ${item.date}.`;
      });
    }
    
    userPrompt += ` Please create a comprehensive rehabilitation plan that includes daily exercises, stretches, and recommendations for pain management. The plan should be progressive, starting with gentle exercises and gradually increasing intensity over a 4-week period.`;
    
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
    console.log("Llama API response received");
    
    // Process and return the rehabilitation plan
    const rehabPlanContent = llamaData.choices[0].message.content;
    const rehabPlan = JSON.parse(rehabPlanContent);
    
    return new Response(JSON.stringify(rehabPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-rehab-plan function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
