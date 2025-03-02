
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
    // Parse request
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request received with data structure:", Object.keys(requestData));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body format" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    const { preferences, userId, settings } = requestData;
    
    // Detailed logging of request
    console.log(`Request received for user ${userId || 'unknown'}`);
    console.log("AI Model Settings:", settings ? JSON.stringify(settings) : "undefined");
    
    // Input validation with detailed error reporting
    if (!userId) {
      console.error("Missing required parameter: userId");
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    if (!preferences) {
      console.error("Missing required parameter: preferences");
      return new Response(
        JSON.stringify({ error: "Workout preferences are required" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    if (!settings) {
      console.error("Missing required parameter: settings");
      return new Response(
        JSON.stringify({ error: "AI model settings are required" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Safeguard preferences arrays with detailed logging
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
    
    console.log("Processed preferences:", JSON.stringify({
      age: safePreferences.age,
      gender: safePreferences.gender,
      goal: safePreferences.goal,
      activity_level: safePreferences.activity_level,
      preferred_exercise_types: safePreferences.preferred_exercise_types,
      available_equipment: safePreferences.available_equipment
    }));

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

    // Fetch available exercises from the database with better error handling
    let exercises;
    try {
      const { data, error } = await adminSupabase
        .from('exercises')
        .select('*');

      if (error) {
        console.error("Error fetching exercises:", error);
        throw new Error(`Failed to fetch exercises: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.error("No exercises found in the database");
        throw new Error("No exercises found in the database");
      }
      
      exercises = data;
      console.log(`Fetched ${exercises.length} exercises from the database`);
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      return new Response(
        JSON.stringify({ error: dbError.message || "Failed to fetch exercises from the database" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

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

    // Prepare system prompt with fallback handling
    const systemPrompt = settings.use_custom_prompt && settings.system_prompt
      ? settings.system_prompt 
      : `You are TRENE2025, an AI specialized in creating personalized workout plans based on user preferences, physical condition, and goals. Generate a complete 7-day workout plan with detailed exercises, sets, and reps.`;

    // Prepare the workout request prompt with better formatting
    const userPrompt = `
Create a detailed 7-day workout plan for a user with the following information:
- Age: ${safePreferences.age || 'Not specified'}
- Gender: ${safePreferences.gender || 'Not specified'}
- Height: ${safePreferences.height || 'Not specified'} cm
- Weight: ${safePreferences.weight || 'Not specified'} kg
- Goal: ${safePreferences.goal || 'Not specified'}
- Activity Level: ${safePreferences.activity_level || 'Not specified'}
- Training Location: ${safePreferences.training_location || 'Not specified'}
- Available Equipment: ${safePreferences.available_equipment.join(', ') || 'Not specified'}
- Preferred Exercise Types: ${safePreferences.preferred_exercise_types.join(', ') || 'Not specified'}
- Health Conditions: ${safePreferences.health_conditions.join(', ') || 'None'}
- Days Per Week: ${safePreferences.days_per_week || 7}

Include the following for each day:
1. Warmup description
2. Main exercises with sets, reps, and rest times
3. Cooldown description

IMPORTANT FORMAT GUIDELINES:
1. Return a valid JSON object with the structure defined below.
2. For each exercise, use ONLY exercises from this list: ${exercises.slice(0, 20).map(e => e.name).join(', ')}... (and other exercises in the database)
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

    // Call the LLM model with better error handling
    let llmResponse;
    try {
      // Test if the llama-completion endpoint exists first
      console.log("Checking if llama-completion endpoint is available");
      const testResponse = await fetch(`${SUPABASE_URL}/functions/v1/llama-completion`, {
        method: "HEAD",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      if (!testResponse.ok) {
        console.error(`LLM endpoint check failed with status: ${testResponse.status}`);
        throw new Error(`LLM endpoint not available (status ${testResponse.status})`);
      }
      
      console.log("LLM endpoint is available, making completion request");
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
      console.log("LLM Response received, first 200 chars:", 
        llmResponse.completion ? llmResponse.completion.substring(0, 200) + "..." : "No completion property in response");
    } catch (error) {
      console.error("Error calling LLM API:", error);
      return new Response(
        JSON.stringify({ error: `Failed to generate workout plan: ${error.message}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Extract and parse JSON from the completion with better error handling
    let workoutPlan;
    try {
      if (!llmResponse.completion) {
        throw new Error("No completion in LLM response");
      }
      
      // Look for JSON structure in the completion
      const jsonMatch = llmResponse.completion.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("No JSON structure found in the response");
        throw new Error("Could not find valid JSON in the LLM response");
      }
      
      const jsonString = jsonMatch[0];
      console.log("Extracted JSON string, attempting to parse");
      
      try {
        workoutPlan = JSON.parse(jsonString);
        console.log("Successfully parsed workout plan JSON");
      } catch (innerParseError) {
        console.error("JSON parsing error:", innerParseError);
        
        // Try to fix common JSON issues and retry parsing
        const fixedJson = jsonString
          .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')  // Ensure property names are quoted
          .replace(/:\s*'([^']*)'/g, ':"$1"'); // Convert single quotes to double quotes
          
        console.log("Attempting to parse fixed JSON");
        workoutPlan = JSON.parse(fixedJson);
      }
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw response:", llmResponse.completion ? llmResponse.completion.substring(0, 500) : "undefined");
      return new Response(
        JSON.stringify({ 
          error: `Failed to parse workout plan: ${parseError.message}`, 
          rawResponse: llmResponse.completion ? llmResponse.completion.substring(0, 200) + "..." : "undefined"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 422
        }
      );
    }

    // Process and validate the workout plan with better error handling
    if (!workoutPlan) {
      console.error("Workout plan is undefined after parsing");
      return new Response(
        JSON.stringify({ error: "Failed to generate a valid workout plan" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 422 
        }
      );
    }
    
    if (!workoutPlan.workout_sessions || !Array.isArray(workoutPlan.workout_sessions)) {
      console.error("Invalid workout plan structure:", JSON.stringify(workoutPlan));
      
      // Try to adapt the response if it doesn't have the expected structure
      if (workoutPlan.days && Array.isArray(workoutPlan.days)) {
        console.log("Found alternative 'days' array, adapting structure");
        workoutPlan.workout_sessions = workoutPlan.days.map((day, index) => ({
          day_number: index + 1,
          warmup_description: day.warmup || "Standard warm-up: 5 minutes of light cardio followed by dynamic stretching.",
          cooldown_description: day.cooldown || "Standard cool-down: 5 minutes of static stretching.",
          session_exercises: Array.isArray(day.exercises) ? day.exercises.map(ex => ({
            exercise: { name: ex.name },
            sets: ex.sets || 3,
            reps: ex.reps || "8-12",
            rest_time_seconds: ex.rest || 60
          })) : []
        }));
      } else {
        return new Response(
          JSON.stringify({ 
            error: "Invalid workout plan structure: missing workout_sessions array",
            generatedPlan: workoutPlan 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 422 
          }
        );
      }
    }

    // Process each exercise to ensure it has a valid exercise ID
    let missingExerciseCount = 0;
    let replacedExerciseCount = 0;

    workoutPlan.workout_sessions.forEach(session => {
      // Ensure session number is valid
      if (!session.day_number || typeof session.day_number !== 'number') {
        session.day_number = workoutPlan.workout_sessions.indexOf(session) + 1;
      }
      
      // Ensure warmup and cooldown descriptions exist
      if (!session.warmup_description) {
        session.warmup_description = "5 minutes of light cardio followed by dynamic stretching.";
      }
      
      if (!session.cooldown_description) {
        session.cooldown_description = "5 minutes of static stretching focusing on worked muscle groups.";
      }
      
      // Process exercises if they exist
      if (!session.session_exercises) {
        console.warn(`Missing session_exercises array for day ${session.day_number}`);
        session.session_exercises = [];
        return;
      }
      
      if (!Array.isArray(session.session_exercises)) {
        console.warn(`session_exercises is not an array for day ${session.day_number}`);
        session.session_exercises = [];
        return;
      }
      
      session.session_exercises.forEach((exerciseItem, index) => {
        // Skip if we don't have an exercise object
        if (!exerciseItem.exercise) {
          console.warn(`Missing exercise object at day ${session.day_number}, exercise ${index + 1}`);
          missingExerciseCount++;
          
          // Create a placeholder exercise object
          exerciseItem.exercise = { name: "Generic Exercise" };
        }

        // Ensure sets, reps and rest_time_seconds have valid values
        if (!exerciseItem.sets || typeof exerciseItem.sets !== 'number') {
          exerciseItem.sets = 3;
        }
        
        if (!exerciseItem.reps) {
          exerciseItem.reps = "8-12";
        }
        
        if (!exerciseItem.rest_time_seconds || typeof exerciseItem.rest_time_seconds !== 'number') {
          exerciseItem.rest_time_seconds = 60;
        }

        const exerciseName = exerciseItem.exercise.name;
        if (!exerciseName) {
          console.warn(`Missing exercise name at day ${session.day_number}, exercise ${index + 1}`);
          
          // Generate a generic name based on index
          exerciseItem.exercise.name = `Exercise ${index + 1}`;
        }
        
        // Try multiple strategies to resolve exercise ID
        let matchedExercise = null;
        
        // 1. Direct lookup by ID if it exists
        if (exerciseItem.exercise.id) {
          const idMatch = exercises.find(e => e.id === exerciseItem.exercise.id);
          if (idMatch) {
            matchedExercise = idMatch;
            console.log(`Found exact ID match for "${exerciseName}": "${idMatch.name}" (ID: ${idMatch.id})`);
          }
        }
        
        // 2. Exact name match
        if (!matchedExercise && exerciseName) {
          const exactMatch = exercises.find(
            e => e.name.toLowerCase() === exerciseName.toLowerCase()
          );
          if (exactMatch) {
            matchedExercise = exactMatch;
            console.log(`Found exact name match for "${exerciseName}" (ID: ${exactMatch.id})`);
          }
        }
        
        // 3. Name lookup from map
        if (!matchedExercise && exerciseName) {
          matchedExercise = exercisesByName[exerciseName.toLowerCase()];
          if (matchedExercise) {
            console.log(`Found name map match for "${exerciseName}" (ID: ${matchedExercise.id})`);
          }
        }
        
        // 4. Partial name match
        if (!matchedExercise && exerciseName) {
          const partialMatch = exercises.find(
            e => e.name.toLowerCase().includes(exerciseName.toLowerCase()) || 
                 exerciseName.toLowerCase().includes(e.name.toLowerCase())
          );
          if (partialMatch) {
            matchedExercise = partialMatch;
            console.log(`Found partial match for "${exerciseName}": "${partialMatch.name}" (ID: ${partialMatch.id})`);
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
            console.log(`Using muscle group fallback for "${exerciseName}": "${matchedExercise.name}" (ID: ${matchedExercise.id})`);
          }
        }
        
        // 6. Last resort: random exercise replacement
        if (!matchedExercise) {
          const randomIndex = Math.floor(Math.random() * exercises.length);
          matchedExercise = exercises[randomIndex];
          console.log(`Using random replacement for "${exerciseName}": "${matchedExercise.name}" (ID: ${matchedExercise.id})`);
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
    });

    console.log(`Processed workout plan: ${missingExerciseCount} missing exercises, ${replacedExerciseCount} replaced exercises`);
    console.log(`Final workout plan has ${workoutPlan.workout_sessions.length} days and goal: "${workoutPlan.goal}"`);

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
        status: 500
      }
    );
  }
});
