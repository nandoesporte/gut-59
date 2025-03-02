
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
    const { preferences, userId, progressData } = await req.json();
    
    console.log("Generate Workout Plan Function - Request received");
    console.log("Using model: nous-hermes-2-mixtral-8x7b for workout plan generation");
    console.log("User ID:", userId);
    console.log("Preferences:", JSON.stringify(preferences, null, 2));
    
    // Create a system prompt for workout plan generation
    const systemPrompt = `You are an expert fitness trainer specialized in creating personalized workout plans.
Create a detailed workout plan based on the user's fitness level, goals, and preferences.
Your response must be valid JSON in a specific format that includes exercises, sets, reps, and detailed instructions.`;

    // Create a detailed user prompt
    let userPrompt = `Create a workout plan for a ${preferences.age} year old ${preferences.gender}, weighing ${preferences.weight}kg, height ${preferences.height}cm.`;
    
    userPrompt += ` Fitness level: ${preferences.fitnessLevel || 'Beginner'}.`;
    userPrompt += ` Goals: ${preferences.goals.join(", ")}.`;
    userPrompt += ` Preferred training: ${preferences.exerciseTypes.join(", ")}.`;
    userPrompt += ` Available equipment: ${preferences.equipment.join(", ")}.`;
    userPrompt += ` Training location: ${preferences.location}.`;
    userPrompt += ` Available days per week: ${preferences.daysPerWeek}.`;
    userPrompt += ` Time per session: ${preferences.timePerSession} minutes.`;
    
    // Add any limitations or health conditions
    if (preferences.limitations && preferences.limitations.length > 0) {
      userPrompt += ` The person has the following limitations: ${preferences.limitations.join(", ")}.`;
    }
    
    // Add progress data if available
    if (progressData && progressData.length > 0) {
      userPrompt += " Based on previous workout data:";
      progressData.slice(0, 5).forEach(item => {
        userPrompt += ` Exercise: ${item.exercise}, Difficulty: ${item.difficulty}/10, Date: ${item.date}.`;
      });
    }
    
    userPrompt += ` Create a comprehensive workout plan that includes warm-up, main exercises, cool-down, and recommendations. The plan should be progressive over a 4-week period.`;
    
    console.log("Sending request to Llama API for workout plan");
    
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
    
    // Process and return the workout plan
    const workoutPlanContent = llamaData.choices[0].message.content;
    const workoutPlan = JSON.parse(workoutPlanContent);
    
    return new Response(JSON.stringify(workoutPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-workout-plan function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
