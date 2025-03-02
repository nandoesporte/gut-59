
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Generate Workout Plan Function - Request received");
    
    // Parse request body
    const requestData = await req.json();
    const { preferences, userId, settings } = requestData;
    
    if (!preferences) {
      throw new Error("Workout preferences are required");
    }
    
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    // Initialize Supabase client with the provided service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log("Fetching exercises from database...");
    
    // Get exercises from the database
    const { data: exercises, error: exercisesError } = await supabaseAdmin
      .from('exercises')
      .select('*');
      
    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      throw new Error(`Error fetching exercises: ${exercisesError.message}`);
    }
    
    if (!exercises || exercises.length === 0) {
      console.warn("No exercises found in the database");
    } else {
      console.log(`Found ${exercises.length} exercises in the database`);
    }
    
    // Match exercises to user preferences
    const matchedExercises = matchExercisesToPreferences(exercises, preferences);
    console.log(`Matched ${matchedExercises.length} exercises to user preferences`);
    
    // Call API to generate workout plan
    console.log("Generating workout plan with Trene2025 agent");
    const workoutPlan = await generateWorkoutPlan(preferences, matchedExercises, settings);
    
    // Return response
    return new Response(
      JSON.stringify({ 
        workoutPlan,
        message: "Workout plan generated successfully"
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
    
  } catch (error) {
    console.error("Error in workout plan generation:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Error generating workout plan",
        success: false
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

// Function to match exercises to user preferences
function matchExercisesToPreferences(exercises, preferences) {
  // If no exercises, return empty array
  if (!exercises || exercises.length === 0) {
    return [];
  }

  // Extract user preferences
  const { 
    age, 
    gender, 
    goal, 
    activity_level, 
    preferred_exercise_types, 
    available_equipment,
    health_conditions
  } = preferences;

  // Filter and score exercises based on preferences
  const scoredExercises = exercises.map(exercise => {
    let score = 0;
    
    // Match exercise type
    if (preferred_exercise_types && preferred_exercise_types.includes(exercise.exercise_type)) {
      score += 5;
    }
    
    // Match equipment
    if (available_equipment && available_equipment.length > 0) {
      const hasRequiredEquipment = !exercise.equipment_needed || 
        exercise.equipment_needed.some(eq => available_equipment.includes(eq));
      
      if (hasRequiredEquipment) {
        score += 3;
      } else {
        score -= 10; // Heavily penalize exercises requiring unavailable equipment
      }
    }
    
    // Match goals
    if (exercise.goals && exercise.goals.length > 0) {
      const goalMapping = {
        'lose_weight': ['weight loss', 'fat burning', 'calorie burning', 'endurance'],
        'gain_mass': ['muscle growth', 'strength', 'hypertrophy', 'power'],
        'maintain': ['general fitness', 'functional', 'health', 'maintenance']
      };
      
      const userGoalKeywords = goalMapping[goal] || [];
      const matchingGoals = exercise.goals.filter(g => 
        userGoalKeywords.some(keyword => g.toLowerCase().includes(keyword))
      );
      
      score += matchingGoals.length * 2;
    }
    
    // Consider health conditions
    if (health_conditions && health_conditions.length > 0 && exercise.contraindicated_conditions) {
      const hasContraindication = exercise.contraindicated_conditions.some(condition => 
        health_conditions.some(hc => condition.toLowerCase().includes(hc.toLowerCase()))
      );
      
      if (hasContraindication) {
        score -= 20; // Heavily penalize exercises contraindicated for user's health conditions
      }
    }
    
    // Consider age-appropriate exercises
    if (age && exercise.suitable_for_conditions) {
      if ((age > 60 && exercise.suitable_for_conditions.some(c => c.toLowerCase().includes('senior'))) ||
          (age < 18 && exercise.suitable_for_conditions.some(c => c.toLowerCase().includes('youth')))) {
        score += 3;
      }
    }
    
    return { exercise, score };
  });
  
  // Sort by score and take the top exercises
  const sortedExercises = scoredExercises
    .sort((a, b) => b.score - a.score)
    .map(item => item.exercise);
  
  // Return at least some exercises even if scores are low
  return sortedExercises.slice(0, Math.max(50, sortedExercises.length));
}

// Function to generate workout plan using the LLM
async function generateWorkoutPlan(preferences, matchedExercises, settings) {
  try {
    // Extract AI API key
    const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY");
    
    if (!LLAMA_API_KEY) {
      throw new Error("LLAMA_API_KEY is not configured in environment variables");
    }
    
    // Prepare the system prompt
    const systemPrompt = settings?.system_prompt || 
      `You are TRENE2025, an AI fitness professional specializing in creating personalized workout plans based on user data.
       Your task is to create a 7-day workout plan tailored to the user's specific needs, preferences, and goals.`;
    
    // Format the list of available exercises
    const exerciseList = matchedExercises.map(ex => {
      return `- ${ex.name} (Muscle Group: ${ex.muscle_group || 'Not specified'}, Type: ${ex.exercise_type || 'Not specified'}, Difficulty: ${ex.difficulty || 'Not specified'})`;
    }).join('\n');
    
    // Create a detailed user prompt with preferences and available exercises
    const userPrompt = `
Create a personalized 7-day workout plan based on the following information:

USER PROFILE:
- Age: ${preferences.age} years
- Gender: ${preferences.gender}
- Weight: ${preferences.weight} ${preferences.weight_unit || 'kg'}
- Height: ${preferences.height} ${preferences.height_unit || 'cm'}
- Activity Level: ${preferences.activity_level}
- Goal: ${preferences.goal.replace('_', ' ')}
- Preferred Exercise Types: ${preferences.preferred_exercise_types?.join(', ') || 'Not specified'}
- Available Equipment: ${preferences.available_equipment?.join(', ') || 'None'}
${preferences.health_conditions?.length > 0 ? `- Health Conditions: ${preferences.health_conditions.join(', ')}` : ''}

AVAILABLE EXERCISES (selected specifically for this user's profile):
${exerciseList}

INSTRUCTIONS:
1. Create a structured 7-day workout plan with the following:
   - A different focus for each day to ensure balanced muscle development and recovery
   - For each day, include a warmup, 3-6 exercises, and a cooldown
   - For each exercise, specify sets, reps, rest time between sets
   - Make sure to use exercises from the list provided above
   - Ensure exercises are appropriate for the user's goals and experience level

2. The workout plan should follow a structure that ensures:
   - Proper recovery between muscle groups
   - Progressive overload
   - Variation in exercise selection
   - Appropriate intensity based on the user's activity level and goals
   - Exercises are from different muscle groups to ensure balanced development

Format your response as a valid JSON object with this structure:
{
  "goal": "string (overall goal of the plan)",
  "start_date": "YYYY-MM-DD (current date)",
  "end_date": "YYYY-MM-DD (7 days from start date)",
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "string",
      "cooldown_description": "string",
      "session_exercises": [
        {
          "exercise": {
            "id": "string (use the exercise ID if available)",
            "name": "string (exercise name from the list)",
            "description": "string (brief description of the exercise)",
            "muscle_group": "string (primary muscle group targeted)", 
            "gif_url": "string (if available)",
            "exercise_type": "string (strength, cardio, or mobility)"
          },
          "sets": number,
          "reps": number,
          "rest_time_seconds": number
        }
      ]
    }
  ]
}

IMPORTANT: 
- Each day should focus on different muscle groups to allow for recovery
- Include a mix of exercise types (strength, cardio, mobility) based on the user's preferences
- Make sure exercises recommended are available from the provided list
- Balance the workout plan across different muscle groups for overall development
`;
    
    // Make request to the LLM API
    console.log("Sending request to LLM API...");
    const response = await fetch("https://api.llama-api.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3-8b-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });
    
    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LLM API Error (${response.status}):`, errorText);
      throw new Error(`LLM API request failed with status ${response.status}: ${errorText}`);
    }
    
    // Parse response
    const result = await response.json();
    console.log("LLM API response received");
    
    if (!result.choices || result.choices.length === 0) {
      console.error("LLM API returned empty choices array:", result);
      throw new Error("No content generated by LLM API");
    }
    
    // Extract the workout plan from the LLM response
    let workoutPlan;
    try {
      const content = result.choices[0].message.content;
      console.log("LLM API content type:", typeof content);
      
      // Try to parse the response as JSON
      workoutPlan = typeof content === 'string' ? JSON.parse(content) : content;
      
      // Validate the workout plan structure
      if (!workoutPlan.workout_sessions || !Array.isArray(workoutPlan.workout_sessions)) {
        console.error("Invalid workout plan structure:", workoutPlan);
        throw new Error("Invalid workout plan structure returned by LLM API");
      }
      
      // Ensure each exercise has a muscle_group property
      workoutPlan.workout_sessions.forEach(session => {
        if (session.session_exercises) {
          session.session_exercises.forEach(sessionEx => {
            if (sessionEx.exercise) {
              // If muscle_group is missing, try to find it from our matched exercises
              if (!sessionEx.exercise.muscle_group) {
                const matchedExercise = matchedExercises.find(ex => 
                  ex.name.toLowerCase() === sessionEx.exercise.name.toLowerCase()
                );
                
                if (matchedExercise) {
                  sessionEx.exercise.muscle_group = matchedExercise.muscle_group || 'Not specified';
                  sessionEx.exercise.exercise_type = matchedExercise.exercise_type || 'Not specified';
                  sessionEx.exercise.id = matchedExercise.id;
                  
                  // Add other properties if they exist
                  if (matchedExercise.gif_url) {
                    sessionEx.exercise.gif_url = matchedExercise.gif_url;
                  }
                  
                  if (matchedExercise.description) {
                    sessionEx.exercise.description = matchedExercise.description;
                  }
                } else {
                  // Fallback if we can't find a match
                  sessionEx.exercise.muscle_group = 'Not specified';
                }
              }
            }
          });
        }
      });
      
      console.log("Workout plan processed successfully");
      return workoutPlan;
      
    } catch (parseError) {
      console.error("Error parsing LLM API response:", parseError);
      console.error("Raw response:", result.choices[0].message.content);
      throw new Error("Failed to parse workout plan from LLM API response");
    }
  } catch (error) {
    console.error("Error in generateWorkoutPlan:", error);
    throw error;
  }
}
