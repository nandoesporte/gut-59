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
    
    // Create activity level-specific guidance
    let activityLevelGuidance = "";
    switch(body.preferences.activity_level) {
      case "sedentary":
        activityLevelGuidance = "For sedentary individuals, create a gentle 2-day per week program that introduces basic exercises with proper form. Focus on full-body workouts with moderate intensity.";
        break;
      case "light":
        activityLevelGuidance = "For lightly active individuals, design a balanced 3-day per week program that develops foundational strength and conditioning. Include a mix of compound and isolation exercises.";
        break;
      case "moderate":
        activityLevelGuidance = "For moderately active individuals, create a comprehensive 5-day per week program that promotes consistent progress. Follow a structured split targeting different muscle groups on different days.";
        break;
      case "intense":
        activityLevelGuidance = "For highly active individuals, design an advanced 6-day per week program that maximizes training stimulus. Incorporate periodization, supersets, and advanced techniques for optimal results.";
        break;
      default:
        activityLevelGuidance = "Design a balanced program appropriate for the user's activity level.";
    }
    
    // Create system prompt
    const systemPrompt = `You are Trenner, a professional fitness trainer and workout plan designer. 
You create effective, science-based workout plans tailored to individual needs and goals.
You should design a complete workout plan based on the user's specifications, including their fitness goals, level, available equipment, and any health conditions.
Each workout session should have between ${minExercisesPerDay} and 8 exercises, with clear sets, reps, and rest periods.
Provide a comprehensive, structured workout plan for the number of days per week specified by the user: ${body.preferences.days_per_week} days.
${activityLevelGuidance}
Ensure the plan follows proper exercise science principles like progressive overload, adequate recovery, and muscle group balance.
Create a balanced distribution of exercises covering ALL major muscle groups across each workout session.

CRITICAL RULE: Every exercise must be used EXACTLY ONCE throughout the entire workout plan. NO EXERCISE can appear in multiple days.`;

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

I need a full workout plan with ${body.preferences.days_per_week} different workout sessions. Each day should have AT LEAST ${minExercisesPerDay} different exercises, but no more than 8 exercises. Every workout session must include exercises for each major muscle group (chest, back, legs, shoulders, arms, core) to ensure balanced training.

MOST IMPORTANT RULE:
- NEVER USE THE SAME EXERCISE MORE THAN ONCE IN THE ENTIRE PLAN
- Every exercise can only be used in ONE workout day 
- Verify that NO EXERCISES ARE REPEATED between different days before finalizing the plan
- Double check the IDs to make sure no ID appears more than once in your entire response

IMPORTANT WORKOUT STRUCTURE RULES: 
- You MUST use exercises from the following list (use the exact name and ID)
- DO NOT REPEAT THE SAME EXERCISE WITHIN A SINGLE WORKOUT SESSION
- DO NOT REPEAT EXERCISES ACROSS DIFFERENT WORKOUT DAYS - each exercise should be used only ONCE in the entire plan
- Each exercise should appear at most ONCE in the entire workout plan
- EACH WORKOUT SESSION MUST INCLUDE AT LEAST ONE EXERCISE FOR EACH MAJOR MUSCLE GROUP 
- Follow a scientifically-backed training split (Push/Pull/Legs or similar approach)
- Organize exercises in each session based on optimal training order (compound movements first)

Here are the exercises you can use:
${exercises.slice(0, 50).map(e => `- ${e.name} (ID: ${e.id}, Muscle Group: ${e.muscle_group})`).join("\n")}

For each workout day, provide:
1. Day name/focus (e.g., "Day 1: Chest and Triceps")
2. A brief warmup routine
3. Main exercises with exact sets, reps, and rest periods
4. A brief cooldown

YOUR RESPONSE MUST BE VALID JSON. Don't include any text before or after the JSON.
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
- Each workout day has AT LEAST ${minExercisesPerDay} UNIQUE exercises, but no more than 8
- NO DUPLICATE EXERCISES within the same workout session
- NO DUPLICATE EXERCISES across different workout days - EVERY exercise should be used exactly ONCE in the entire plan
- EVERY SESSION includes at least one exercise for each major muscle group
- The plan follows proper exercise science for progression and recovery
- You use ONLY exercises from the provided list (with correct IDs)
- The JSON structure exactly matches the format provided above
- YOUR ENTIRE RESPONSE MUST BE VALID JSON - NO TEXT BEFORE OR AFTER THE JSON
- VERIFY THAT NO EXERCISE ID APPEARS MORE THAN ONCE IN THE ENTIRE PLAN BEFORE RETURNING THE RESULT`;

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
        max_tokens: 4000,
        response_format: { type: "json_object" } // Explicitly request JSON format
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
      // Improved JSON extraction logic
      let jsonStr = assistantMessage;
      
      // Check if the response is wrapped in markdown code blocks
      const jsonMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
        console.log(`Request ID: ${requestId} - Extracted JSON from markdown code block`);
      }
      
      // Check if the string starts with text that's not JSON
      if (jsonStr.trim().startsWith('{') === false) {
        console.log(`Request ID: ${requestId} - Response doesn't start with JSON object, attempting to extract`);
        const startOfJson = jsonStr.indexOf('{');
        if (startOfJson >= 0) {
          jsonStr = jsonStr.substring(startOfJson);
          // Find the matching closing brace
          let braceCount = 0;
          let endIndex = -1;
          
          for (let i = 0; i < jsonStr.length; i++) {
            if (jsonStr[i] === '{') braceCount++;
            if (jsonStr[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i + 1;
                break;
              }
            }
          }
          
          if (endIndex > 0) {
            jsonStr = jsonStr.substring(0, endIndex);
          }
        }
      }
      
      // Try parsing the JSON
      console.log(`Request ID: ${requestId} - Attempting to parse JSON:`, jsonStr.substring(0, 100) + "...");
      workoutPlan = JSON.parse(jsonStr);
      console.log(`Request ID: ${requestId} - Successfully parsed workout plan JSON`);
      
      // Check for duplicate exercises across all days
      if (workoutPlan.workout_sessions) {
        // Create a map to track all exercise IDs used in the plan
        const usedExerciseIds = new Map();
        let hasDuplicates = false;
        
        workoutPlan.workout_sessions.forEach((session, sessionIndex) => {
          if (session.session_exercises) {
            session.session_exercises.forEach((ex, exIndex) => {
              if (ex.exercise && ex.exercise.id) {
                const exerciseId = ex.exercise.id;
                if (usedExerciseIds.has(exerciseId)) {
                  // This is a duplicate exercise
                  console.warn(`Duplicate exercise detected: ${ex.exercise.name} (${exerciseId})`);
                  console.warn(`  First used in day ${usedExerciseIds.get(exerciseId).dayNumber}, now in day ${session.day_number}`);
                  hasDuplicates = true;
                } else {
                  // Record this exercise as used
                  usedExerciseIds.set(exerciseId, {
                    dayNumber: session.day_number,
                    sessionIndex: sessionIndex,
                    exIndex: exIndex
                  });
                }
              }
            });
          }
        });
        
        if (hasDuplicates) {
          console.warn(`Request ID: ${requestId} - Workout plan contains duplicate exercises across days!`);
          // We'll let the client-side code handle this by cleaning up duplicates
        } else {
          console.log(`Request ID: ${requestId} - All exercises in workout plan are unique across days`);
        }
      }
      
      // Check if we have the minimum number of exercises per day
      if (workoutPlan.workout_sessions) {
        workoutPlan.workout_sessions.forEach((session, index) => {
          console.log(`Session ${index + 1} has ${session.session_exercises?.length || 0} exercises`);
          
          // Ensure each session has the minimum number of exercises
          if (!session.session_exercises || session.session_exercises.length < minExercisesPerDay) {
            console.warn(`Session ${index + 1} has fewer than ${minExercisesPerDay} exercises, client will add more.`);
          }
          
          // Check for duplicate exercises
          if (session.session_exercises) {
            const exerciseIds = new Set();
            const duplicatesFound = session.session_exercises.some(ex => {
              if (!ex.exercise || !ex.exercise.id) return false;
              if (exerciseIds.has(ex.exercise.id)) return true;
              exerciseIds.add(ex.exercise.id);
              return false;
            });
            
            if (duplicatesFound) {
              console.warn(`Session ${index + 1} contains duplicate exercises, client will filter them.`);
            }
          }
          
          // Check if all major muscle groups are covered
          if (session.session_exercises) {
            const muscleGroups = new Set(session.session_exercises.map(ex => 
              ex.exercise?.muscle_group || 'unknown'
            ));
            
            const majorMuscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
            const missingGroups = majorMuscleGroups.filter(group => !muscleGroups.has(group));
            
            if (missingGroups.length > 0) {
              console.warn(`Session ${index + 1} is missing exercises for: ${missingGroups.join(', ')}. Client will add exercises.`);
            }
          }
        });
      }
    } catch (error) {
      console.error(`Request ID: ${requestId} - Error parsing workout plan JSON:`, error);
      console.log("Raw response first 500 chars:", assistantMessage.substring(0, 500));
      throw new Error(`Failed to parse workout plan from AI response: ${error.message}`);
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
    
    // Add special handling for JSON validation errors from Groq
    if (error.message && error.message.includes("json_validate_failed")) {
      console.error("JSON validation failed - likely due to duplicate exercises");
      // Return a more specific error to the client
      return new Response(
        JSON.stringify({
          error: "Erro na geração do plano de treino: exercícios duplicados foram encontrados. Por favor, tente novamente.",
          details: error.message
        }),
        {
          status: 400, // Bad request
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    
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
