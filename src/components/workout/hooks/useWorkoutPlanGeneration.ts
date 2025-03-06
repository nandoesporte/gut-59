
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

const mockProgressData = [
  { day: 1, completion: 0 },
  { day: 2, completion: 0 },
  { day: 3, completion: 0 },
  { day: 4, completion: 0 },
  { day: 5, completion: 0 },
  { day: 6, completion: 0 },
  { day: 7, completion: 0 },
];

const activityLevelDescriptions = {
  sedentary: "Sedentário (Terça e Quinta)",
  light: "Leve (Segunda, Quarta e Sexta)",
  moderate: "Moderado (Segunda a Sexta)",
  intense: "Intenso (Segunda a Sábado)"
};

export const useWorkoutPlanGeneration = (preferences: WorkoutPreferences) => {
  const [loading, setLoading] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [progressData, setProgressData] = useState(mockProgressData);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [loadingTime, setLoadingTime] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState<string>("preparing");
  
  const generationInProgress = useRef(false);
  const generationAttempted = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;
  const edgeFunctionStarted = useRef(false);
  const loadingTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading) {
      loadingTimer.current = setInterval(() => {
        setLoadingTime(prev => {
          const newTime = prev + 1;
          
          // Update loading phase based on time
          if (newTime === 5 && loadingPhase === "preparing") {
            setLoadingPhase("analyzing");
          } else if (newTime === 15 && loadingPhase === "analyzing") {
            setLoadingPhase("generating");
          } else if (newTime === 30 && loadingPhase === "generating") {
            setLoadingPhase("finalizing");
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (loadingTimer.current) {
        clearInterval(loadingTimer.current);
        loadingTimer.current = null;
      }
      // Reset loading phase when loading completes
      setLoadingPhase("preparing");
    }
    
    return () => {
      if (loadingTimer.current) {
        clearInterval(loadingTimer.current);
        loadingTimer.current = null;
      }
    };
  }, [loading, loadingPhase]);

  const getLoadingMessage = () => {
    switch (loadingPhase) {
      case "preparing":
        return `Preparando seu plano de treino ${activityLevelDescriptions[preferences.activity_level]}...`;
      case "analyzing":
        return `Analisando exercícios ideais para seu perfil...`;
      case "generating":
        return `Gerando sequência de treinos otimizada...`;
      case "finalizing":
        return `Finalizando seu plano personalizado...`;
      default:
        return `Gerando plano de treino ${activityLevelDescriptions[preferences.activity_level]}...`;
    }
  };

  const generatePlan = async () => {
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
    setLoadingPhase("preparing");
    edgeFunctionStarted.current = false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      
      const activityDesc = activityLevelDescriptions[preferences.activity_level as keyof typeof activityLevelDescriptions] || 
                           "Personalizado";
      
      toast.info(getLoadingMessage());
      
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
      
      const requestId = `${user.id}_${Date.now()}`;
      
      const edgeFunctionTimeoutId = setTimeout(() => {
        if (!edgeFunctionStarted.current) {
          console.error("Edge function init timeout - function may be stuck at booted stage");
          throw new Error("Timeout ao iniciar função de geração do plano. A função parece estar presa no estágio inicial.");
        }
      }, 5000);
      
      console.log("Calling generateWorkoutPlanWithTrenner2025...");
      const { workoutPlan: generatedPlan, error: generationError, rawResponse: rawResponseData } = 
        await generateWorkoutPlanWithTrenner2025(preferences, user.id, aiSettings || undefined, requestId);
      
      clearTimeout(edgeFunctionTimeoutId);
      edgeFunctionStarted.current = true;
      
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
      
      const savedPlan = await saveWorkoutPlan(generatedPlan, user.id);
      
      if (!savedPlan) {
        throw new Error("Erro ao salvar o plano de treino");
      }
      
      setWorkoutPlan(savedPlan);
      
      await updatePlanGenerationCount(user.id);
      
      toast.success(`Plano de treino ${activityDesc} gerado com sucesso!`);
      console.log("Workout plan generation and saving completed successfully");
      
      retryCount.current = 0;
      setLoadingTime(0);
    } catch (err: any) {
      console.error("Erro na geração do plano de treino:", err);
      
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
        retryCount.current += 1;
        toast.warning(`Problema de conexão. Tentando novamente (${retryCount.current}/${MAX_RETRIES})...`);
        
        const backoffTime = 2000 * Math.pow(2, retryCount.current - 1);
        console.log(`Retrying in ${backoffTime}ms...`);
        
        setTimeout(() => {
          generationInProgress.current = false;
          generatePlan();
        }, backoffTime);
        return;
      }
      
      if (err.message) {
        if (err.message.includes("Invalid API Key") || 
            err.message.includes("invalid_api_key") ||
            err.message.includes("Groq API Error") ||
            err.message.includes("Validation errors") ||
            err.message.includes("json_validate_failed")) {
          
          setError(err.message);
          toast.error(err.message);
        } else if (isInitializationError) {
          const initErrorMsg = "Erro de inicialização da função de geração de plano. A função não conseguiu iniciar corretamente. Por favor, tente novamente ou contate o suporte.";
          setError(initErrorMsg);
          toast.error("Erro de inicialização. Tente novamente.");
        } else if (isNetworkError) {
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

  useEffect(() => {
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
    loadingTime,
    loadingPhase,
    loadingMessage: getLoadingMessage()
  };
};
