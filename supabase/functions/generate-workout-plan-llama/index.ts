
// Edge function to generate workout plans using Llama
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseClient } from "../_shared/supabase-client.ts";

// CORS headers to ensure the API can be called from your frontend app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkoutPlanRequestBody {
  preferences: {
    weight: number;
    height: number;
    age: number;
    gender: string;
    goal: string;
    activity_level: string;
    health_conditions?: string[];
    preferred_exercise_types?: string[];
    available_equipment?: string[];
    days_per_week: number;
    min_exercises_per_day?: number; // New parameter for minimum exercises per day
  };
  userId: string;
  settings?: any;
  requestId?: string;
  exercises?: any[];
}

serve(async (req) => {
  // Check if it's an OPTIONS request (browser preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  
  try {
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    console.log(`Request ID: ${requestId} - Starting workout plan generation`);
    
    // Parse the request body
    const body: WorkoutPlanRequestBody = await req.json();
    console.log(`Request ID: ${requestId} - Received workout plan request for user: ${body.userId}`);
    
    // Validate the request
    if (!body.userId || !body.preferences) {
      throw new Error("Dados de usuário e preferências são obrigatórios");
    }
    
    // Check for AI settings
    const settings = body.settings;
    console.log(`Request ID: ${requestId} - Using custom settings:`, settings ? "Yes" : "No");
    
    // Determine the API key to use (use provided key from settings or environment variable)
    const groqApiKey = settings?.groq_api_key || Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      throw new Error("API key for Groq not configured");
    }

    // Check if we have passed exercises from the client or need to fetch them
    let exercises = body.exercises || [];
    if (!exercises || exercises.length === 0) {
      console.log(`Request ID: ${requestId} - No exercises provided, fetching from database`);
      // If exercises are not passed in the request, fetch them from the database
      const supabase = supabaseClient();
      const { data: exercisesData, error: exercisesError } = await supabase
        .from("exercises")
        .select("*")
        .limit(100);

      if (exercisesError) {
        throw new Error(`Error fetching exercises: ${exercisesError.message}`);
      }
      
      exercises = exercisesData || [];
      console.log(`Request ID: ${requestId} - Fetched ${exercises.length} exercises from database`);
    } else {
      console.log(`Request ID: ${requestId} - Using ${exercises.length} exercises provided in request`);
    }
    
    // Set the minimum number of exercises per session
    const minExercisesPerDay = body.preferences.min_exercises_per_day || 6;
    
    // Create system prompt
    const systemPrompt = `You are Trenner, a professional fitness trainer and workout plan designer. 
You create effective, science-based workout plans tailored to individual needs and goals.
You should design a complete workout plan based on the user's specifications, including their fitness goals, level, available equipment, and any health conditions.
Each workout session should have between ${minExercisesPerDay} and 8 exercises, with clear sets, reps, and rest periods.
Provide a comprehensive, structured workout plan for the number of days per week specified by the user.
Ensure the plan follows proper exercise science principles like progressive overload, adequate recovery, and muscle group balance.`;

    // Create user prompt with preferences
    const userPrompt = `Create a personalized workout plan for someone with the following characteristics:
- Weight: ${body.preferences.weight} kg
- Height: ${body.preferences.height} cm
- Age: ${body.preferences.age}
- Gender: ${body.preferences.gender}
- Goal: ${body.preferences.goal}
- Activity level: ${body.preferences.activity_level}
${body.preferences.health_conditions ? `- Health conditions: ${body.preferences.health_conditions.join(", ")}` : ""}
${body.preferences.preferred_exercise_types ? `- Preferred exercise types: ${body.preferences.preferred_exercise_types.join(", ")}` : ""}
${body.preferences.available_equipment ? `- Available equipment: ${body.preferences.available_equipment.join(", ")}` : ""}
- Days per week: ${body.preferences.days_per_week}

I need a full workout plan with ${body.preferences.days_per_week} different workout sessions. Each day should have AT LEAST ${minExercisesPerDay} different exercises, but no more than 8 exercises.

IMPORTANT: You MUST use exercises from the following list (use the exact name and ID):
${exercises.slice(0, 50).map(e => `- ${e.name} (ID: ${e.id}, Muscle Group: ${e.muscle_group})`).join("\n")}

For each workout day, provide:
1. Day name/focus (e.g., "Day 1: Chest and Triceps")
2. A brief warmup routine
3. Main exercises with exact sets, reps, and rest periods
4. A brief cooldown

Format the response as a valid JSON object with this exact structure:
{
  "workout_sessions": [
    {
      "day_number": 1,
      "day_name": "Day 1: [Focus]",
      "warmup_description": "5-10 minute warmup...",
      "cooldown_description": "5-minute cooldown...",
      "session_exercises": [
        {
          "exercise": {
            "id": "exercise-id-from-list",
            "name": "Exercise Name",
            "description": "Brief description",
            "muscle_group": "primary-muscle-group"
          },
          "sets": 3,
          "reps": 12,
          "rest_time_seconds": 60
        },
        ... at least ${minExercisesPerDay} exercises for each day ...
      ]
    },
    ... more workout days ...
  ],
  "goal": "User's fitness goal",
  "start_date": "2023-06-01",
  "end_date": "2023-07-01"
}

Ensure:
- The workout plan targets ALL major muscle groups appropriately throughout the week
- Each workout day has AT LEAST ${minExercisesPerDay} exercises, but no more than 8
- The plan follows proper exercise science for progression and recovery
- You use ONLY exercises from the provided list (with correct IDs)
- The JSON structure exactly matches the format provided above`;

    console.log(`Request ID: ${requestId} - Calling Groq API`);
    console.log(`System prompt length: ${systemPrompt.length} chars`);
    console.log(`User prompt length: ${userPrompt.length} chars`);

    // Call Groq API to generate workout plan
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Request ID: ${requestId} - Groq API Error:`, errorText);
      throw new Error(`Groq API Error: ${errorText}`);
    }

    const result = await response.json();
    console.log(`Request ID: ${requestId} - Groq API response received`);

    // Extract the assistant's message content
    const assistantMessage = result.choices[0].message.content;
    
    // Parse the JSON from the Llama response
    let workoutPlan;
    try {
      // Look for JSON in the response
      const jsonMatch = assistantMessage.match(/```json\n([\s\S]*?)\n```/) || 
                         assistantMessage.match(/```([\s\S]*?)```/) ||
                         [null, assistantMessage];
                         
      const jsonStr = jsonMatch[1] || assistantMessage;
      
      workoutPlan = JSON.parse(jsonStr);
      console.log(`Request ID: ${requestId} - Successfully parsed workout plan JSON`);
      
      // Check if we have the minimum number of exercises per day
      if (workoutPlan.workout_sessions) {
        workoutPlan.workout_sessions.forEach((session, index) => {
          console.log(`Session ${index + 1} has ${session.session_exercises?.length || 0} exercises`);
          
          // Ensure each session has the minimum number of exercises
          if (!session.session_exercises || session.session_exercises.length < minExercisesPerDay) {
            console.warn(`Session ${index + 1} has fewer than ${minExercisesPerDay} exercises, client will add more.`);
          }
        });
      }
    } catch (error) {
      console.error(`Request ID: ${requestId} - Error parsing workout plan JSON:`, error);
      console.log("Raw response:", assistantMessage);
      throw new Error("Failed to parse workout plan from Llama response");
    }

    // Return the workout plan
    return new Response(
      JSON.stringify({
        workoutPlan,
        message: "Workout plan generated successfully",
        rawLlamaResponse: result
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error:", error.message);
    
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});
