
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPreferences } from "../types";
import { WorkoutPlan } from "../types/workout-plan";

export async function generateWorkoutPlanWithTrenner2025(
  preferences: WorkoutPreferences, 
  userId: string,
  aiSettings?: any
): Promise<{ workoutPlan: WorkoutPlan | null; error: string | null }> {
  try {
    console.log("Generating workout plan with Trenner2025 agent...");
    console.log("Preferences:", preferences);
    
    const { data, error } = await supabase.functions.invoke('generate-workout-plan-llama', {
      body: { 
        preferences, 
        userId,
        settings: aiSettings
      }
    });

    if (error) {
      console.error("Error invoking generate-workout-plan-llama function:", error);
      return { workoutPlan: null, error: `Erro ao gerar plano de treino: ${error.message}` };
    }

    if (!data || !data.workoutPlan) {
      console.error("No workout plan returned:", data);
      return { workoutPlan: null, error: "Resposta inválida do serviço de geração de plano de treino" };
    }

    console.log("Workout plan generated successfully!");
    return { workoutPlan: data.workoutPlan, error: null };
  } catch (err: any) {
    console.error("Exception in generateWorkoutPlanWithTrenner2025:", err);
    return { workoutPlan: null, error: err.message };
  }
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
          // Create exercise with only the fields that are in the database schema
          const exerciseToInsert = {
            description: sessionExercise.exercise.description || '',
            gif_url: sessionExercise.exercise.gif_url || '',
            muscle_group: sessionExercise.exercise.muscle_group || 'chest',
            exercise_type: sessionExercise.exercise.exercise_type || 'strength',
            difficulty: 'beginner' as const, // Default value for required field
            equipment_needed: ['bodyweight'] as string[], // Default equipment
          };
          
          // We'll add the name separately to ensure we're not trying to use a field that doesn't exist
          // Get the table metadata first to confirm the structure
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
