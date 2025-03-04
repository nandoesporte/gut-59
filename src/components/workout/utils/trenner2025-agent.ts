
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

    // Insert into workout_plans table
    const { data, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        plan_data: workoutPlan,
        plan_name: `Plano de ${workoutPlan.goal || 'Treino'} - ${new Date().toLocaleDateString('pt-BR')}`
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving workout plan:", error);
      return null;
    }

    // Return the workout plan with the database ID
    return {
      ...workoutPlan,
      id: data.id
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
