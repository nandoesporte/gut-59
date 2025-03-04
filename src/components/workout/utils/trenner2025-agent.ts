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
    console.log("Preferences:", preferences);
    
    // Add a unique request ID to prevent duplicate processing
    const generationRequestId = requestId || `${userId}_${Date.now()}`;
    
    // First fetch all exercises to provide to the AI
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("*")
      .order("name");
      
    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      return { workoutPlan: null, error: `Error fetching exercises: ${exercisesError.message}` };
    }
    
    // Filter exercises based on preferences to send a relevant subset to the AI
    const filteredExercises = filterExercisesByPreferences(exercises, preferences);
    console.log(`Filtered ${filteredExercises.length} exercises from ${exercises.length} total exercises based on user preferences`);
    
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

    // Log a resposta completa para diagnóstico
    console.log("COMPLETE EDGE FUNCTION RESPONSE:", JSON.stringify(data, null, 2));

    if (!data || !data.workoutPlan) {
      console.error("No workout plan returned:", data);
      return { 
        workoutPlan: null, 
        error: "Resposta inválida do serviço de geração de plano de treino", 
        rawResponse: data  // Retornando a resposta bruta mesmo em caso de erro
      };
    }

    console.log("Workout plan generated successfully!");
    // Return the workout plan exactly as generated by the AI without modifications
    return { 
      workoutPlan: data.workoutPlan, 
      error: null,
      rawResponse: data  // Retornando a resposta bruta junto com o plano
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

// Helper function to filter exercises based on user preferences
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

  // Sort exercises by relevance to user's goals and preferences
  // This gives the AI the most relevant exercises first in the prompt
  const priorityMap: Record<string, number> = {
    "strength": preferences.goal === "gain_mass" ? 10 : 5,
    "cardio": preferences.goal === "lose_weight" ? 10 : 5,
    "mobility": 3
  };

  filteredExercises.sort((a, b) => {
    // First prioritize exercises with GIFs
    if (a.gif_url && !b.gif_url) return -1;
    if (!a.gif_url && b.gif_url) return 1;
    
    // Then prioritize by exercise type relevance to goal
    const aScore = priorityMap[a.exercise_type] || 0;
    const bScore = priorityMap[b.exercise_type] || 0;
    
    // If scores are equal, prioritize by description completeness
    if (aScore === bScore) {
      const aHasDescription = a.description && a.description.length > 10;
      const bHasDescription = b.description && b.description.length > 10;
      
      if (aHasDescription && !bHasDescription) return -1;
      if (!aHasDescription && bHasDescription) return 1;
    }
    
    return bScore - aScore; // Higher scores first
  });

  console.log(`Exercises sorted by relevance to user goal: ${preferences.goal}`);
  
  // Remove unnecessary properties to reduce payload size
  return filteredExercises.map(ex => ({
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

    // According to the error, we need to structure our insert to match the expected schema
    // Insert the main plan details
    const { data, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        goal: workoutPlan.goal,
        start_date: workoutPlan.start_date,
        end_date: workoutPlan.end_date
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving workout plan:", error);
      return null;
    }

    // Now that we have the plan ID, we need to save the sessions
    const planId = data.id;
    
    // Save each workout session
    for (const session of workoutPlan.workout_sessions) {
      // Insert the session
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          plan_id: planId,
          day_number: session.day_number,
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description
        })
        .select()
        .single();
      
      if (sessionError) {
        console.error("Error saving workout session:", sessionError);
        continue;
      }
      
      // Save each exercise for this session
      for (let i = 0; i < session.session_exercises.length; i++) {
        const sessionExercise = session.session_exercises[i];
        
        // Insert or get the exercise first
        let exerciseId = sessionExercise.exercise.id;
        
        // If the exercise isn't already in the database, add it
        if (!exerciseId.startsWith('exercise_')) {
          // Get the muscle group and properly cast it to the expected enum type
          const muscleGroup = (() => {
            const mg = sessionExercise.exercise.muscle_group || 'chest';
            // Make sure the muscle group is one of the valid values
            const validMuscleGroups: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body', 'cardio', 'mobility', 'weight_training', 'stretching', 'ball_exercises', 'resistance_band'];
            return validMuscleGroups.includes(mg as MuscleGroup) ? mg as MuscleGroup : 'chest' as MuscleGroup;
          })();

          // Create exercise with only the fields that are in the database schema
          const exerciseToInsert = {
            name: sessionExercise.exercise.name,
            description: sessionExercise.exercise.description || '',
            gif_url: sessionExercise.exercise.gif_url || '',
            muscle_group: muscleGroup,
            exercise_type: (sessionExercise.exercise.exercise_type as ExerciseType) || ('strength' as ExerciseType),
            difficulty: 'beginner' as const,
            equipment_needed: ['bodyweight'] as string[],
          };
          
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
        }
        
        // Insert the session exercise - making sure to include the order_in_session field
        const { error: sessionExerciseError } = await supabase
          .from('session_exercises')
          .insert({
            session_id: sessionData.id,
            exercise_id: exerciseId,
            sets: sessionExercise.sets,
            reps: sessionExercise.reps,
            rest_time_seconds: sessionExercise.rest_time_seconds,
            order_in_session: i + 1 // Add the required order_in_session field
          });
        
        if (sessionExerciseError) {
          console.error("Error saving session exercise:", sessionExerciseError);
        }
      }
    }

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
