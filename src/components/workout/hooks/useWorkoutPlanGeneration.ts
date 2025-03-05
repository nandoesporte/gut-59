
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

// Map activity level to a readable description
const activityLevelDescriptions = {
  sedentary: "Sedentário (2 dias por semana)",
  light: "Leve (3 dias por semana)",
  moderate: "Moderado (5 dias por semana)",
  intense: "Intenso (6 dias por semana)"
};

export const useWorkoutPlanGeneration = (preferences: WorkoutPreferences) => {
  const [loading, setLoading] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [progressData, setProgressData] = useState(mockProgressData);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [loadingTime, setLoadingTime] = useState(0);
  const generationInProgress = useRef(false);
  const generationAttempted = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;
  const edgeFunctionStarted = useRef(false);
  const loadingTimer = useRef<NodeJS.Timeout | null>(null);

  // Update loading time while loading
  useEffect(() => {
    if (loading) {
      loadingTimer.current = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (loadingTimer.current) {
        clearInterval(loadingTimer.current);
        loadingTimer.current = null;
      }
    }
    
    return () => {
      if (loadingTimer.current) {
        clearInterval(loadingTimer.current);
        loadingTimer.current = null;
      }
    };
  }, [loading]);

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
    setLoadingTime(0);
    edgeFunctionStarted.current = false;
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      
      // Get activity level description for toast
      const activityDesc = activityLevelDescriptions[preferences.activity_level as keyof typeof activityLevelDescriptions] || 
                           "Personalizado";
      
      // Show toast with activity level
      toast.info(`Gerando plano de treino ${activityDesc}...`);
      
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
      console.log(`Activity level: ${preferences.activity_level}`);
      
      // Generate a unique request ID to prevent duplicate processing
      const requestId = `${user.id}_${Date.now()}`;
      
      // Add a timeout to detect if the edge function gets stuck
      const edgeFunctionTimeoutId = setTimeout(() => {
        if (!edgeFunctionStarted.current) {
          console.error("Edge function init timeout - function may be stuck at booted stage");
          throw new Error("Timeout ao iniciar função de geração do plano. A função parece estar presa no estágio inicial.");
        }
      }, 5000); // 5 second timeout to detect initialization issues
      
      // Generate the workout plan using Trenner2025 agent
      console.log("Calling generateWorkoutPlanWithTrenner2025...");
      const { workoutPlan: generatedPlan, error: generationError, rawResponse: rawResponseData } = 
        await generateWorkoutPlanWithTrenner2025(preferences, user.id, aiSettings || undefined, requestId);
      
      // Clear the timeout as the function has responded
      clearTimeout(edgeFunctionTimeoutId);
      edgeFunctionStarted.current = true;
      
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
      
      toast.success(`Plano de treino ${activityDesc} gerado com sucesso!`);
      console.log("Workout plan generation and saving completed successfully");
      
      // Reset retry counter and loading time on successful generation
      retryCount.current = 0;
      setLoadingTime(0);
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
        err.message.includes("Timeout") ||
        err.message.includes("AbortError") ||
        err.message.includes("connection closed") ||
        err.message.includes("Connection closed") ||
        err.message.includes("presa no estágio")
      );
      
      const isInitializationError = err.message && (
        err.message.includes("presa no estágio") ||
        err.message.includes("booted") ||
        err.message.includes("Timeout ao iniciar")
      );
      
      if ((isNetworkError || isInitializationError) && retryCount.current < MAX_RETRIES) {
        // Attempt automatic retry for network errors
        retryCount.current += 1;
        toast.warning(`Problema de conexão. Tentando novamente (${retryCount.current}/${MAX_RETRIES})...`);
        
        // Wait a bit before retrying with exponential backoff
        const backoffTime = 2000 * Math.pow(2, retryCount.current - 1); // 2s, 4s, 8s
        console.log(`Retrying in ${backoffTime}ms...`);
        
        setTimeout(() => {
          generationInProgress.current = false;
          generatePlan();
        }, backoffTime);
        return;
      }
      
      // Format specialized error messages for different error conditions
      if (err.message) {
        if (err.message.includes("Invalid API Key") || 
            err.message.includes("invalid_api_key") ||
            err.message.includes("Groq API Error") ||
            err.message.includes("Validation errors") ||
            err.message.includes("json_validate_failed")) {
          
          setError(err.message);
          toast.error(err.message);
        } else if (isInitializationError) {
          // Specific error message for initialization problems
          const initErrorMsg = "Erro de inicialização da função de geração de plano. A função não conseguiu iniciar corretamente. Por favor, tente novamente ou contate o suporte.";
          setError(initErrorMsg);
          toast.error("Erro de inicialização. Tente novamente.");
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

  return { 
    loading, 
    workoutPlan, 
    progressData, 
    error, 
    generatePlan, 
    rawResponse,
    loadingTime 
  };
};
