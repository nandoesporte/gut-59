
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle CORS preflight requests
function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  return null;
}

// Error response helper
function errorResponse(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({
      error: message,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}

serve(async (req) => {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Only allow POST requests
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    // Parse request body
    const { preferences, userId, settings } = await req.json();
    
    if (!preferences || !userId) {
      return errorResponse("Missing required parameters: preferences and userId");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get GROQ API key from environment variables
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return errorResponse("GROQ API key not configured", 500);
    }

    // Step 1: Fetch exercise data from the database
    console.log("Fetching exercises from database...");
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("*")
      .in("exercise_type", preferences.preferred_exercise_types)
      .not("gif_url", "is", null);

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      return errorResponse(`Error fetching exercises: ${exercisesError.message}`);
    }

    if (!exercises || exercises.length === 0) {
      return errorResponse("No exercises found matching the preferences");
    }

    console.log(`Found ${exercises.length} exercises matching the preferences`);

    // Step 2: Create the prompt for LLaMA 3
    const systemPrompt = settings?.system_prompt || 
      `You are TRENE2025, an AI-powered personal trainer specializing in creating personalized workout plans.
      You analyze user data and preferences to create optimal 7-day workout plans with specific exercises, sets, reps, and rest periods.
      Your plans are evidence-based, safe, and tailored to the user's goals, fitness level, and equipment access.`;

    const userPrompt = `
      Create a personalized 7-day workout plan based on the following user data:
      
      - Age: ${preferences.age}
      - Weight: ${preferences.weight} kg
      - Height: ${preferences.height} cm
      - Gender: ${preferences.gender}
      - Goal: ${preferences.goal === 'lose_weight' ? 'Lose Weight' : preferences.goal === 'gain_mass' ? 'Gain Muscle Mass' : 'Maintain Weight/Improve Fitness'}
      - Activity Level: ${preferences.activity_level}
      - Preferred Exercise Types: ${preferences.preferred_exercise_types.join(', ')}
      - Available Equipment: ${preferences.available_equipment.join(', ')}

      The exercises MUST be selected from this list (choose the most appropriate ones):
      ${exercises.slice(0, 50).map(ex => `- ${ex.name} (Type: ${ex.exercise_type}, Difficulty: ${ex.difficulty})`).join("\n")}
      
      Create a structured 7-day workout plan. For each day, include:
      1. Day number (1-7)
      2. A warm-up description
      3. 4-6 exercises with detailed sets, reps, and rest periods
      4. A cooldown description
      
      Format your response as a JSON object with the following structure:
      {
        "goal": "User's goal",
        "start_date": "YYYY-MM-DD", // Current date
        "end_date": "YYYY-MM-DD", // 7 days from today
        "workout_sessions": [
          {
            "day_number": 1,
            "warmup_description": "5-minute cardio and dynamic stretching",
            "cooldown_description": "5-minute static stretching",
            "session_exercises": [
              {
                "exercise": {
                  "name": "Exercise Name (exactly as provided in the list)"
                },
                "sets": 3,
                "reps": 12,
                "rest_time_seconds": 60
              }
            ]
          }
        ]
      }
      
      Response should be VALID JSON only with no additional text or explanations.
    `;

    console.log("Generating workout plan using LLaMA 3 via Groq...");
    
    // Step 3: Call the Groq API with LLaMA 3 model
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      console.error("Error from Groq API:", error);
      return errorResponse(`Error from Groq API: ${error}`);
    }

    const groqData = await groqResponse.json();
    
    if (!groqData.choices || groqData.choices.length === 0) {
      return errorResponse("No response from LLaMA model");
    }

    const llmResponse = groqData.choices[0].message.content;
    
    // Parse the JSON response from the LLM
    let workoutPlan;
    try {
      // Extract JSON from the response (in case there's any additional text)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        workoutPlan = JSON.parse(jsonMatch[0]);
      } else {
        workoutPlan = JSON.parse(llmResponse);
      }
    } catch (error) {
      console.error("Error parsing LLM response:", error);
      console.log("Raw LLM response:", llmResponse);
      return errorResponse(`Failed to parse workout plan from LLM: ${error.message}`);
    }

    // Step 4: Enrich the workout plan with exercise details from the database
    if (workoutPlan && workoutPlan.workout_sessions) {
      for (const session of workoutPlan.workout_sessions) {
        if (session.session_exercises) {
          for (const sessionExercise of session.session_exercises) {
            // Find the complete exercise data from our database
            const exerciseData = exercises.find(
              e => e.name.toLowerCase() === sessionExercise.exercise.name.toLowerCase()
            );
            
            if (exerciseData) {
              sessionExercise.exercise = {
                id: exerciseData.id,
                name: exerciseData.name,
                description: exerciseData.description,
                gif_url: exerciseData.gif_url,
              };
            }
          }
        }
      }
    }

    // Step 5: Return the workout plan
    return new Response(
      JSON.stringify({
        workoutPlan,
        message: "Workout plan generated successfully",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse(`Unexpected error: ${error.message}`, 500);
  }
});
