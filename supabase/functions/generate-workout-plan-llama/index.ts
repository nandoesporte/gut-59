
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from '@supabase/supabase-js';

// Configure CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Setup Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const llamaApiKey = Deno.env.get('LLAMA_API_KEY') || '';

// Initialize Supabase client with service role for admin access
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// Define muscle group categories for exercise distribution
const muscleGroupCategories = {
  upper: ["chest", "back", "shoulders", "arms"],
  lower: ["legs"],
  core: ["core"],
  fullBody: ["full_body"],
  cardio: ["cardio"],
  mobility: ["mobility"]
};

// Map exercise type to recommended exercise counts
const exerciseTypeDistribution = {
  strength: { count: 6, muscleGroups: ["chest", "back", "shoulders", "arms", "legs", "core"] },
  cardio: { count: 2, muscleGroups: ["cardio"] },
  mobility: { count: 2, muscleGroups: ["mobility"] }
};

serve(async (req) => {
  console.log("Generate workout plan function triggered");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestData = await req.json();
    console.log("Request data received:", JSON.stringify(requestData, null, 2).substring(0, 500) + "...");
    
    // Extract data from the request
    const { preferences, userId, settings } = requestData;
    
    if (!preferences) {
      throw new Error("Missing preferences in request");
    }
    
    if (!userId) {
      throw new Error("Missing user ID in request");
    }
    
    if (!settings) {
      throw new Error("Missing AI model settings in request");
    }
    
    console.log(`Processing workout plan for user ID: ${userId}`);
    console.log(`Using AI model settings for: ${settings.name}`);
    
    // Validate API key
    if (!llamaApiKey) {
      throw new Error("LLAMA_API_KEY is not set in environment variables");
    }
    
    // Fetch all exercises from the database to have a complete pool to select from
    console.log("Fetching all exercises from database...");
    const { data: exercisesData, error: exercisesError } = await adminClient
      .from('exercises')
      .select('*');
    
    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      throw new Error(`Error fetching exercises: ${exercisesError.message}`);
    }
    
    if (!exercisesData || exercisesData.length === 0) {
      throw new Error("No exercises found in database");
    }
    
    console.log(`Retrieved ${exercisesData.length} exercises from database`);
    
    // Match exercises to user preferences
    console.log("Matching exercises to user preferences...");
    const matchedExercises = matchExercisesToPreferences(exercisesData, preferences);
    console.log(`Selected ${matchedExercises.length} exercises based on preferences`);
    
    // Ensure we have a diverse mix of exercises based on muscle groups
    const diverseExercises = ensureDiverseMuscleGroups(matchedExercises);
    console.log(`Diversified exercises across muscle groups, final count: ${diverseExercises.length}`);
    
    // Prepare data for the Trene2025 agent
    console.log("Preparing data for Trene2025 agent analysis...");
    const analysisInput = {
      preferences: preferences,
      selectedExercises: diverseExercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        description: ex.description,
        muscle_group: ex.muscle_group,
        exercise_type: ex.exercise_type,
        difficulty: ex.difficulty,
        equipment_needed: ex.equipment_needed,
        goals: ex.goals,
        is_compound_movement: ex.is_compound_movement,
        primary_muscles_worked: ex.primary_muscles_worked
      }))
    };
    
    // Get the system prompt from settings
    const systemPrompt = settings.system_prompt || "You are Trene2025, a fitness and workout planning assistant.";
    
    // Prepare prompt for the AI model
    const userPrompt = `
    # Workout Plan Generation Request

    ## User Information
    - Age: ${preferences.age || 'Not specified'}
    - Gender: ${preferences.gender || 'Not specified'}
    - Height: ${preferences.height || 'Not specified'} cm
    - Weight: ${preferences.weight || 'Not specified'} kg
    - Activity Level: ${preferences.activityLevel || 'Not specified'}
    - Health Conditions: ${(preferences.healthConditions && preferences.healthConditions.length > 0) ? preferences.healthConditions.join(", ") : 'None'}

    ## Training Preferences
    - Goal: ${preferences.goal || 'General fitness'}
    - Exercise Types: ${(preferences.preferredExerciseTypes && preferences.preferredExerciseTypes.length > 0) ? preferences.preferredExerciseTypes.join(", ") : 'All types'}
    - Available Equipment: ${(preferences.availableEquipment && preferences.availableEquipment.length > 0) ? preferences.availableEquipment.join(", ") : 'Basic equipment'}

    ## Instructions
    Based on the user information and preferences above, create a 7-day workout plan with the following structure:
    
    1. An overall goal for the workout plan
    2. For each day (1-7), include:
       - A warmup description appropriate for the day's exercises
       - A selection of exercises from the provided list, ensuring variety across muscle groups
       - For each exercise, specify sets, reps, and rest time
       - A cooldown description appropriate for the day's exercises
    
    Include rest days as appropriate based on the user's fitness level and goals.
    
    ## Available Exercises
    I have already selected exercises that match the user's preferences and constraints. These exercises are from various muscle groups including: chest, back, legs, shoulders, arms, core, full_body, cardio, and mobility.
    
    ## Output Format
    Return your response as a JSON object with the following structure:
    
    {
      "goal": "Overall goal description",
      "start_date": "YYYY-MM-DD", // Current date
      "end_date": "YYYY-MM-DD", // Current date + 7 days
      "workout_sessions": [
        {
          "day_number": 1,
          "warmup_description": "Detailed warmup instructions",
          "cooldown_description": "Detailed cooldown instructions",
          "session_exercises": [
            {
              "exercise": {
                "id": "exercise-id-from-available-exercises",
                "name": "Exercise name",
                "description": "Exercise description",
                "gif_url": "URL to exercise GIF"
              },
              "sets": 3,
              "reps": 10,
              "rest_time_seconds": 60
            },
            // More exercises for the day...
          ]
        },
        // More days...
      ]
    }
    
    Important: 
    1. DO NOT invent new exercises. ONLY use exercises from the available list.
    2. Ensure you include a variety of muscle groups throughout the week.
    3. Respect the user's fitness level and any health conditions.
    4. DO NOT include ONLY one muscle group per day - mix various muscle groups for a balanced workout.
    5. Return ONLY the JSON object, with no additional text before or after.
    `;

    console.log("Calling AI model with prepared prompt...");
    
    // Call the Llama API
    const response = await fetch('https://api.llamaapi.net/llama', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llamaApiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false,
        max_tokens: 4000,
        temperature: 0.7
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error from Llama API:", errorText);
      throw new Error(`Llama API returned ${response.status}: ${errorText}`);
    }
    
    // Parse the AI response
    console.log("Parsing AI response...");
    const aiResponse = await response.json();
    
    if (!aiResponse || !aiResponse.choices || !aiResponse.choices[0]) {
      console.error("Invalid response from Llama API:", JSON.stringify(aiResponse, null, 2));
      throw new Error("Invalid response from Llama API");
    }
    
    // Extract the content
    const content = aiResponse.choices[0].message.content;
    console.log("Raw AI response content:", content.substring(0, 500) + "...");
    
    // Extract the JSON part
    let workoutPlan;
    try {
      // Try to parse the entire response as JSON first
      workoutPlan = JSON.parse(content);
    } catch (error) {
      console.log("Full response wasn't valid JSON, attempting to extract JSON portion...");
      
      // Look for JSON object pattern
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          workoutPlan = JSON.parse(jsonMatch[0]);
        } catch (innerError) {
          console.error("Error parsing extracted JSON:", innerError);
          throw new Error("Failed to parse workout plan JSON from AI response");
        }
      } else {
        console.error("No JSON object found in AI response");
        throw new Error("No workout plan JSON found in AI response");
      }
    }
    
    // Validate the generated workout plan
    console.log("Validating workout plan structure...");
    if (!workoutPlan || !workoutPlan.workout_sessions || !Array.isArray(workoutPlan.workout_sessions)) {
      console.error("Invalid workout plan structure:", JSON.stringify(workoutPlan, null, 2));
      throw new Error("Invalid workout plan structure from AI response");
    }
    
    // Fill in any missing exercises or details from the matched exercises
    console.log("Enriching workout plan with exercise details...");
    enrichWorkoutPlanWithExerciseDetails(workoutPlan, diverseExercises);
    
    // Return the generated workout plan
    console.log("Successfully generated workout plan, returning response");
    return new Response(
      JSON.stringify({ workoutPlan }),
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
        error: error.message || "Unknown error in workout plan generation",
        details: error.stack || "No stack trace available"
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
  console.log("Starting exercise matching process...");
  
  if (!exercises || exercises.length === 0) {
    console.error("No exercises provided for matching");
    return [];
  }
  
  // Calculate a score for each exercise based on how well it matches preferences
  const scoredExercises = exercises.map(exercise => {
    let score = 100; // Start with a perfect score
    const reasons = [];
    
    // Log meaningful data for debugging
    console.log(`Evaluating exercise: ${exercise.name}, type: ${exercise.exercise_type}, muscle group: ${exercise.muscle_group}`);
    
    // Preferred exercise types
    if (preferences.preferredExerciseTypes && preferences.preferredExerciseTypes.length > 0) {
      if (!preferences.preferredExerciseTypes.includes(exercise.exercise_type)) {
        score -= 20;
        reasons.push("Exercise type not preferred");
      } else {
        score += 10;
        reasons.push("Exercise type matched preference");
      }
    }
    
    // Available equipment
    if (preferences.availableEquipment && preferences.availableEquipment.length > 0 && 
        exercise.equipment_needed && exercise.equipment_needed.length > 0) {
      
      const hasCompatibleEquipment = exercise.equipment_needed.some(eq => 
        preferences.availableEquipment.includes(eq) || eq === "none" || eq === "bodyweight"
      );
      
      if (!hasCompatibleEquipment) {
        score -= 40; // Significant penalty for equipment mismatch
        reasons.push("Required equipment not available");
      } else {
        score += 10;
        reasons.push("Equipment available");
      }
    }
    
    // Difficulty level adjustment based on activity level
    const difficultyMap = {
      "beginner": 1,
      "intermediate": 2,
      "advanced": 3,
      "expert": 4
    };
    
    const activityLevelMap = {
      "sedentary": 1,
      "light": 1.5,
      "moderate": 2,
      "active": 3,
      "very_active": 4
    };
    
    const exerciseDifficultyLevel = difficultyMap[exercise.difficulty] || 2;
    const userActivityLevel = activityLevelMap[preferences.activityLevel] || 2;
    
    // Penalize exercises that are too difficult or too easy based on activity level
    const difficultyDifference = Math.abs(exerciseDifficultyLevel - userActivityLevel);
    if (difficultyDifference > 1) {
      score -= 15 * difficultyDifference;
      reasons.push(`Difficulty mismatch: exercise ${exercise.difficulty} vs user ${preferences.activityLevel}`);
    } else {
      score += 10;
      reasons.push("Appropriate difficulty level");
    }
    
    // Goal alignment
    if (exercise.goals && exercise.goals.length > 0 && preferences.goal) {
      // Map user goals to exercise goals
      const goalMapping = {
        "lose": ["weight_loss", "endurance", "fat_burning"],
        "gain": ["muscle_building", "strength", "hypertrophy"],
        "maintain": ["general_fitness", "endurance", "toning"],
        "strength": ["strength", "power", "muscle_building"],
        "flexibility": ["flexibility", "mobility"],
        "endurance": ["endurance", "cardiovascular"]
      };
      
      const mappedGoals = goalMapping[preferences.goal] || [];
      
      const hasMatchingGoal = exercise.goals.some(g => mappedGoals.includes(g));
      if (hasMatchingGoal) {
        score += 15;
        reasons.push("Exercise aligns with fitness goal");
      } else {
        score -= 10;
        reasons.push("Exercise does not align with fitness goal");
      }
    }
    
    // Health condition considerations
    if (preferences.healthConditions && preferences.healthConditions.length > 0 && 
        exercise.contraindicated_conditions && exercise.contraindicated_conditions.length > 0) {
      
      const hasContraindication = exercise.contraindicated_conditions.some(condition => 
        preferences.healthConditions.some(userCondition => 
          condition.toLowerCase().includes(userCondition.toLowerCase())
        )
      );
      
      if (hasContraindication) {
        score -= 100; // Exclude exercises contraindicated for health conditions
        reasons.push("Exercise contraindicated for health condition");
      }
    }
    
    // Age considerations - adjust based on impact levels for older individuals
    if (preferences.age && preferences.age > 50) {
      if (exercise.exercise_type === "cardio" && 
          !exercise.suitable_for_conditions?.includes("joint_friendly")) {
        score -= 15;
        reasons.push("High-impact exercise less suitable for age");
      }
      
      // Favor exercises with mobility and balance components for older adults
      if (exercise.exercise_type === "mobility" || 
          exercise.primary_muscles_worked?.includes("core")) {
        score += 10;
        reasons.push("Exercise beneficial for age group");
      }
    }
    
    // Log the score and reasons
    console.log(`Final score for ${exercise.name}: ${score}, reasons: ${reasons.join(", ")}`);
    
    return {
      exercise,
      score,
      reasons
    };
  });
  
  // Filter out exercises with very low scores (like contraindicated ones)
  let filteredExercises = scoredExercises.filter(item => item.score > 20);
  
  // Sort exercises by score
  filteredExercises.sort((a, b) => b.score - a.score);
  
  // Log sorted exercises for debugging
  console.log(`Top 5 exercises after scoring:`);
  filteredExercises.slice(0, 5).forEach((item, index) => {
    console.log(`${index + 1}. ${item.exercise.name} (${item.score}): ${item.reasons.join(", ")}`);
  });
  
  // Return just the exercise objects, not the scores
  return filteredExercises.map(item => item.exercise);
}

// Function to ensure diverse muscle group representation in the selected exercises
function ensureDiverseMuscleGroups(exercises) {
  console.log("Ensuring diverse muscle group distribution...");
  
  // Group exercises by muscle group
  const groupedByMuscle = {};
  
  // Initialize groups
  Object.values(muscleGroupCategories).flat().forEach(group => {
    groupedByMuscle[group] = [];
  });
  
  // Populate groups
  exercises.forEach(exercise => {
    if (exercise.muscle_group && groupedByMuscle[exercise.muscle_group]) {
      groupedByMuscle[exercise.muscle_group].push(exercise);
    } else if (exercise.primary_muscles_worked && exercise.primary_muscles_worked.length > 0) {
      // If muscle_group is not set, try to use primary_muscles_worked
      exercise.primary_muscles_worked.forEach(muscle => {
        if (groupedByMuscle[muscle]) {
          groupedByMuscle[muscle].push(exercise);
        }
      });
    } else {
      // Default to full_body if no specific muscle group is identified
      groupedByMuscle["full_body"].push(exercise);
    }
  });
  
  // Log distribution for debugging
  Object.entries(groupedByMuscle).forEach(([group, groupExercises]) => {
    console.log(`${group}: ${groupExercises.length} exercises`);
  });
  
  // Ensure minimum representation from each category
  const result = [];
  const minPerGroup = 2; // Minimum exercises per major muscle group
  
  // Add exercises from each muscle group category
  Object.entries(muscleGroupCategories).forEach(([category, groups]) => {
    console.log(`Processing category: ${category}`);
    
    // Collect all exercises from this category
    const categoryExercises = [];
    groups.forEach(group => {
      if (groupedByMuscle[group] && groupedByMuscle[group].length > 0) {
        categoryExercises.push(...groupedByMuscle[group]);
      }
    });
    
    // Deduplicate (an exercise might be in multiple groups based on primary muscles)
    const uniqueCategoryExercises = Array.from(new Map(
      categoryExercises.map(ex => [ex.id, ex])
    ).values());
    
    // Sort by difficulty to get a balanced set
    uniqueCategoryExercises.sort((a, b) => {
      const diffMap = { "beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4 };
      return (diffMap[a.difficulty] || 2) - (diffMap[b.difficulty] || 2);
    });
    
    // Take min number per group, unless there aren't enough
    const toTake = Math.min(minPerGroup * groups.length, uniqueCategoryExercises.length);
    console.log(`Taking ${toTake} exercises from ${category} category`);
    
    // Add to result, avoiding duplicates
    uniqueCategoryExercises.slice(0, toTake).forEach(ex => {
      if (!result.find(resultEx => resultEx.id === ex.id)) {
        result.push(ex);
      }
    });
  });
  
  // If we have too few exercises, add more from the original list
  if (result.length < 15) {
    console.log(`Only ${result.length} exercises selected, adding more from original list`);
    
    exercises.forEach(ex => {
      if (!result.find(resultEx => resultEx.id === ex.id)) {
        result.push(ex);
        if (result.length >= 20) return; // Cap at 20 total exercises
      }
    });
  }
  
  console.log(`Final selection: ${result.length} exercises`);
  return result;
}

// Function to ensure the workout plan includes all necessary exercise details
function enrichWorkoutPlanWithExerciseDetails(workoutPlan, availableExercises) {
  console.log("Enriching workout plan with complete exercise details...");
  
  if (!workoutPlan.workout_sessions) {
    console.error("No workout sessions found in plan");
    return;
  }
  
  // Create a lookup map for exercises by ID
  const exercisesById = {};
  availableExercises.forEach(ex => {
    if (ex && ex.id) {
      exercisesById[ex.id] = ex;
    }
  });
  
  // Validate and enhance each session
  workoutPlan.workout_sessions.forEach((session, sessionIndex) => {
    console.log(`Processing session ${sessionIndex + 1} (day ${session.day_number})`);
    
    if (!session.session_exercises) {
      session.session_exercises = [];
      console.warn(`No exercises found for session ${sessionIndex + 1}, creating empty array`);
    }
    
    // Validate default fields
    if (!session.warmup_description) {
      session.warmup_description = "Start with 5-10 minutes of light cardio followed by dynamic stretches for the major muscle groups.";
    }
    
    if (!session.cooldown_description) {
      session.cooldown_description = "Finish with 5-10 minutes of static stretching, focusing on the muscles worked during the session.";
    }
    
    // Process each exercise in the session
    session.session_exercises = session.session_exercises.map((exerciseItem, index) => {
      console.log(`Processing exercise ${index + 1} in session ${sessionIndex + 1}`);
      
      // Handle case where exercise is not properly referenced
      if (!exerciseItem.exercise || !exerciseItem.exercise.id) {
        console.warn(`Exercise ${index + 1} in session ${sessionIndex + 1} is missing ID reference`);
        
        // Try to recover if we have a name but no ID
        if (exerciseItem.exercise && exerciseItem.exercise.name) {
          const matchByName = availableExercises.find(ex => 
            ex.name.toLowerCase() === exerciseItem.exercise.name.toLowerCase()
          );
          
          if (matchByName) {
            console.log(`Found matching exercise by name: ${matchByName.name} (${matchByName.id})`);
            exerciseItem.exercise = {
              id: matchByName.id,
              name: matchByName.name,
              description: matchByName.description || "",
              gif_url: matchByName.gif_url || null
            };
          } else {
            console.warn(`Could not find matching exercise for name: ${exerciseItem.exercise.name}`);
            // Return a valid but placeholder exercise item
            return {
              exercise: null,
              sets: exerciseItem.sets || 3,
              reps: exerciseItem.reps || 10,
              rest_time_seconds: exerciseItem.rest_time_seconds || 60
            };
          }
        } else {
          console.warn("Exercise item missing both ID and name, cannot recover");
          // Return a valid but placeholder exercise item
          return {
            exercise: null,
            sets: exerciseItem.sets || 3,
            reps: exerciseItem.reps || 10,
            rest_time_seconds: exerciseItem.rest_time_seconds || 60
          };
        }
      }
      
      // Look up the complete exercise details
      const exerciseId = exerciseItem.exercise.id;
      const completeExercise = exercisesById[exerciseId];
      
      if (!completeExercise) {
        console.warn(`Could not find complete details for exercise ID: ${exerciseId}`);
        // Return the original item if we can't enhance it
        return exerciseItem;
      }
      
      // Enhance with complete data
      return {
        exercise: {
          id: completeExercise.id,
          name: completeExercise.name,
          description: completeExercise.description || "",
          gif_url: completeExercise.gif_url || null,
          muscle_group: completeExercise.muscle_group,
          exercise_type: completeExercise.exercise_type,
          difficulty: completeExercise.difficulty,
          equipment_needed: completeExercise.equipment_needed,
          primary_muscles_worked: completeExercise.primary_muscles_worked,
          secondary_muscles_worked: completeExercise.secondary_muscles_worked
        },
        sets: exerciseItem.sets || completeExercise.min_sets || 3,
        reps: exerciseItem.reps || completeExercise.min_reps || 10,
        rest_time_seconds: exerciseItem.rest_time_seconds || completeExercise.rest_time_seconds || 60
      };
    })
    .filter(item => item.exercise !== null); // Filter out any null exercises
    
    // Ensure we have exercises for each session
    if (session.session_exercises.length === 0) {
      console.warn(`No valid exercises for session ${sessionIndex + 1}, adding fallback exercises`);
      
      // Add some fallback exercises from different muscle groups
      const muscleGroups = ["chest", "back", "legs", "core"];
      muscleGroups.forEach(group => {
        const exercisesForGroup = availableExercises.filter(ex => ex.muscle_group === group);
        
        if (exercisesForGroup.length > 0) {
          const selectedExercise = exercisesForGroup[0];
          session.session_exercises.push({
            exercise: {
              id: selectedExercise.id,
              name: selectedExercise.name,
              description: selectedExercise.description || "",
              gif_url: selectedExercise.gif_url || null
            },
            sets: selectedExercise.min_sets || 3,
            reps: selectedExercise.min_reps || 10,
            rest_time_seconds: selectedExercise.rest_time_seconds || 60
          });
        }
      });
    }
  });
  
  console.log("Workout plan enrichment complete");
}
