
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
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

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
      
      // Verificar se a chave da API Groq está configurada
      if (!aiSettings || !aiSettings.groq_api_key || aiSettings.groq_api_key.trim() === '') {
        // Se não tiver chave Groq configurada, notificar o usuário
        toast.error("Chave API Groq não configurada. Entre em contato com o administrador.");
        throw new Error("Chave API Groq não configurada. Use a página de administração para configurar.");
      }
      
      // Sanitize preferences
      const safePreferences = sanitizePreferences(preferences);
      
      console.log("Iniciando geração do plano de treino com TRENE2025 via API Groq...");
      
      // Generate plan via edge function with retry logic
      let planData;
      try {
        // Forçar o uso da API Groq, sem permitir plano de fallback
        planData = await generatePlanViaEdgeFunction(safePreferences, user.id, aiSettings, true, true);
        
        if (!planData || !planData.workout_sessions || !Array.isArray(planData.workout_sessions)) {
          throw new Error("Plano de treino gerado é inválido ou incompleto");
        }
        
        console.log("Plano gerado com sucesso:", planData);
      } catch (edgeFunctionError: any) {
        console.error("Erro na função edge:", edgeFunctionError);
        
        // If we've reached max retries, rethrow the error
        if (retryCount >= MAX_RETRIES) {
          throw new Error(`Falha após ${MAX_RETRIES} tentativas: ${edgeFunctionError.message}`);
        }
        
        // Increment retry count and try again with a short delay
        setRetryCount(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return generatePlan(); // Retry the whole process
      }
      
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
      // Reset retry count on success
      setRetryCount(0);
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
