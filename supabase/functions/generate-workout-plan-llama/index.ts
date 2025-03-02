
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const GROQ_API_KEY = Deno.env.get("LLAMA_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId, settings } = await req.json();
    
    if (!preferences) {
      throw new Error("Workout preferences missing");
    }

    if (!userId) {
      throw new Error("User ID missing");
    }

    if (!GROQ_API_KEY) {
      throw new Error("LLAMA_API_KEY environment variable is not set");
    }

    // Create Supabase client
    const supabase = createClient(
      SUPABASE_URL as string,
      SUPABASE_SERVICE_ROLE_KEY as string
    );

    // Fetch exercises from the database based on preferences to include in the prompt
    console.log("Fetching exercises for type:", preferences.preferred_exercise_types);
    
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("id, name, description, muscle_group, exercise_type, difficulty, gif_url")
      .in("exercise_type", preferences.preferred_exercise_types)
      .limit(30);

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      throw new Error(`Error fetching exercises: ${exercisesError.message}`);
    }

    // Build the prompt for the AI model
    const userProfile = `
User Profile:
- Age: ${preferences.age}
- Weight: ${preferences.weight} kg
- Height: ${preferences.height} cm
- Gender: ${preferences.gender === "male" ? "Male" : "Female"}
- Goal: ${preferences.goal === "lose_weight" ? "Weight Loss" : preferences.goal === "maintain" ? "Weight Maintenance" : "Muscle Gain"}
- Activity Level: ${preferences.activity_level}
- Preferred Exercise Types: ${preferences.preferred_exercise_types.join(", ")}
- Available Equipment: ${preferences.available_equipment.join(", ")}
${preferences.health_conditions && preferences.health_conditions.length > 0 ? `- Health Conditions: ${preferences.health_conditions.join(", ")}` : ""}
`;

    // System prompt to guide the AI
    const systemPrompt = settings?.system_prompt || `
You are Treine2025, a professional fitness coach specialized in creating personalized workout plans. 
Your job is to create a 7-day workout plan based on the user's profile and preferences.
Use only exercises from the provided exercise list.
`;

    // Exercise database for the model to reference
    const exerciseDatabase = exercises.map((exercise) => {
      return {
        id: exercise.id,
        name: exercise.name,
        description: exercise.description,
        muscle_group: exercise.muscle_group,
        exercise_type: exercise.exercise_type,
        difficulty: exercise.difficulty,
        has_gif: exercise.gif_url ? true : false
      };
    });

    // Format the available exercises for the prompt
    const exerciseList = `
Available Exercises:
${exerciseDatabase.map((ex) => `- ${ex.name} (Type: ${ex.exercise_type}, Group: ${ex.muscle_group})`).join("\n")}
`;

    // Instructions for output format
    const outputFormat = `
RESPONSE FORMAT:
Provide a complete 7-day workout plan with the following JSON structure:
{
  "goal": "Overall goal of the plan (strength building, weight loss, etc.)",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "5-10 minute description of warmup",
      "cooldown_description": "5-10 minute description of cooldown",
      "session_exercises": [
        {
          "exercise": {
            "id": "exercise_id from the provided list",
            "name": "Name of the exercise"
          },
          "sets": 3,
          "reps": 12,
          "rest_time_seconds": 60
        }
      ]
    }
  ]
}

IMPORTANT RULES:
1. Use ONLY exercises from the provided list
2. Match exercise IDs correctly with their names
3. Create a realistic, achievable plan for the user's fitness level
4. Structure the sessions logically with appropriate warmup and cooldown
5. Schedule adequate rest days between working the same muscle groups
6. Return VALID JSON without explanations or extra text
`;

    // Combine all parts into one prompt
    const userMessage = `${userProfile}\n\n${exerciseList}\n\n${outputFormat}`;

    // Make request to Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    // Check if response is ok
    if (!response.ok) {
      const errorResponse = await response.text();
      console.error("Groq API error:", errorResponse);
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    // Parse the response
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error("Invalid response from Groq API");
    }

    // Extract the workout plan from the response
    let workoutPlanText = data.choices[0].message.content;
    
    // Extract JSON from the response if there's extra text
    let workoutPlan;
    try {
      // Try to parse the whole response as JSON
      workoutPlan = JSON.parse(workoutPlanText);
    } catch (e) {
      // If that fails, try to extract JSON from the text
      try {
        const jsonMatch = workoutPlanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          workoutPlan = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not extract valid JSON from response");
        }
      } catch (e2) {
        throw new Error("Failed to parse workout plan JSON: " + e2.message);
      }
    }

    // Enhance the workout plan with full exercise data
    if (workoutPlan && workoutPlan.workout_sessions) {
      const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));
      
      // Process each session
      for (const session of workoutPlan.workout_sessions) {
        if (session.session_exercises) {
          // Process each exercise
          for (const exerciseItem of session.session_exercises) {
            const exerciseId = exerciseItem.exercise.id;
            const exerciseData = exerciseMap.get(exerciseId);
            
            if (exerciseData) {
              // Replace the minimal exercise data with full data
              exerciseItem.exercise = {
                id: exerciseData.id,
                name: exerciseData.name,
                description: exerciseData.description || "",
                gif_url: exerciseData.gif_url || ""
              };
            }
          }
        }
      }
    }

    // Return the enhanced workout plan
    return new Response(
      JSON.stringify({ workoutPlan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-workout-plan-llama:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
