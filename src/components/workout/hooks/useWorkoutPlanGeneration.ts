
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
  const retryCount = useRef(0);
  const MAX_RETRIES = 3; // Increasing max retries to 3 for better resilience

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
      console.log("Calling generateWorkoutPlanWithTrenner2025...");
      const { workoutPlan: generatedPlan, error: generationError, rawResponse: rawResponseData } = 
        await generateWorkoutPlanWithTrenner2025(preferences, user.id, aiSettings || undefined, requestId);
      
      // Store the raw response
      if (rawResponseData) {
        console.log("RAW RESPONSE FROM EDGE FUNCTION:", JSON.stringify(rawResponseData, null, 2));
        setRawResponse(rawResponseData);
      } else {
        console.warn("No raw response data received from edge function");
      }
      
      if (generationError) {
        console.error("Generation error:", generationError);
        throw new Error(generationError);
      }
      
      if (!generatedPlan) {
        console.error("No workout plan generated");
        throw new Error("Não foi possível gerar o plano de treino - resposta vazia");
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
      
      // Reset retry counter on successful generation
      retryCount.current = 0;
    } catch (err: any) {
      console.error("Erro na geração do plano de treino:", err);
      
      // Check if this is a network or edge function connection error
      const isNetworkError = err.message && (
        err.message.includes("Failed to send a request to the Edge Function") ||
        err.message.includes("Failed to fetch") ||
        err.message.includes("Network Error") ||
        err.message.includes("net::ERR") ||
        err.message.includes("ECONNREFUSED") ||
        err.message.includes("timeout") ||
        err.message.includes("AbortError") ||
        err.message.includes("connection closed") ||
        err.message.includes("Connection closed")
      );
      
      if (isNetworkError && retryCount.current < MAX_RETRIES) {
        // Attempt automatic retry for network errors
        retryCount.current += 1;
        toast.warning(`Problema de conexão. Tentando novamente (${retryCount.current}/${MAX_RETRIES})...`);
        
        // Wait a bit before retrying with exponential backoff
        const backoffTime = 1000 * Math.pow(2, retryCount.current - 1); // 1s, 2s, 4s
        console.log(`Retrying in ${backoffTime}ms...`);
        
        setTimeout(() => {
          generationInProgress.current = false;
          generatePlan();
        }, backoffTime);
        return;
      }
      
      // Check for specific Groq API key errors in the error message
      if (err.message) {
        if (err.message.includes("Invalid API Key") || 
            err.message.includes("invalid_api_key") ||
            err.message.includes("Groq API Error") ||
            err.message.includes("Validation errors") ||
            err.message.includes("json_validate_failed")) {
          
          setError(err.message);
          toast.error(err.message);
        } else if (isNetworkError) {
          // Format network error message for better user experience
          const networkErrorMsg = "Erro de conexão com o serviço de geração de plano. Por favor, verifique sua conexão e tente novamente.";
          setError(networkErrorMsg);
          toast.error("Erro de conexão. Tente novamente mais tarde.");
        } else {
          setError(`Erro ao gerar plano de treino: ${err.message}`);
          toast.error(err.message || "Erro ao gerar plano de treino");
        }
      } else {
        setError("Erro desconhecido ao gerar o plano de treino");
        toast.error("Erro desconhecido ao gerar o plano de treino");
      }
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
