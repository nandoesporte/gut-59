
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
  console.log("User ID for plan generation:", userId);

  if (!userId) {
    console.error("No user ID provided for workout plan generation");
    return { 
      workoutPlan: null, 
      error: "ID do usuário é obrigatório para gerar um plano de treino", 
      rawResponse: null 
    };
  }

  try {
    // Check if user exists and has proper authentication
    try {
      console.log("Verifying user authentication for:", userId);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Authentication error:", userError);
        throw new Error(`Erro de autenticação: ${userError.message}`);
      }
      
      if (!userData?.user) {
        console.error("No authenticated user found");
        throw new Error("Usuário não autenticado. Por favor, faça login para gerar um plano de treino.");
      }
      
      console.log("User authenticated successfully with ID:", userData.user.id);
      
      // Verify if the authenticated user matches the requested userId
      if (userData.user.id !== userId) {
        console.warn(`Mismatch between authenticated user (${userData.user.id}) and requested userId (${userId})`);
        console.log("Using authenticated user ID instead");
        userId = userData.user.id;
      }
    } catch (authError) {
      console.error("Error during authentication check:", authError);
      throw authError;
    }

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
      console.log("Falling back to standard workout generator with userId:", userId);
      
      // Add more detailed logging for the fallback
      console.log("Fallback function payload:", {
        preferences: JSON.stringify(preferences).substring(0, 200) + "...",
        userId
      });
      
      const { data, error } = await supabase.functions.invoke('generate-workout-plan', {
        body: { 
          preferences, 
          userId 
        }
      });
      
      if (error) {
        console.error("Error with fallback generator:", error);
        throw error;
      }
      
      if (!data) {
        throw new Error("No data returned from workout plan generator");
      }
      
      console.log("Successfully generated workout plan with fallback function");
      return { workoutPlan: data, error: null, rawResponse: data };
    }
  } catch (error) {
    console.error("Error generating workout plan:", error);
    return { 
      workoutPlan: null, 
      error: error instanceof Error ? error.message : "Erro ao gerar plano de treino: Edge Function returned a non-2xx status code", 
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
    console.log("Updating plan generation count for user:", userId);
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
      console.log("Updating existing count to:", newCount);
      await supabase
        .from('plan_generation_counts')
        .update({ workout_count: newCount })
        .eq('user_id', userId);
    } else {
      console.log("Creating new count record for user");
      await supabase
        .from('plan_generation_counts')
        .insert({ user_id: userId, workout_count: 1 });
    }
    console.log("Plan generation count updated successfully");
  } catch (countError) {
    console.error("Error updating count:", countError);
  }
};
