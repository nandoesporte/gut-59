
import { WorkoutPreferences } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPlan } from "../types/workout-plan";

export const getTrainingDaysFromActivity = (activityLevel: string): number => {
  switch (activityLevel) {
    case 'sedentary':
      return 2;
    case 'light':
      return 3;
    case 'moderate':
      return 5;
    case 'intense':
      return 6;
    default:
      return 3;
  }
};

export const generateWorkoutPlanWithTrenner2025 = async (
  preferences: WorkoutPreferences,
  userId: string,
  aiSettings?: any,
  requestId?: string
): Promise<{ workoutPlan: WorkoutPlan | null; error: string | null; rawResponse: any }> => {
  console.log('Generating workout plan with Trenner2025 agent...');
  console.log('Preferences:', JSON.stringify(preferences));
  console.log(`Activity level: ${preferences.activity_level}, Training days: ${getTrainingDaysFromActivity(preferences.activity_level)}`);
  
  if (requestId) {
    console.log(`Using request ID: ${requestId}`);
  }
  
  try {
    // First, attempt to call the regular workout plan function
    const { data: workoutPlanData, error } = await supabase.functions.invoke('generate-workout-plan', {
      body: { 
        preferences,
        userId
      }
    });

    if (error) {
      console.error('Error invoking generate-workout-plan function:', error);
      return {
        workoutPlan: null,
        error: `Erro ao gerar plano de treino: ${error.message || 'Erro desconhecido'}`,
        rawResponse: error
      };
    }
    
    // Ensure the response has the expected structure
    if (!workoutPlanData || !workoutPlanData.workout_sessions) {
      console.error('Workout plan data is missing or incomplete:', workoutPlanData);
      
      // If the workout plan doesn't have workout_sessions, try to fetch the complete plan
      if (workoutPlanData && workoutPlanData.id) {
        console.log('Attempting to fetch complete workout plan with sessions...');
        const { data: fullPlan, error: fetchError } = await supabase
          .from('workout_plans')
          .select(`
            *,
            workout_sessions (
              *,
              session_exercises (
                *,
                exercise:exercises (*)
              )
            )
          `)
          .eq('id', workoutPlanData.id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching complete workout plan:', fetchError);
          return {
            workoutPlan: null,
            error: `Erro ao buscar detalhes do plano de treino: ${fetchError.message}`,
            rawResponse: { originalData: workoutPlanData, fetchError }
          };
        }
        
        if (fullPlan) {
          console.log('Successfully fetched complete workout plan');
          return {
            workoutPlan: fullPlan as WorkoutPlan,
            error: null,
            rawResponse: { originalData: workoutPlanData, fullPlan }
          };
        }
      }
      
      return {
        workoutPlan: null,
        error: 'Resposta incompleta do serviço de plano de treino. Tente novamente.',
        rawResponse: workoutPlanData
      };
    }

    // Make sure the returned data satisfies the WorkoutPlan type
    const validWorkoutPlan: WorkoutPlan = {
      ...workoutPlanData,
      workout_sessions: workoutPlanData.workout_sessions || []
    };

    return {
      workoutPlan: validWorkoutPlan,
      error: null,
      rawResponse: workoutPlanData
    };
    
  } catch (error) {
    console.error('Error in generateWorkoutPlanWithTrenner2025:', error);
    return {
      workoutPlan: null,
      error: `Erro ao gerar plano de treino: ${(error as Error).message || 'Erro desconhecido'}`,
      rawResponse: error
    };
  }
};

export const saveWorkoutPlan = async (plan: WorkoutPlan, userId: string): Promise<WorkoutPlan | null> => {
  try {
    console.log('Saving workout plan to database...');
    
    // Ensure plan has workout_sessions property before saving
    const planToSave: WorkoutPlan = {
      ...plan,
      workout_sessions: plan.workout_sessions || []
    };
    
    const { data, error } = await supabase
      .from('workout_plans')
      .update(planToSave)
      .eq('id', plan.id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving workout plan:', error);
      throw new Error(`Erro ao salvar o plano de treino: ${error.message}`);
    }
    
    // The key fix - the response data doesn't always include the workout_sessions
    // So we need to ensure it's there by creating a proper WorkoutPlan object
    const savedPlan: WorkoutPlan = {
      ...data,
      workout_sessions: plan.workout_sessions || [] // Use the original plan's sessions since they may not be in the response
    };
    
    console.log('Workout plan saved successfully:', savedPlan);
    return savedPlan;
  } catch (error) {
    console.error('Error in saveWorkoutPlan:', error);
    return null;
  }
};

export const updatePlanGenerationCount = async (userId: string): Promise<void> => {
  try {
    console.log('Updating plan generation count for user:', userId);
    
    // Check if the user already has a count
    const { data: existingCount, error: selectError } = await supabase
      .from('plan_generation_counts')
      .select('workout_count')
      .eq('user_id', userId)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing count:', selectError);
      throw new Error(`Erro ao verificar contagem existente: ${selectError.message}`);
    }
    
    if (existingCount) {
      // Increment the count if it exists
      const { error: updateError } = await supabase
        .from('plan_generation_counts')
        .update({ workout_count: existingCount.workout_count + 1 })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error updating plan generation count:', updateError);
        throw new Error(`Erro ao atualizar contagem de geração: ${updateError.message}`);
      }
      
      console.log('Plan generation count incremented successfully');
    } else {
      // Create a new count if it doesn't exist
      const { error: insertError } = await supabase
        .from('plan_generation_counts')
        .insert([{ user_id: userId, workout_count: 1 }]);
      
      if (insertError) {
        console.error('Error creating plan generation count:', insertError);
        throw new Error(`Erro ao criar contagem de geração: ${insertError.message}`);
      }
      
      console.log('Plan generation count created successfully');
    }
  } catch (error) {
    console.error('Error in updatePlanGenerationCount:', error);
  }
};
