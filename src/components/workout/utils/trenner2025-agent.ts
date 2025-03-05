
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPreferences } from "../types";
import { WorkoutPlan } from "../types/workout-plan";
import { MuscleGroup, ExerciseType } from "@/components/admin/exercises/types";

export async function generateWorkoutPlanWithTrenner2025(
  preferences: WorkoutPreferences, 
  userId: string,
  aiSettings?: any,
  requestId?: string
): Promise<{ workoutPlan: WorkoutPlan | null; error: string | null; rawResponse?: any }> {
  try {
    console.log("Generating workout plan with Trenner2025 agent...");
    console.log("Preferences:", JSON.stringify(preferences, null, 2));
    
    // Add a unique request ID to prevent duplicate processing
    const generationRequestId = requestId || `${userId}_${Date.now()}`;
    console.log("Using request ID:", generationRequestId);
    
    // First fetch all exercises to provide to the AI
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("*")
      .order("name");
      
    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      return { workoutPlan: null, error: `Error fetching exercises: ${exercisesError.message}` };
    }
    
    console.log(`Fetched ${exercises.length} exercises from the database`);
    
    // Filter exercises based on preferences to send a relevant subset to the AI
    const filteredExercises = filterExercisesByPreferences(exercises, preferences);
    console.log(`Filtered ${filteredExercises.length} exercises from ${exercises.length} total exercises based on user preferences`);
    
    console.log("Invoking edge function: generate-workout-plan-llama");
    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke('generate-workout-plan-llama', {
      body: { 
        preferences, 
        userId,
        settings: aiSettings,
        requestId: generationRequestId,
        // Pass filtered exercises to the edge function
        exercises: filteredExercises
      }
    });

    const endTime = Date.now();
    console.log(`Edge function completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);

    if (error) {
      console.error("Error invoking generate-workout-plan-llama function:", error);
      
      // Check for specific Groq API key errors in the error message
      if (error.message) {
        if (error.message.includes("Invalid API Key") || 
            error.message.includes("invalid_api_key") ||
            error.message.includes("Groq API Error") ||
            error.message.includes("Validation errors") ||
            error.message.includes("json_validate_failed")) {
          
          return { 
            workoutPlan: null, 
            error: error.message
          };
        }
      }
      
      return { workoutPlan: null, error: `Erro ao gerar plano de treino: ${error.message}` };
    }

    console.log("Received response from edge function");
    
    // Log a resposta completa para diagnóstico
    console.log("EDGE FUNCTION RESPONSE STRUCTURE:", JSON.stringify(Object.keys(data || {}), null, 2));

    if (!data) {
      console.error("No data returned from edge function");
      return { 
        workoutPlan: null, 
        error: "Resposta vazia do serviço de geração de plano de treino", 
        rawResponse: data
      };
    }
    
    if (!data.workoutPlan) {
      console.error("No workout plan in the returned data:", data);
      return { 
        workoutPlan: null, 
        error: "Resposta não contém plano de treino", 
        rawResponse: data
      };
    }

    console.log("Workout plan generated successfully!");
    
    // Process the workout plan to ensure it uses correct exercise data from database
    const processedPlan = processWorkoutPlan(data.workoutPlan, exercises);
    
    // Return the processed workout plan
    return { 
      workoutPlan: processedPlan, 
      error: null,
      rawResponse: data
    };
  } catch (err: any) {
    console.error("Exception in generateWorkoutPlanWithTrenner2025:", err);
    if (err.message && (
        err.message.includes("Groq API Error") || 
        err.message.includes("Invalid API Key") || 
        err.message.includes("invalid_api_key") ||
        err.message.includes("Validation errors") ||
        err.message.includes("json_validate_failed"))) {
      return { 
        workoutPlan: null, 
        error: err.message 
      };
    }
    return { workoutPlan: null, error: err.message };
  }
}

function processWorkoutPlan(workoutPlan: WorkoutPlan, databaseExercises: any[]): WorkoutPlan {
  console.log("Processing workout plan to ensure correct exercise data is used...");
  
  // Create a map of exercise names to database exercises for quick lookup
  const exerciseMap = new Map();
  databaseExercises.forEach(exercise => {
    exerciseMap.set(exercise.name.toLowerCase(), exercise);
    
    // Also map alternative names or variations
    const simplifiedName = exercise.name.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/com\s+halter(es)?/g, '')
      .replace(/com\s+barra/g, '')
      .replace(/com\s+corda/g, '')
      .replace(/na\s+máquina/g, '')
      .trim();
    
    if (simplifiedName !== exercise.name.toLowerCase()) {
      exerciseMap.set(simplifiedName, exercise);
    }
  });
  
  // Process each session and its exercises
  if (workoutPlan.workout_sessions) {
    workoutPlan.workout_sessions.forEach(session => {
      if (session.session_exercises) {
        session.session_exercises.forEach(sessionExercise => {
          if (sessionExercise.exercise) {
            const exerciseName = sessionExercise.exercise.name.toLowerCase();
            
            // Try to find the exercise in our database
            const dbExercise = exerciseMap.get(exerciseName);
            
            if (dbExercise) {
              console.log(`Found database match for exercise "${sessionExercise.exercise.name}"`);
              
              // Replace all exercise data with database data
              // Only include properties that are defined in the Exercise type
              sessionExercise.exercise = {
                id: dbExercise.id,
                name: dbExercise.name,
                description: dbExercise.description,
                gif_url: dbExercise.gif_url, // Use the correct GIF URL from database
                muscle_group: dbExercise.muscle_group,
                exercise_type: dbExercise.exercise_type,
                difficulty: dbExercise.difficulty
              };
            } else {
              console.warn(`No database match found for exercise "${sessionExercise.exercise.name}"`);
              
              // If no match found, keep the exercise but mark the GIF URL to use placeholder
              sessionExercise.exercise.gif_url = null; // Will be replaced with placeholder by formatImageUrl
            }
          }
        });
      }
    });
  }
  
  console.log("Workout plan processing completed");
  return workoutPlan;
}

function filterExercisesByPreferences(exercises: any[], preferences: WorkoutPreferences) {
  let filteredExercises = [...exercises];

  // Filter by preferred exercise types
  if (preferences.preferred_exercise_types && preferences.preferred_exercise_types.length > 0) {
    filteredExercises = filteredExercises.filter(exercise => 
      preferences.preferred_exercise_types.includes(exercise.exercise_type)
    );
  }

  // Filter by available equipment
  if (preferences.available_equipment && preferences.available_equipment.length > 0) {
    if (!preferences.available_equipment.includes("all")) {
      filteredExercises = filteredExercises.filter(exercise => {
        if (!exercise.equipment_needed || exercise.equipment_needed.length === 0) {
          return true; // Include exercises that don't need equipment
        }
        
        return exercise.equipment_needed.some((equipment: string) => 
          preferences.available_equipment.includes(equipment)
        );
      });
    }
  }

  // Consider health conditions when filtering exercises
  if (preferences.health_conditions && preferences.health_conditions.length > 0) {
    console.log(`Considering ${preferences.health_conditions.length} health conditions in exercise selection`);
    
    // Exclude exercises contraindicated for user's health conditions
    filteredExercises = filteredExercises.filter(exercise => {
      if (!exercise.contraindicated_conditions || exercise.contraindicated_conditions.length === 0) {
        return true;
      }
      
      // Check if any of user's health conditions match contraindicated conditions
      return !preferences.health_conditions.some(condition => 
        exercise.contraindicated_conditions.includes(condition)
      );
    });
    
    // Prioritize exercises suitable for user's health conditions
    filteredExercises.sort((a, b) => {
      const aScore = a.suitable_for_conditions ? 
        preferences.health_conditions.filter(c => a.suitable_for_conditions.includes(c)).length : 0;
      const bScore = b.suitable_for_conditions ? 
        preferences.health_conditions.filter(c => b.suitable_for_conditions.includes(c)).length : 0;
      return bScore - aScore; // Higher scores first
    });
  }

  // Ensure we have enough exercises to build a good plan
  if (filteredExercises.length < 30) {
    console.log(`Warning: Only ${filteredExercises.length} exercises match the criteria. Adding more exercises...`);
    
    // Add exercises of preferred types
    const additionalExercises = exercises.filter(exercise => 
      !filteredExercises.includes(exercise) && 
      preferences.preferred_exercise_types.includes(exercise.exercise_type)
    );
    
    filteredExercises = [...filteredExercises, ...additionalExercises];
    
    // If still not enough, add any other exercises
    if (filteredExercises.length < 30) {
      const remainingExercises = exercises.filter(exercise => 
        !filteredExercises.includes(exercise)
      );
      
      filteredExercises = [...filteredExercises, ...remainingExercises.slice(0, 30 - filteredExercises.length)];
    }
    
    console.log(`Added additional exercises. Now using ${filteredExercises.length} exercises.`);
  }

  // Group exercises by muscle groups to ensure balanced distribution
  const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body'];
  const exercisesByMuscleGroup: Record<string, any[]> = {};
  
  // Initialize muscle group arrays
  muscleGroups.forEach(group => {
    exercisesByMuscleGroup[group] = [];
  });
  
  // Distribute exercises to their muscle groups
  filteredExercises.forEach(exercise => {
    const muscleGroup = exercise.muscle_group || 'full_body';
    if (exercisesByMuscleGroup[muscleGroup]) {
      exercisesByMuscleGroup[muscleGroup].push(exercise);
    } else {
      exercisesByMuscleGroup['full_body'].push(exercise);
    }
  });
  
  // Priority map based on exercise type and user goal
  const priorityMap: Record<string, number> = {
    "strength": preferences.goal === "gain_mass" ? 10 : 5,
    "cardio": preferences.goal === "lose_weight" ? 10 : 5,
    "mobility": 3
  };

  // Sort exercises within each muscle group
  Object.keys(exercisesByMuscleGroup).forEach(group => {
    exercisesByMuscleGroup[group].sort((a, b) => {
      // First prioritize exercises with GIFs
      if (a.gif_url && !b.gif_url) return -1;
      if (!a.gif_url && b.gif_url) return 1;
      
      // Then prioritize by exercise type relevance to goal
      const aScore = priorityMap[a.exercise_type] || 0;
      const bScore = priorityMap[b.exercise_type] || 0;
      
      return bScore - aScore; // Higher scores first
    });
  });
  
  // Create a balanced list by taking top exercises from each muscle group
  const organizedExercises: any[] = [];
  const maxPerGroup = 7; // Take up to 7 exercises from each group
  
  muscleGroups.forEach(group => {
    const groupExercises = exercisesByMuscleGroup[group] || [];
    organizedExercises.push(...groupExercises.slice(0, maxPerGroup));
  });
  
  // Add any remaining exercises needed to meet minimum count
  if (organizedExercises.length < 40) {
    let remainingNeeded = 40 - organizedExercises.length;
    let remainingExercises: any[] = [];
    
    muscleGroups.forEach(group => {
      const groupExercises = exercisesByMuscleGroup[group] || [];
      if (groupExercises.length > maxPerGroup) {
        remainingExercises.push(...groupExercises.slice(maxPerGroup));
      }
    });
    
    // Sort remaining by priority
    remainingExercises.sort((a, b) => {
      const aScore = priorityMap[a.exercise_type] || 0;
      const bScore = priorityMap[b.exercise_type] || 0;
      return bScore - aScore;
    });
    
    organizedExercises.push(...remainingExercises.slice(0, remainingNeeded));
  }
  
  console.log(`Final organized exercise count: ${organizedExercises.length}`);
  console.log(`Top muscle groups: ${organizedExercises.slice(0, 6).map(ex => ex.muscle_group).join(', ')}`);

  // Remove unnecessary properties to reduce payload size
  return organizedExercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    muscle_group: ex.muscle_group,
    exercise_type: ex.exercise_type,
    difficulty: ex.difficulty,
    equipment_needed: ex.equipment_needed,
    description: ex.description,
    gif_url: ex.gif_url,
    primary_muscles_worked: ex.primary_muscles_worked,
    secondary_muscles_worked: ex.secondary_muscles_worked,
    suitable_for_conditions: ex.suitable_for_conditions,
    contraindicated_conditions: ex.contraindicated_conditions,
    rest_time_seconds: ex.rest_time_seconds,
    min_sets: ex.min_sets,
    max_sets: ex.max_sets,
    min_reps: ex.min_reps,
    max_reps: ex.max_reps
  }));
}

export async function saveWorkoutPlan(workoutPlan: WorkoutPlan, userId: string): Promise<WorkoutPlan | null> {
  try {
    console.log("Starting to save workout plan to database...");
    
    // Add current date as start date if not provided
    if (!workoutPlan.start_date) {
      const today = new Date();
      workoutPlan.start_date = today.toISOString().split('T')[0];
      
      // Set end date as 4 weeks from start if not provided
      if (!workoutPlan.end_date) {
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 28); // 4 weeks
        workoutPlan.end_date = endDate.toISOString().split('T')[0];
      }
    }

    console.log("Saving main workout plan to workout_plans table...");
    
    // Remove fields that don't exist in the database
    const planData = {
      user_id: userId,
      goal: workoutPlan.goal,
      start_date: workoutPlan.start_date,
      end_date: workoutPlan.end_date
    };
    
    // Insert the main plan details
    const { data: planRecord, error } = await supabase
      .from('workout_plans')
      .insert(planData)
      .select()
      .single();

    if (error) {
      console.error("Error saving workout plan:", error);
      return null;
    }

    // Now that we have the plan ID, we need to save the sessions
    const planId = planRecord.id;
    console.log(`Workout plan saved with ID: ${planId}, now saving sessions...`);
    
    // Save each workout session
    for (const session of workoutPlan.workout_sessions) {
      console.log(`Saving session for day ${session.day_number}...`);
      
      // Remover campos que não existem no banco de dados ou são incompatíveis
      const sessionPayload = {
        plan_id: planId,
        day_number: session.day_number,
        warmup_description: session.warmup_description || "",
        cooldown_description: session.cooldown_description || ""
      };
      
      // Insert the session
      const { data: sessionRecord, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert(sessionPayload)
        .select()
        .single();
      
      if (sessionError) {
        console.error("Error saving workout session:", sessionError);
        continue;
      }
      
      console.log(`Session saved with ID: ${sessionRecord.id}, now saving exercises...`);
      
      // Save each exercise for this session
      for (let i = 0; i < session.session_exercises.length; i++) {
        const sessionExercise = session.session_exercises[i];
        
        // Insert or get the exercise first
        let exerciseId = sessionExercise.exercise.id;
        
        // If the exercise isn't already in the database, add it
        if (!exerciseId || !exerciseId.startsWith('exercise_')) {
          console.log(`Exercise ${sessionExercise.exercise.name} not in database, creating...`);
          
          // Get the muscle group and properly cast it to the expected enum type
          const muscleGroup = (() => {
            const mg = sessionExercise.exercise.muscle_group || 'chest';
            // Make sure the muscle group is one of the valid values
            const validMuscleGroups: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body', 'cardio', 'mobility', 'weight_training', 'stretching', 'ball_exercises', 'resistance_band'];
            return validMuscleGroups.includes(mg as MuscleGroup) ? mg as MuscleGroup : 'chest' as MuscleGroup;
          })();

          // Ensure exercise_type is one of the valid enum values
          const exerciseType = (() => {
            // Convert common variations to valid enum values
            const rawType = String(sessionExercise.exercise.exercise_type || 'strength').toLowerCase();
            
            if (rawType === 'força' || rawType === 'forca' || rawType === 'force') {
              return 'strength' as ExerciseType;
            }
            if (rawType === 'cardio' || rawType === 'cardiovascular' || rawType === 'aerobic') {
              return 'cardio' as ExerciseType;
            }
            if (rawType === 'mobility' || rawType === 'stretching' || rawType === 'flexibility' || rawType === 'mobilidade') {
              return 'mobility' as ExerciseType;
            }
            
            // Default to strength if not recognized
            return 'strength' as ExerciseType;
          })();

          // Create exercise with only the fields that are in the database schema
          const exerciseToInsert = {
            name: sessionExercise.exercise.name,
            description: sessionExercise.exercise.description || '',
            gif_url: sessionExercise.exercise.gif_url || '',
            muscle_group: muscleGroup,
            exercise_type: exerciseType,
            difficulty: 'beginner' as const,
            equipment_needed: ['bodyweight'] as string[],
          };
          
          console.log("Inserting exercise with data:", JSON.stringify(exerciseToInsert, null, 2));
          
          // Insert the exercise with all required fields
          const { data: exerciseData, error: exerciseError } = await supabase
            .from('exercises')
            .insert(exerciseToInsert)
            .select()
            .single();
          
          if (exerciseError) {
            console.error("Error saving exercise:", exerciseError);
            continue;
          }
          
          exerciseId = exerciseData.id;
          console.log(`Created new exercise with ID: ${exerciseId}`);
        }
        
        console.log(`Saving session exercise: ${sessionExercise.exercise.name}`);
        
        // Insert the session exercise - making sure to include the order_in_session field
        const { error: sessionExerciseError } = await supabase
          .from('session_exercises')
          .insert({
            session_id: sessionRecord.id,
            exercise_id: exerciseId,
            sets: sessionExercise.sets,
            reps: sessionExercise.reps,
            rest_time_seconds: sessionExercise.rest_time_seconds,
            order_in_session: i + 1 // Add the required order_in_session field
          });
        
        if (sessionExerciseError) {
          console.error("Error saving session exercise:", sessionExerciseError);
        } else {
          console.log(`Session exercise saved successfully`);
        }
      }
    }

    console.log("Full workout plan saved to database successfully!");
    
    // Return the workout plan with the database ID
    return {
      ...workoutPlan,
      id: planId
    };
  } catch (err) {
    console.error("Exception in saveWorkoutPlan:", err);
    return null;
  }
}

export async function updatePlanGenerationCount(userId: string): Promise<void> {
  try {
    // Check if the user has a count record
    const { data: existingCount, error: countError } = await supabase
      .from('plan_generation_counts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (countError) {
      console.error("Error fetching generation count:", countError);
      return;
    }

    if (existingCount) {
      // Update existing count
      const { error: updateError } = await supabase
        .from('plan_generation_counts')
        .update({
          workout_count: (existingCount.workout_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error("Error updating generation count:", updateError);
      }
    } else {
      // Insert new count record
      const { error: insertError } = await supabase
        .from('plan_generation_counts')
        .insert({
          user_id: userId,
          workout_count: 1,
          meal_count: 0,
          rehab_count: 0
        });

      if (insertError) {
        console.error("Error inserting generation count:", insertError);
      }
    }
  } catch (err) {
    console.error("Exception in updatePlanGenerationCount:", err);
  }
}
