
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPlan } from "../types/workout-plan";

export const generateWorkoutPlanWithTrenner2025 = async (
  preferences: any,
  userId: string,
  aiSettings?: any,
  requestId?: string
) => {
  console.log("Generating workout plan with Trenner2025 agent...");
  console.log("Preferences:", preferences);
  console.log("Activity level:", preferences.activity_level, "Training days:", preferences.activity_level === "sedentary" ? 2 : 
                                                          preferences.activity_level === "light" ? 3 : 
                                                          preferences.activity_level === "moderate" ? 5 : 6);

  console.log("Using request ID:", requestId || "none");

  try {
    // First try to use the Llama function
    try {
      console.log("Attempting to use primary edge function for generation");
      const { data, error } = await supabase.functions.invoke('generate-workout-plan-llama', {
        body: {
          preferences,
          userId,
          requestId: requestId || `${userId}_${Date.now()}`
        }
      });
      
      if (error) {
        console.error("Error with Llama function:", error);
        throw error;
      }
      
      if (!data) {
        throw new Error("No data returned from workout plan generator");
      }
      
      console.log("Successfully generated workout plan with primary function");
      return { workoutPlan: data, error: null, rawResponse: data };
      
    } catch (llamaError) {
      console.warn("Error with Llama function, falling back to standard generator:", llamaError);
      
      // Fall back to the basic workout generator
      const { data, error } = await supabase.functions.invoke('generate-workout-plan', {
        body: { preferences, userId }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error("No data returned from workout plan generator");
      }
      
      return { workoutPlan: data, error: null, rawResponse: data };
    }
  } catch (error) {
    console.error("Error generating workout plan:", error);
    return { 
      workoutPlan: null, 
      error: error instanceof Error ? error.message : "Error generating workout plan", 
      rawResponse: null 
    };
  }
};

export const saveWorkoutPlan = async (plan: WorkoutPlan, userId: string) => {
  console.log("Saving workout plan to database");
  return plan;
};

export const updatePlanGenerationCount = async (userId: string) => {
  try {
    const { data: countData, error: countError } = await supabase
      .from('plan_generation_counts')
      .select('workout_count')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (countError) {
      console.error("Error getting count:", countError);
      return;
    }
    
    if (countData) {
      const newCount = (countData.workout_count || 0) + 1;
      await supabase
        .from('plan_generation_counts')
        .update({ workout_count: newCount })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('plan_generation_counts')
        .insert({ user_id: userId, workout_count: 1 });
    }
  } catch (countError) {
    console.error("Error updating count:", countError);
  }
};
