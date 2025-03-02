
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
        auth: {
          persistSession: false,
        },
      }
    );

    // Check if authorization is present
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { preferences, userId, settings } = await req.json();
    console.log("Received workout generation request for user:", userId);
    console.log("Workout preferences:", JSON.stringify(preferences));
    
    if (!preferences) {
      return new Response(
        JSON.stringify({ error: "Workout preferences are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch exercises based on preferences
    const exerciseTypes = preferences.exerciseTypes || ["strength"];
    console.log("Fetching exercises for type:", JSON.stringify(exerciseTypes));
    
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("*")
      .in("type", exerciseTypes);

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch exercises" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${exercises.length} exercises matching the preferences`);

    // Prepare the prompt for the LLM
    let systemPrompt = settings?.use_custom_prompt 
      ? settings.system_prompt 
      : "You are TRENE2025, an AI specialist in creating personalized workout plans based on user preferences.";
    
    if (!systemPrompt) {
      systemPrompt = "You are TRENE2025, an AI specialist in creating personalized workout plans based on user preferences.";
    }

    // Create workout plan request to Groq API using Llama 3
    const groqEndpoint = "https://api.groq.com/openai/v1/chat/completions";

    // Construct the user prompt with user preferences and available exercises
    const userPrompt = `
Create a workout plan for a user with the following preferences:
- Age: ${preferences.age}
- Gender: ${preferences.gender}
- Height: ${preferences.height} cm
- Weight: ${preferences.weight} kg
- Fitness goal: ${preferences.goal}
- Activity level: ${preferences.activityLevel}
- Exercise types: ${preferences.exerciseTypes.join(", ")}
- Training location: ${preferences.trainingLocation}

The plan should span 7 days with properly structured workouts for each day. 
Only use exercises from this list:
${exercises.map(ex => `- ${ex.name} (ID: ${ex.id}, Type: ${ex.type})`).join("\n")}

The response must be valid JSON with exactly this structure:
{
  "goal": "Brief description of the workout goal",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "Brief warmup routine",
      "cooldown_description": "Brief cooldown routine",
      "session_exercises": [
        {
          "exercise": {
            "id": 123,
            "name": "Exercise Name",
            "description": "Exercise description",
            "gif_url": ""
          },
          "sets": 3,
          "reps": "8-12",
          "rest_time_seconds": 60
        }
      ]
    }
  ]
}

DO NOT include any exercises that are not in the list provided. Make sure to reference the exact exercise IDs from the list.
Your response MUST be in JSON format ONLY, without any additional text or explanation.
`;

    console.log("Sending request to Groq API...");
    const groqResponse = await fetch(groqEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
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
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", errorText);
      return new Response(
        JSON.stringify({ error: `Groq API error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqData = await groqResponse.json();
    console.log("Received response from Groq API");
    
    // Extract the workout plan from the response
    const workoutPlanText = groqData.choices[0].message.content;
    
    // Parse the JSON response
    let workoutPlan;
    try {
      // Find JSON content within the response
      const jsonMatch = workoutPlanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        workoutPlan = JSON.parse(jsonMatch[0]);
      } else {
        workoutPlan = JSON.parse(workoutPlanText);
      }
      
      console.log("Successfully parsed workout plan JSON");
    } catch (error) {
      console.error("Error parsing workout plan JSON:", error);
      console.log("Raw response:", workoutPlanText);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse workout plan", 
          rawResponse: workoutPlanText 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ workoutPlan }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
