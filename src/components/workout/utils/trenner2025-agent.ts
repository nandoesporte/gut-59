
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPreferences } from "../types";
import { WorkoutPlan } from "../types/workout-plan";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";

// Timezone configuration
const BRAZIL_TIMEZONE = "America/Sao_Paulo";

export interface WorkoutPlanGenerationResponse {
  workoutPlan: WorkoutPlan | null;
  error: string | null;
}

export async function generateWorkoutPlanWithTrenner2025(
  preferences: WorkoutPreferences,
  userId: string
): Promise<WorkoutPlanGenerationResponse> {
  try {
    // Get AI model settings
    const { data: aiSettings, error: settingsError } = await supabase
      .from('ai_model_settings')
      .select('*')
      .eq('name', 'trene2025')
      .single();
    
    if (settingsError) {
      console.warn("AI model settings not found, will use defaults:", settingsError);
    }
    
    // Ensure preferences arrays are defined before passing to the edge function
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
    
    console.log("Calling edge function with preferences:", safePreferences);
    
    // Verify Groq API key existence if using Llama3 model
    if (aiSettings && (aiSettings.active_model === 'llama3' || aiSettings.active_model === 'groq')) {
      if (!aiSettings.groq_api_key || aiSettings.groq_api_key.trim() === '') {
        return {
          workoutPlan: null,
          error: "Chave API Groq não configurada. Use a página de administração para configurar."
        };
      }
    }
    
    // Call the edge function to generate the workout plan
    const { data, error: functionError } = await supabase.functions.invoke(
      "generate-workout-plan-llama",
      {
        body: { 
          preferences: safePreferences, 
          userId: userId,
          agentName: "Trenner2025",
          settings: aiSettings || null
        },
      }
    );
    
    if (functionError) {
      console.error("Edge function error:", functionError);
      return {
        workoutPlan: null,
        error: `Erro ao gerar plano de treino: ${functionError.message}`
      };
    }
    
    if (!data || !data.workoutPlan) {
      return {
        workoutPlan: null,
        error: "Resposta inválida do gerador de plano de treino"
      };
    }
    
    // Extract the complete plan data
    const planData = data.workoutPlan;
    console.log("Received workout plan data from Trenner2025:", planData);
    
    return {
      workoutPlan: planData,
      error: null
    };
    
  } catch (err: any) {
    console.error("Error in Trenner2025 workout plan generation:", err);
    return {
      workoutPlan: null,
      error: err.message || "Erro ao gerar plano de treino"
    };
  }
}

export async function saveWorkoutPlan(
  planData: any,
  userId: string
): Promise<WorkoutPlan | null> {
  try {
    // Get current date in Brasilia timezone
    const now = new Date();
    const nowBrasilia = formatInTimeZone(now, BRAZIL_TIMEZONE, "yyyy-MM-dd");
    
    // Calculate end date (current date + 7 days) in Brasilia timezone
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endDateBrasilia = formatInTimeZone(endDate, BRAZIL_TIMEZONE, "yyyy-MM-dd");
    
    // First, save the main workout plan (without the sessions)
    const { data: savedPlan, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        goal: planData.goal,
        start_date: planData.start_date || nowBrasilia,
        end_date: planData.end_date || endDateBrasilia,
      })
      .select()
      .single();
    
    if (planError) {
      console.error("Error saving workout plan:", planError);
      throw new Error(`Error saving workout plan: ${planError.message}`);
    }
    
    console.log("Saved main workout plan:", savedPlan);
    
    // Then save each workout session as a separate record
    if (planData.workout_sessions && Array.isArray(planData.workout_sessions)) {
      for (const session of planData.workout_sessions) {
        // Insert the session
        const { data: savedSession, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert({
            plan_id: savedPlan.id,
            day_number: session.day_number,
            warmup_description: session.warmup_description,
            cooldown_description: session.cooldown_description,
          })
          .select()
          .single();
        
        if (sessionError) {
          console.error("Error saving workout session:", sessionError);
          continue; // Skip to the next session if there's an error
        }
        
        console.log("Saved workout session:", savedSession);
        
        // Then save each exercise in the session
        if (session.session_exercises && Array.isArray(session.session_exercises)) {
          for (const exerciseItem of session.session_exercises) {
            // Check if we have a valid exercise object with ID
            if (!exerciseItem.exercise || !exerciseItem.exercise.id) {
              console.warn("Invalid exercise item or missing ID:", exerciseItem);
              continue; // Skip to the next exercise if there's no valid ID
            }
            
            // Insert the session exercise
            const { error: exerciseError } = await supabase
              .from('session_exercises')
              .insert({
                session_id: savedSession.id,
                exercise_id: exerciseItem.exercise.id,
                sets: exerciseItem.sets,
                reps: exerciseItem.reps,
                rest_time_seconds: exerciseItem.rest_time_seconds,
                order_in_session: session.session_exercises.indexOf(exerciseItem),
              });
              
            if (exerciseError) {
              console.error("Error saving exercise:", exerciseError);
            }
          }
        }
      }
    }
    
    // Now fetch the complete workout plan with all its sessions and exercises
    const { data: fetchedPlan, error: fetchError } = await supabase
      .from('workout_plans')
      .select(`
        id, user_id, goal, start_date, end_date,
        workout_sessions (
          id, day_number, warmup_description, cooldown_description,
          session_exercises (
            id, sets, reps, rest_time_seconds, order_in_session,
            exercise:exercise_id (
              id, name, description, gif_url, muscle_group, exercise_type
            )
          )
        )
      `)
      .eq('id', savedPlan.id)
      .single();
      
    if (fetchError) {
      console.error("Error fetching complete workout plan:", fetchError);
      // Still continue as we at least saved the basic plan
    }
    
    // Transform the fetched data to match our WorkoutPlan type
    if (fetchedPlan) {
      // Create a properly typed WorkoutPlan object
      const typedWorkoutPlan: WorkoutPlan = {
        id: fetchedPlan.id,
        user_id: fetchedPlan.user_id,
        goal: fetchedPlan.goal,
        start_date: fetchedPlan.start_date,
        end_date: fetchedPlan.end_date,
        workout_sessions: fetchedPlan.workout_sessions.map(session => ({
          id: session.id,
          day_number: session.day_number,
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description,
          session_exercises: session.session_exercises
            .filter(ex => ex.exercise !== null) // Filter out null exercises
            .map(ex => ({
              id: ex.id,
              sets: ex.sets,
              reps: ex.reps,
              rest_time_seconds: ex.rest_time_seconds,
              exercise: ex.exercise ? {
                id: ex.exercise.id,
                name: ex.exercise.name,
                description: ex.exercise.description || '',
                gif_url: ex.exercise.gif_url || '',
                muscle_group: ex.exercise.muscle_group || '',
                exercise_type: ex.exercise.exercise_type || ''
              } : null
            }))
            .filter(ex => ex.exercise !== null) // Double-check filter for null exercises
        }))
      };
      
      return typedWorkoutPlan;
    } else {
      // Fallback: use the original data but add the saved plan ID
      const fallbackPlan: WorkoutPlan = {
        id: savedPlan.id,
        user_id: userId,
        goal: planData.goal,
        start_date: savedPlan.start_date,
        end_date: savedPlan.end_date,
        workout_sessions: planData.workout_sessions
      };
      return fallbackPlan;
    }
  } catch (error: any) {
    console.error("Error saving workout plan:", error);
    toast.error("Erro ao salvar plano de treino: " + (error.message || "Erro desconhecido"));
    return null;
  }
}

export async function updatePlanGenerationCount(userId: string): Promise<void> {
  try {
    // Check if user has a generation count record
    const { data: countData, error: countError } = await supabase
      .from('plan_generation_counts')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (countError && countError.code !== 'PGRST116') {
      console.error("Error checking plan generation count:", countError);
    }
    
    if (countData) {
      // Update existing record
      await supabase
        .from('plan_generation_counts')
        .update({ 
          workout_count: (countData.workout_count || 0) + 1,
          updated_at: formatInTimeZone(new Date(), BRAZIL_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
        })
        .eq('user_id', userId);
    } else {
      // Insert new record
      await supabase
        .from('plan_generation_counts')
        .insert({
          user_id: userId,
          workout_count: 1,
          nutrition_count: 0,
          rehabilitation_count: 0
        });
    }
  } catch (error) {
    console.error("Error updating plan generation count:", error);
  }
}
