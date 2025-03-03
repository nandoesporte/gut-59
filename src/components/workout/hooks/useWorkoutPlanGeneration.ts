
import { useState, useEffect } from "react";
import { WorkoutPreferences } from "../types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPlan } from "../types/workout-plan";
import { getMockProgressData } from "../utils/workout-progress-data";
import { 
  getAIModelSettings, 
  sanitizePreferences, 
  generatePlanViaEdgeFunction, 
  savePlanToDatabase, 
  saveWorkoutSessions, 
  fetchCompletePlan, 
  updatePlanGenerationCount 
} from "../api/workout-api";

export const useWorkoutPlanGeneration = (preferences: WorkoutPreferences) => {
  const [loading, setLoading] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [progressData, setProgressData] = useState(getMockProgressData());
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      
      // Get AI model settings
      const aiSettings = await getAIModelSettings();
      
      // Sanitize preferences
      const safePreferences = sanitizePreferences(preferences);
      
      // Generate plan via edge function
      const planData = await generatePlanViaEdgeFunction(safePreferences, user.id, aiSettings);
      
      // Save the main plan
      const savedPlan = await savePlanToDatabase(planData, user.id);
      
      // Save workout sessions
      await saveWorkoutSessions(planData, savedPlan);
      
      // Fetch the complete plan
      const completePlan = await fetchCompletePlan(savedPlan.id);
      
      if (completePlan) {
        setWorkoutPlan(completePlan);
      } else {
        // Fallback: use the original data but add the saved plan ID
        const fallbackPlan: WorkoutPlan = {
          id: savedPlan.id,
          user_id: user.id,
          goal: planData.goal,
          start_date: savedPlan.start_date,
          end_date: savedPlan.end_date,
          workout_sessions: planData.workout_sessions
        };
        setWorkoutPlan(fallbackPlan);
      }
      
      // Update plan generation count
      await updatePlanGenerationCount(user.id);
      
      toast.success("Plano de treino gerado com sucesso pelo TRENE2025!");
    } catch (err: any) {
      console.error("Erro na geração do plano de treino:", err);
      setError(err.message || "Erro ao gerar plano de treino");
      toast.error(err.message || "Erro ao gerar plano de treino");
    } finally {
      setLoading(false);
    }
  };

  // Generate the plan when the component mounts
  useEffect(() => {
    generatePlan();
  }, []);

  return { loading, workoutPlan, progressData, error, generatePlan };
};
