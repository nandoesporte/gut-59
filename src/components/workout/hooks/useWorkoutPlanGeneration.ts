
import { useState, useEffect, useRef } from "react";
import { WorkoutPreferences } from "../types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPlan } from "../types/workout-plan";
import { 
  generateWorkoutPlanWithTrenner2025, 
  saveWorkoutPlan, 
  updatePlanGenerationCount 
} from "../utils/trenner2025-agent";

// Mock progress data for now
const mockProgressData = [
  { day: 1, completion: 0 },
  { day: 2, completion: 0 },
  { day: 3, completion: 0 },
  { day: 4, completion: 0 },
  { day: 5, completion: 0 },
  { day: 6, completion: 0 },
  { day: 7, completion: 0 },
];

export const useWorkoutPlanGeneration = (preferences: WorkoutPreferences) => {
  const [loading, setLoading] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [progressData, setProgressData] = useState(mockProgressData);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const generationInProgress = useRef(false);
  const generationAttempted = useRef(false);

  const generatePlan = async () => {
    // Prevent concurrent generations
    if (generationInProgress.current) {
      console.log("Workout plan generation already in progress, skipping...");
      return;
    }
    
    generationInProgress.current = true;
    generationAttempted.current = true;
    setLoading(true);
    setError(null);
    setRawResponse(null);
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      
      // Fetch AI model settings
      const { data: aiSettings, error: aiSettingsError } = await supabase
        .from('ai_model_settings')
        .select('*')
        .eq('name', 'trene2025')
        .maybeSingle();
        
      if (aiSettingsError) {
        console.warn("Erro ao buscar configurações de IA, usando padrões:", aiSettingsError);
      }
      
      console.log("Starting generation of workout plan with Trenner2025...");
      
      // Generate a unique request ID to prevent duplicate processing
      const requestId = `${user.id}_${Date.now()}`;
      
      // Generate the workout plan using Trenner2025 agent
      const { workoutPlan: generatedPlan, error: generationError, rawResponse: rawResponseData } = 
        await generateWorkoutPlanWithTrenner2025(preferences, user.id, aiSettings || undefined, requestId);
      
      // Store the raw response
      if (rawResponseData) {
        console.log("RAW RESPONSE FROM EDGE FUNCTION:", rawResponseData);
        setRawResponse(rawResponseData);
      }
      
      if (generationError) {
        throw new Error(generationError);
      }
      
      if (!generatedPlan) {
        throw new Error("Não foi possível gerar o plano de treino");
      }
      
      console.log("Workout plan successfully generated, saving to database...");
      console.log("COMPLETE GENERATED PLAN:", JSON.stringify(generatedPlan, null, 2));
      
      // Save the workout plan to the database exactly as received from the AI
      const savedPlan = await saveWorkoutPlan(generatedPlan, user.id);
      
      if (!savedPlan) {
        throw new Error("Erro ao salvar o plano de treino");
      }
      
      setWorkoutPlan(savedPlan);
      
      // Update user's plan generation count
      await updatePlanGenerationCount(user.id);
      
      toast.success("Plano de treino gerado com sucesso pelo Trenner2025!");
      console.log("Workout plan generation and saving completed successfully");
    } catch (err: any) {
      console.error("Erro na geração do plano de treino:", err);
      setError(err.message || "Erro ao gerar plano de treino");
      toast.error(err.message || "Erro ao gerar plano de treino");
    } finally {
      setLoading(false);
      generationInProgress.current = false;
    }
  };

  // Generate the plan when the component mounts, but only once
  useEffect(() => {
    // Only generate if we don't have a plan already and haven't attempted generation
    if (!workoutPlan && !loading && !error && !generationInProgress.current && !generationAttempted.current) {
      console.log("Initial workout plan generation starting...");
      generatePlan();
    }
  }, []);

  return { loading, workoutPlan, progressData, error, generatePlan, rawResponse };
};
