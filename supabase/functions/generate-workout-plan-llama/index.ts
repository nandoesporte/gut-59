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

    // Fetch ALL available exercises from the database
    console.log(`Request ID: ${requestId} - Fetching all exercises from database`);
    const supabase = supabaseClient();
    const { data: allExercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("*")
      .not("gif_url", "is", null) // Ensure we only get exercises with GIFs
      .order("id", { ascending: true }); // This ensures we get a consistent ordering
    
    if (exercisesError) {
      throw new Error(`Error fetching exercises: ${exercisesError.message}`);
    }
    
    if (!allExercises || allExercises.length === 0) {
      throw new Error("No exercises found in the database");
    }
    
    console.log(`Request ID: ${requestId} - Successfully fetched ${allExercises.length} exercises with GIFs`);
    
    // Verify that all exercises have valid names
    const invalidExercises = allExercises.filter(ex => !ex.name || ex.name.trim() === '');
    if (invalidExercises.length > 0) {
      console.warn(`Request ID: ${requestId} - Found ${invalidExercises.length} exercises with missing names`);
      // Fix exercises with missing names
      invalidExercises.forEach(ex => {
        ex.name = `Exercise ${ex.id.substring(0, 8)}`;
      });
    }
    
    // Filter exercises by user preferences if needed
    let exercises = allExercises;
    if (body.preferences.preferred_exercise_types && body.preferences.preferred_exercise_types.length > 0) {
      exercises = exercises.filter(ex => 
        body.preferences.preferred_exercise_types?.includes(ex.exercise_type)
      );
      console.log(`Request ID: ${requestId} - Filtered to ${exercises.length} exercises by preferred types`);
    }
    
    // Set the minimum number of exercises per session
    const minExercisesPerDay = body.preferences.min_exercises_per_day || 6;
    const totalExercisesNeeded = minExercisesPerDay * body.preferences.days_per_week;
    
    // Check if we have enough exercises
    if (exercises.length < totalExercisesNeeded) {
      console.warn(`Request ID: ${requestId} - Not enough exercises for complete plan, using all available exercises`);
      exercises = allExercises; // Fallback to all exercises if filtered set is too small
    }
    
    // Create a more effective shuffle function to ensure true randomness
    const shuffleArray = (array: any[]) => {
      // Fisher-Yates shuffle algorithm
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    
    // Shuffle the exercises for randomness - use our improved shuffle function
    const shuffledExercises = shuffleArray([...exercises]);
    
    // Ensure we have exercises for all major muscle groups
    const muscleGroups = ["chest", "back", "legs", "shoulders", "arms", "core"];
    const exercisesByMuscleGroup: Record<string, any[]> = {};
    
    // Organize exercises by muscle group
    muscleGroups.forEach(group => {
      exercisesByMuscleGroup[group] = shuffledExercises.filter(ex => ex.muscle_group === group);
      console.log(`Request ID: ${requestId} - Found ${exercisesByMuscleGroup[group].length} exercises for ${group}`);
    });
    
    // Make sure we have at least 1 exercise for each muscle group
    const missingGroups = muscleGroups.filter(group => exercisesByMuscleGroup[group].length === 0);
    if (missingGroups.length > 0) {
      console.warn(`Request ID: ${requestId} - Missing exercises for muscle groups: ${missingGroups.join(', ')}`);
      throw new Error(`Não foram encontrados exercícios suficientes para os grupos musculares: ${missingGroups.join(', ')}`);
    }
    
    // Create activity level-specific guidance
    let activityLevelGuidance = "";
    let daysPerWeek = body.preferences.days_per_week;
    
    switch(body.preferences.activity_level) {
      case "sedentary":
        activityLevelGuidance = "For sedentary individuals, create a gentle 2-day per week program that introduces basic exercises with proper form. Focus on full-body workouts with moderate intensity.";
        daysPerWeek = Math.min(daysPerWeek, 2); // Limit to 2 days for sedentary
        break;
      case "light":
        activityLevelGuidance = "For lightly active individuals, design a balanced 3-day per week program that develops foundational strength and conditioning. Include a mix of compound and isolation exercises.";
        daysPerWeek = Math.min(daysPerWeek, 3); // Limit to 3 days for light activity
        break;
      case "moderate":
        activityLevelGuidance = "For moderately active individuals, create a comprehensive 5-day per week program that promotes consistent progress. Follow a structured split targeting different muscle groups on different days.";
        daysPerWeek = Math.min(daysPerWeek, 5); // Limit to 5 days for moderate activity
        break;
      case "intense":
        activityLevelGuidance = "For highly active individuals, design an advanced 6-day per week program that maximizes training stimulus. Incorporate periodization, supersets, and advanced techniques for optimal results.";
        daysPerWeek = Math.min(daysPerWeek, 6); // Limit to 6 days for intense activity
        break;
      default:
        activityLevelGuidance = "Design a balanced program appropriate for the user's activity level.";
    }
    
    // Improved exercise selection algorithm to ensure balanced distribution
    const selectExercisesForPlan = (total: number) => {
      const selectedExercises: any[] = [];
      const usedExerciseIds = new Set<string>();
      
      // Create workout splits based on activity level and days per week
      const createWorkoutSplits = () => {
        if (daysPerWeek <= 3) {
          // For fewer days, use full-body splits
          return Array(daysPerWeek).fill(muscleGroups);
        } else if (daysPerWeek === 4) {
          // 4-day split
          return [
            ["chest", "shoulders", "triceps"],
            ["back", "biceps"],
            ["legs", "core"],
            ["shoulders", "arms", "core"]
          ];
        } else if (daysPerWeek === 5) {
          // 5-day split
          return [
            ["chest", "triceps"],
            ["back", "biceps"],
            ["legs"],
            ["shoulders", "core"],
            ["arms", "core"]
          ];
        } else {
          // 6-day PPL split
          return [
            ["chest", "shoulders", "triceps"],
            ["back", "biceps"],
            ["legs", "core"],
            ["chest", "shoulders", "triceps"],
            ["back", "biceps"],
            ["legs", "core"]
          ];
        }
      };
      
      const workoutSplits = createWorkoutSplits();
      
      // First, ensure we have at least one exercise per muscle group for each workout day
      workoutSplits.forEach((dailySplit, dayIndex) => {
        const dayExercises: any[] = [];
        
        // Get required muscle groups for this day
        const uniqueMuscleGroups = [...new Set(dailySplit)];
        
        // Add at least one exercise for each muscle group in this day's split
        uniqueMuscleGroups.forEach(group => {
          const availableExercises = exercisesByMuscleGroup[group].filter(ex => !usedExerciseIds.has(ex.id));
          
          if (availableExercises.length > 0) {
            const exercise = availableExercises[0];
            dayExercises.push(exercise);
            usedExerciseIds.add(exercise.id);
            exercisesByMuscleGroup[group] = exercisesByMuscleGroup[group].filter(ex => ex.id !== exercise.id);
          }
        });
        
        // If we don't have enough exercises for this day yet, add more from appropriate muscle groups
        while (dayExercises.length < minExercisesPerDay) {
          // Prioritize the muscle groups for this day
          let added = false;
          
          for (const group of uniqueMuscleGroups) {
            const availableExercises = exercisesByMuscleGroup[group].filter(ex => !usedExerciseIds.has(ex.id));
            
            if (availableExercises.length > 0) {
              const exercise = availableExercises[0];
              dayExercises.push(exercise);
              usedExerciseIds.add(exercise.id);
              exercisesByMuscleGroup[group] = exercisesByMuscleGroup[group].filter(ex => ex.id !== exercise.id);
              added = true;
              break;
            }
          }
          
          // If we couldn't add from priority groups, try any other muscle group
          if (!added) {
            let anyExerciseAdded = false;
            
            for (const group of muscleGroups) {
              const availableExercises = exercisesByMuscleGroup[group].filter(ex => !usedExerciseIds.has(ex.id));
              
              if (availableExercises.length > 0) {
                const exercise = availableExercises[0];
                dayExercises.push(exercise);
                usedExerciseIds.add(exercise.id);
                exercisesByMuscleGroup[group] = exercisesByMuscleGroup[group].filter(ex => ex.id !== exercise.id);
                anyExerciseAdded = true;
                break;
              }
            }
            
            // If we still couldn't add any exercise, break the loop to avoid infinite loop
            if (!anyExerciseAdded) break;
          }
        }
        
        // Add all exercises for this day to the selected exercises array
        selectedExercises.push(...dayExercises);
      });
      
      return selectedExercises;
    };
    
    // Get enough exercises for the workout plan using our improved algorithm
    const selectedExercises = selectExercisesForPlan(totalExercisesNeeded);
    
    if (selectedExercises.length < totalExercisesNeeded) {
      console.warn(`Request ID: ${requestId} - Not enough unique exercises available. Have ${selectedExercises.length}, need ${totalExercisesNeeded}`);
    }
    
    console.log(`Request ID: ${requestId} - Selected ${selectedExercises.length} exercises for the workout plan`);
    
    // Create a simplified list of exercises for the LLM
    // Include only the necessary fields and make sure to include the name field
    const exercisesForLLM = selectedExercises.map(e => ({
      id: e.id,
      name: e.name || `Exercise-${e.id.substring(0, 8)}`, // Ensure name is never empty
      muscle_group: e.muscle_group,
      exercise_type: e.exercise_type,
      difficulty: e.difficulty,
      description: e.description || "",
      gif_url: e.gif_url ? `${e.gif_url}?t=${Date.now()}` : null // Add timestamp to avoid caching issues
    }));
    
    // Create system prompt
    const systemPrompt = `You are Trenner, a professional fitness trainer and workout plan designer. 
You create effective, science-based workout plans tailored to individual needs and goals.
You should design a complete workout plan based on the user's specifications, including their fitness goals, level, available equipment, and any health conditions.
Each workout session should have between ${minExercisesPerDay} and 8 exercises, with clear sets, reps, and rest periods.
Provide a comprehensive, structured workout plan for ${daysPerWeek} days per week.
${activityLevelGuidance}
Ensure the plan follows proper exercise science principles like progressive overload, adequate recovery, and muscle group balance.
Create balanced workouts by distributing exercises carefully across different muscle groups.

CRITICAL RULES:
1. Every exercise must be used EXACTLY ONCE throughout the entire workout plan
2. NO EXERCISE can appear in multiple days
3. You MUST use the exact exercise names provided - do not invent new exercises
4. The exercise IDs in your response MUST MATCH the IDs provided in the input list
5. NEVER leave exercise names blank in your response
6. Each workout day should have a unique name/focus (like "Upper Body", "Lower Body", "Push", "Pull", etc.)
7. Always include full details for each exercise including name, ID, and muscle group`;

    // In the userPrompt, add instructions for including weight recommendations
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
- Days per week: ${daysPerWeek}

I need a full workout plan with ${daysPerWeek} different workout sessions. Each day should have AT LEAST ${minExercisesPerDay} different exercises, but no more than 8 exercises.

INCLUDE WEIGHT RECOMMENDATIONS:
- For each exercise, analyze and provide appropriate weight recommendations
- For exercises that have pre-defined weight recommendations, use those recommendations
- For exercises without pre-defined recommendations, suggest appropriate weights based on:
  - The user's experience level (derived from activity_level)
  - The exercise type and muscle group
  - The number of reps (higher reps typically use lighter weights)
- Format recommendations as "Beginners: X, Moderate: Y, Advanced: Z"
- For bodyweight exercises, specify "Bodyweight" or appropriate progression

MOST IMPORTANT RULES:
- Use ONLY the exact exercises from the provided list - DO NOT make up new exercises
- Use the exact name given for each exercise
- ALWAYS include the full exercise name - NEVER leave names blank
- Make sure each exercise name exactly matches the name provided in the exercise list
- NEVER USE THE SAME EXERCISE MORE THAN ONCE IN THE ENTIRE PLAN
- Every exercise can only be used in ONE workout day
- Double check the IDs to make sure no ID appears more than once in your entire response

Here are the exercises you can use:
${exercisesForLLM.map(e => 
  `- ID: ${e.id} | Name: ${e.name} | Muscle Group: ${e.muscle_group}`
).join("\n")}

For each workout day, provide:
1. Day name/focus (e.g., "Day 1: Upper Body" or "Day 1: Push Day")
2. A brief warmup routine specific to that day's focus
3. Main exercises with exact sets, reps, and rest periods
4. Weight recommendations for each exercise (beginner, moderate, advanced levels)
5. A brief cooldown specific to that day's focus

YOUR RESPONSE MUST BE VALID JSON with this exact structure:
{
  "workout_sessions": [
    {
      "day_number": 1,
      "day_name": "Day 1: [Focus]",
      "focus": "[Main Focus]",
      "warmup_description": "5-10 minute warmup...",
      "cooldown_description": "5-minute cooldown...",
      "session_exercises": [
        {
          "exercise": {
            "id": "exact-id-from-list",
            "name": "Exact Exercise Name",
            "description": "Brief description",
            "muscle_group": "primary-muscle-group",
            "gif_url": "will be added automatically"
          },
          "sets": 3,
          "reps": 12,
          "rest_time_seconds": 60,
          "weight_recommendations": {
            "beginner": "5-10kg or specific recommendation",
            "moderate": "15-20kg or appropriate progression",
            "advanced": "25-30kg or advanced variation"
          }
        },
        ... more exercises ...
      ]
    },
    ... more workout days ...
  ],
  "goal": "User's fitness goal",
  "start_date": "2023-06-01",
  "end_date": "2023-07-01"
}

REMEMBER:
- ALL exercise names must be exactly as provided in the list
- ALWAYS use the exact ID provided for each exercise
- NEVER leave the exercise name blank or empty
- VERIFY all exercise IDs are from the provided list
- MAKE SURE no exercise ID is used more than once in the entire plan
- INCLUDE weight recommendations for EVERY exercise`;

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
        temperature: 0.5, // Lower temperature for more deterministic output
        max_tokens: 4000,
        response_format: { type: "json_object" } // Explicitly request JSON format
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Request ID: ${requestId} - Groq API Error:`, errorText);
      
      // Special handling for JSON validation errors
      if (errorText.includes("json_validate_failed")) {
        // Try a fallback approach - create a more structured workout plan directly
        console.log(`Request ID: ${requestId} - JSON validation failed, using fallback approach to generate plan`);
        
        // Create a structured workout plan directly without using the LLM
        const structuredWorkoutPlan = createFallbackWorkoutPlan(
          selectedExercises, 
          daysPerWeek, 
          minExercisesPerDay, 
          body.preferences.goal
        );
        
        return new Response(
          JSON.stringify({
            workoutPlan: structuredWorkoutPlan,
            message: "Workout plan generated using fallback mechanism",
            note: "The LLM-based generation failed with JSON validation issues, so a structural approach was used instead."
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      
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
      
      // Validation: Check and fix exercise data
      if (workoutPlan.workout_sessions) {
        // Create a map to track all exercise IDs used in the plan
        const usedExerciseIds = new Map();
        let hasDuplicates = false;
        let hasEmptyNames = false;
        
        workoutPlan.workout_sessions.forEach((session, sessionIndex) => {
          // Make sure each session has a focus field
          if (!session.focus && session.day_name) {
            const dayNameParts = session.day_name.split(':');
            if (dayNameParts.length > 1) {
              session.focus = dayNameParts[1].trim();
            } else {
              session.focus = "Treino Completo";
            }
          }
          
          if (session.session_exercises) {
            session.session_exercises.forEach((ex, exIndex) => {
              if (ex.exercise) {
                // Check for missing names
                if (!ex.exercise.name || ex.exercise.name.trim() === '') {
                  hasEmptyNames = true;
                  console.warn(`Empty exercise name detected at day ${session.day_number}, exercise ${exIndex + 1}`);
                  
                  // Try to find the exercise in our database by ID
                  const matchingExerciseById = allExercises.find(e => e.id === ex.exercise.id);
                  if (matchingExerciseById && matchingExerciseById.name) {
                    ex.exercise.name = matchingExerciseById.name;
                    console.log(`Fixed empty name by ID lookup: now ${ex.exercise.name}`);
                  } else {
                    // Generate a fallback name using the ID
                    ex.exercise.name = `Exercise ${ex.exercise.id.substring(0, 8)}`;
                    console.log(`Generated fallback name: ${ex.exercise.name}`);
                  }
                }
                
                // Check for missing ID
                if (!ex.exercise.id) {
                  console.warn(`Missing exercise ID at day ${session.day_number}, exercise ${exIndex + 1}`);
                  
                  // Try to find an exercise with matching name
                  const matchingExerciseByName = allExercises.find(e => 
                    e.name && e.name.toLowerCase() === ex.exercise.name.toLowerCase()
                  );
                  
                  if (matchingExerciseByName) {
                    ex.exercise.id = matchingExerciseByName.id;
                    console.log(`Fixed missing ID by name lookup: now ${ex.exercise.id}`);
                  } else {
                    // Generate a random ID as fallback
                    ex.exercise.id = crypto.randomUUID();
                    console.log(`Generated fallback ID: ${ex.exercise.id}`);
                  }
                }
                
                const exerciseId = ex.exercise.id;
                
                // Check for duplicate exercises
                if (usedExerciseIds.has(exerciseId)) {
                  hasDuplicates = true;
                  console.warn(`Duplicate exercise detected: ${ex.exercise.name} (${exerciseId})`);
                  console.warn(`  First used in day ${usedExerciseIds.get(exerciseId).dayNumber}, now in day ${session.day_number}`);
                  
                  // Replace the duplicate with a different, unused exercise
                  const unusedExercise = allExercises.find(e => 
                    !Array.from(usedExerciseIds.keys()).includes(e.id) && 
                    e.muscle_group === ex.exercise.muscle_group &&
                    e.name && e.name.trim() !== '' &&
                    e.gif_url  // Make sure it has a GIF
                  );
                  
                  if (unusedExercise) {
                    console.log(`Replacing duplicate exercise with ${unusedExercise.name} (${unusedExercise.id})`);
                    
                    // Add timestamp to the GIF URL
                    const timestamp = Date.now();
                    let updatedGifUrl = unusedExercise.gif_url;
                    if (updatedGifUrl) {
                      if (updatedGifUrl.includes('?')) {
                        updatedGifUrl = `${updatedGifUrl}&t=${timestamp}`;
                      } else {
                        updatedGifUrl = `${updatedGifUrl}?t=${timestamp}`;
                      }
                    }
                    
                    ex.exercise.id = unusedExercise.id;
                    ex.exercise.name = unusedExercise.name;
                    ex.exercise.description = unusedExercise.description || "";
                    ex.exercise.muscle_group = unusedExercise.muscle_group;
                    ex.exercise.gif_url = updatedGifUrl;
                    
                    // Now record this replacement
                    usedExerciseIds.set(unusedExercise.id, {
                      dayNumber: session.day_number,
                      sessionIndex: sessionIndex,
                      exIndex: exIndex
                    });
                  }
                } else {
                  // Record this exercise as used
                  usedExerciseIds.set(exerciseId, {
                    dayNumber: session.day_number,
                    sessionIndex: sessionIndex,
                    exIndex: exIndex
                  });
                }
                
                // Make sure the exercise exists in our database and has correct data
                const matchingExercise = allExercises.find(e => e.id === exerciseId);
                if (matchingExercise) {
                  // Update the exercise name to exactly match the database
                  ex.exercise.name = matchingExercise.name;
                  
                  // Update the GIF URL to ensure it uses the correct one from the database with timestamp
                  const timestamp = Date.now();
                  const gifUrl = matchingExercise.gif_url;
                  if (gifUrl) {
                    if (gifUrl.includes('?')) {
                      ex.exercise.gif_url = `${gifUrl}&t=${timestamp}`;
                    } else {
                      ex.exercise.gif_url = `${gifUrl}?t=${timestamp}`;
                    }
                  } else {
                    ex.exercise.gif_url = null;
                  }
                } else {
                  console.warn(`Unknown exercise ID: ${exerciseId}. This might be AI hallucination.`);
                }
              }
            });
          }
        });
        
        if (hasDuplicates) {
          console.warn(`Request ID: ${requestId} - Workout plan had duplicates that were fixed`);
        } else {
          console.log(`Request ID: ${requestId} - All exercises in workout plan are unique across days`);
        }
        
        if (hasEmptyNames) {
          console.warn(`Request ID: ${requestId} - Workout plan had empty exercise names that were fixed`);
        }
        
        // Check that each session has enough exercises
        workoutPlan.workout_sessions.forEach((session, index) => {
          if (!session.session_exercises || session.session_exercises.length < minExercisesPerDay) {
            console.warn(`Session ${index + 1} has fewer than ${minExercisesPerDay} exercises, adding more.`);
            
            // Add exercises to reach the minimum
            const additionalNeeded = minExercisesPerDay - (session.session_exercises?.length || 0);
            if (additionalNeeded > 0) {
              session.session_exercises = session.session_exercises || [];
              
              // Find unused exercises
              const unusedExercises = allExercises.filter(e => 
                !Array.from(usedExerciseIds.keys()).includes(e.id) &&
                e.name && e.name.trim() !== '' &&
                e.gif_url // Make sure it has a GIF
              );
              
              // Try to add exercises for missing muscle groups first
              const exerciseMuscleGroups = new Set(session.session_exercises.map(ex => ex.exercise.muscle_group));
              const missingGroups = muscleGroups.filter(g => !exerciseMuscleGroups.has(g));
              
              // Add exercises for missing muscle groups
              for (const group of missingGroups) {
                const unusedForGroup = unusedExercises.filter(e => e.muscle_group === group);
                if (unusedForGroup.length > 0) {
                  const exercise = unusedForGroup[0];
                  
                  // Add timestamp to the GIF URL
                  const timestamp = Date.now();
                  let updatedGifUrl = exercise.gif_url;
                  if (updatedGifUrl) {
                    if (updatedGifUrl.includes('?')) {
                      updatedGifUrl = `${updatedGifUrl}&t=${timestamp}`;
                    } else {
                      updatedGifUrl = `${updatedGifUrl}?t=${timestamp}`;
                    }
                  }
                  
                  session.session_exercises.push({
                    exercise: {
                      id: exercise.id,
                      name: exercise.name,
                      description: exercise.description || "",
                      muscle_group: exercise.muscle_group,
                      gif_url: updatedGifUrl
                    },
                    sets: 3,
                    reps: 12,
                    rest_time_seconds: 60
                  });
                  
                  // Remove this exercise from unusedExercises
                  const index = unusedExercises.findIndex(e => e.id === exercise.id);
                  if (index >= 0) unusedExercises.splice(index, 1);
                  
                  // Record as used
                  usedExerciseIds.set(exercise.id, {
                    dayNumber: session.day_number,
                    sessionIndex: index,
                    exIndex: session.session_exercises.length - 1
                  });
                  
                  // If we've reached the minimum, break
                  if (session.session_exercises.length >= minExercisesPerDay) break;
                }
              }
              
              // If we still need more exercises, add from unused ones regardless of muscle group
              while (session.session_exercises.length < minExercisesPerDay && unusedExercises.length > 0) {
                const exercise = unusedExercises.shift();
                if (!exercise) break;
                
                // Add timestamp to the GIF URL
                const timestamp = Date.now();
                let updatedGifUrl = exercise.gif_url;
                if (updatedGifUrl) {
                  if (updatedGifUrl.includes('?')) {
                    updatedGifUrl = `${updatedGifUrl}&t=${timestamp}`;
                  } else {
                    updatedGifUrl = `${updatedGifUrl}?t=${timestamp}`;
                  }
                }
                
                session.session_exercises.push({
                  exercise: {
                    id: exercise.id,
                    name: exercise.name,
                    description: exercise.description || "",
                    muscle_group: exercise.muscle_group,
                    gif_url: updatedGifUrl
                  },
                  sets: 3,
                  reps: 12,
                  rest_time_seconds: 60
                });
                
                // Record as used
                usedExerciseIds.set(exercise.id, {
                  dayNumber: session.day_number,
                  sessionIndex: index,
                  exIndex: session.session_exercises.length - 1
                });
              }
            }
          }
        });
      }
      
      // Set start and end dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 28); // 4-week program
      
      workoutPlan.start_date = startDate.toISOString().split('T')[0];
      workoutPlan.end_date = endDate.toISOString().split('T')[0];
      
      // Set goal from user preferences
      workoutPlan.goal = body.preferences.goal;
      
    } catch (error) {
      console.error(`Request ID: ${requestId} - Error parsing workout plan JSON:`, error);
      console.log
