
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

console.log("Workout Plan Generator Function Started");

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId, settings } = await req.json();
    
    // Detailed logging of request
    console.log(`Request received for user ${userId}`);
    console.log("AI Model Settings:", JSON.stringify(settings));
    console.log("User preferences:", JSON.stringify({
      ...preferences,
      preferred_exercise_types: Array.isArray(preferences.preferred_exercise_types) 
        ? preferences.preferred_exercise_types 
        : [],
      available_equipment: Array.isArray(preferences.available_equipment) 
        ? preferences.available_equipment 
        : [],
      health_conditions: Array.isArray(preferences.health_conditions) 
        ? preferences.health_conditions 
        : []
    }));

    // Input validation
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    if (!preferences) {
      throw new Error("Workout preferences are required");
    }

    // Create a Supabase client with the service role key for full access
    const adminSupabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Using the anon key for user-level access
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

    // Safeguard preferences arrays
    const safePreferences = {
      ...preferences,
      preferred_exercise_types: Array.isArray(preferences.preferred_exercise_types) 
        ? preferences.preferred_exercise_types 
        : [],
      available_equipment: Array.isArray(preferences.available_equipment) 
        ? preferences.available_equipment 
        : [],
      health_conditions: Array.isArray(preferences.health_conditions) 
        ? preferences.health_conditions 
        : []
    };

    // Fetch available exercises from the database
    const { data: exercises, error: exercisesError } = await adminSupabase
      .from('exercises')
      .select('*');

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
    }

    if (!exercises || exercises.length === 0) {
      throw new Error("No exercises found in the database");
    }
    
    console.log(`Fetched ${exercises.length} exercises from the database`);

    // Create exercise lookup map by muscle group for quick access
    const exercisesByMuscleGroup = exercises.reduce((acc, exercise) => {
      const muscleGroup = exercise.muscle_group || 'other';
      if (!acc[muscleGroup]) {
        acc[muscleGroup] = [];
      }
      acc[muscleGroup].push(exercise);
      return acc;
    }, {});

    // Create name-to-exercise mapping for fallback search
    const exercisesByName = exercises.reduce((acc, exercise) => {
      acc[exercise.name.toLowerCase()] = exercise;
      return acc;
    }, {});

    // Prepare system prompt
    const systemPrompt = settings.use_custom_prompt 
      ? settings.system_prompt 
      : `You are TRENE2025, an AI specialized in creating personalized workout plans based on user preferences, physical condition, and goals. Generate a complete 7-day workout plan with detailed exercises, sets, and reps.`;

    // Prepare the workout request prompt
    const userPrompt = `
Create a detailed 7-day workout plan for a user with the following information:
- Age: ${safePreferences.age}
- Gender: ${safePreferences.gender}
- Height: ${safePreferences.height} cm
- Weight: ${safePreferences.weight} kg
- Goal: ${safePreferences.goal}
- Activity Level: ${safePreferences.activity_level}
- Training Location: ${safePreferences.training_location}
- Available Equipment: ${safePreferences.available_equipment.join(', ')}
- Preferred Exercise Types: ${safePreferences.preferred_exercise_types.join(', ')}
- Health Conditions: ${safePreferences.health_conditions.join(', ')}
- Days Per Week: ${safePreferences.days_per_week || 7}

Include the following for each day:
1. Warmup description
2. Main exercises with sets, reps, and rest times
3. Cooldown description

IMPORTANT FORMAT GUIDELINES:
1. Return a valid JSON object with the structure defined below.
2. For each exercise, use ONLY exercises from this list: ${exercises.map(e => e.name).join(', ')}.
3. The workout_sessions array should contain 7 objects, one for each day of the week.
4. Each session_exercises array should contain 4-6 exercises, with proper sets, reps and rest times.
5. Include a "goal" field summarizing the workout plan's objective.

REQUIRED JSON RESPONSE FORMAT:
{
  "goal": "Brief summary of the workout plan objective",
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "5-10 minute detailed warmup routine",
      "cooldown_description": "5-10 minute detailed cooldown routine",
      "session_exercises": [
        {
          "exercise": {
            "id": "Existing exercise ID from database",
            "name": "Exact exercise name from the database"
          },
          "sets": 3,
          "reps": "8-12",
          "rest_time_seconds": 60
        }
      ]
    }
  ]
}
`;

    console.log("Invoking AI model to generate workout plan");

    // Call the LLM model to generate the workout plan
    let llmResponse;
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/llama-completion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          system: systemPrompt,
          user: userPrompt,
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("LLM API Error:", errorText);
        throw new Error(`LLM API returned ${response.status}: ${errorText}`);
      }
      
      llmResponse = await response.json();
      console.log("LLM Response received:", llmResponse.completion.substring(0, 200) + "...");
    } catch (error) {
      console.error("Error calling LLM API:", error);
      throw new Error(`Failed to generate workout plan: ${error.message}`);
    }

    // Extract and parse JSON from the completion
    let workoutPlan;
    try {
      // Look for JSON structure in the completion
      const jsonMatch = llmResponse.completion.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : llmResponse.completion;
      
      workoutPlan = JSON.parse(jsonString);
      console.log("Successfully parsed workout plan JSON");
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw response:", llmResponse.completion);
      throw new Error(`Failed to parse workout plan: ${parseError.message}`);
    }

    // Process and validate the workout plan
    if (!workoutPlan || !workoutPlan.workout_sessions) {
      throw new Error("Invalid workout plan structure");
    }

    // Process each exercise to ensure it has a valid exercise ID
    let missingExerciseCount = 0;
    let replacedExerciseCount = 0;

    workoutPlan.workout_sessions.forEach(session => {
      if (session.session_exercises && Array.isArray(session.session_exercises)) {
        session.session_exercises.forEach((exerciseItem, index) => {
          // Skip if we don't have an exercise object
          if (!exerciseItem.exercise) {
            console.warn(`Missing exercise object at day ${session.day_number}, exercise ${index + 1}`);
            missingExerciseCount++;
            return;
          }

          const exerciseName = exerciseItem.exercise.name;
          
          // Try multiple strategies to resolve exercise ID
          let matchedExercise = null;
          
          // 1. Direct lookup by ID if it exists
          if (exerciseItem.exercise.id) {
            const idMatch = exercises.find(e => e.id === exerciseItem.exercise.id);
            if (idMatch) {
              matchedExercise = idMatch;
            }
          }
          
          // 2. Exact name match
          if (!matchedExercise && exerciseName) {
            const exactMatch = exercises.find(
              e => e.name.toLowerCase() === exerciseName.toLowerCase()
            );
            if (exactMatch) {
              matchedExercise = exactMatch;
            }
          }
          
          // 3. Name lookup from map
          if (!matchedExercise && exerciseName) {
            matchedExercise = exercisesByName[exerciseName.toLowerCase()];
          }
          
          // 4. Partial name match
          if (!matchedExercise && exerciseName) {
            const partialMatch = exercises.find(
              e => e.name.toLowerCase().includes(exerciseName.toLowerCase()) || 
                   exerciseName.toLowerCase().includes(e.name.toLowerCase())
            );
            if (partialMatch) {
              matchedExercise = partialMatch;
              console.log(`Found partial match for "${exerciseName}": "${partialMatch.name}"`);
            }
          }
          
          // 5. Fallback: use an exercise from the same muscle group if mentioned in name
          if (!matchedExercise && exerciseName) {
            // Extract potential muscle group from the exercise name
            const muscleGroups = [
              'chest', 'back', 'legs', 'shoulders', 'arms', 
              'biceps', 'triceps', 'core', 'abs', 'glutes'
            ];
            
            const potentialMuscleGroup = muscleGroups.find(
              group => exerciseName.toLowerCase().includes(group)
            );
            
            if (potentialMuscleGroup && exercisesByMuscleGroup[potentialMuscleGroup]) {
              const randomIndex = Math.floor(
                Math.random() * exercisesByMuscleGroup[potentialMuscleGroup].length
              );
              matchedExercise = exercisesByMuscleGroup[potentialMuscleGroup][randomIndex];
              console.log(`Using muscle group fallback for "${exerciseName}": "${matchedExercise.name}"`);
            }
          }
          
          // 6. Last resort: random exercise replacement
          if (!matchedExercise) {
            const randomIndex = Math.floor(Math.random() * exercises.length);
            matchedExercise = exercises[randomIndex];
            console.log(`Using random replacement for "${exerciseName}": "${matchedExercise.name}"`);
          }
          
          // Update the exercise information
          if (matchedExercise) {
            exerciseItem.exercise = {
              id: matchedExercise.id,
              name: matchedExercise.name,
              description: matchedExercise.description || '',
              gif_url: matchedExercise.gif_url || '',
              muscle_group: matchedExercise.muscle_group || '',
              exercise_type: matchedExercise.exercise_type || ''
            };
            
            if (!exerciseItem.exercise.id) {
              replacedExerciseCount++;
            }
          }
        });
      }
    });

    console.log(`Processed workout plan: ${missingExerciseCount} missing exercises, ${replacedExerciseCount} replaced exercises`);

    // Return the final workout plan
    return new Response(
      JSON.stringify({ 
        workoutPlan,
        message: "Workout plan generated successfully"
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );

  } catch (error) {
    console.error("Error in workout plan generation:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred" 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
});
