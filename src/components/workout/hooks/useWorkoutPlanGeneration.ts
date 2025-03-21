import { useState, useEffect, useRef, useCallback } from "react";
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

export const useWorkoutPlanGeneration = (
  preferences: WorkoutPreferences,
  onPlanGenerated?: () => void
) => {
  const [loading, setLoading] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [progressData, setProgressData] = useState(mockProgressData);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [loadingTime, setLoadingTime] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState<string>("preparing");
  const [planGenerationCount, setPlanGenerationCount] = useState(0);
  
  const generationInProgress = useRef(false);
  const generationAttempted = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;
  const edgeFunctionStarted = useRef(false);
  const loadingTimer = useRef<NodeJS.Timeout | null>(null);
  const userId = useRef<string | null>(null);

  useEffect(() => {
    if (loading) {
      loadingTimer.current = setInterval(() => {
        setLoadingTime(prev => {
          const newTime = prev + 1;
          
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
      setLoadingPhase("preparing");
    }
    
    return () => {
      if (loadingTimer.current) {
        clearInterval(loadingTimer.current);
        loadingTimer.current = null;
      }
    };
  }, [loading, loadingPhase]);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        userId.current = data.user.id;
        console.log("Current user ID:", userId.current);
      }
    };
    
    fetchUserId();
  }, []);

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

  const generatePlan = useCallback(async () => {
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
      console.log("Checking authentication status...");
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Authentication error:", authError);
        throw new Error(`Erro de autenticação: ${authError.message}`);
      }
      
      if (!user) {
        console.error("User not authenticated");
        throw new Error("Usuário não autenticado. Por favor, faça login para gerar um plano de treino.");
      }
      
      console.log("User authenticated:", user.id);
      userId.current = user.id;
      
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
      console.log(`User ID: ${user.id}`);
      
      const timestamp = Date.now();
      const requestId = `${user.id}_${timestamp}`;
      
      const edgeFunctionTimeoutId = setTimeout(() => {
        if (!edgeFunctionStarted.current) {
          console.error("Edge function init timeout - function may be stuck at booted stage");
          throw new Error("Timeout ao iniciar função de geração do plano. A função parece estar presa no estágio inicial.");
        }
      }, 5000);
      
      console.log("Calling generateWorkoutPlanWithTrenner2025...");
      console.log(`Using unique timestamp for variation: ${timestamp}`);
      console.log(`Request ID: ${requestId}`);
      
      try {
        console.log("Attempting to use Llama model first...");
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
          console.error("Generation error with Llama model:", generationError);
          // Don't throw, try fallback instead
          throw new Error(generationError);
        }
        
        if (!generatedPlan) {
          console.error("No workout plan generated with Llama model");
          // Don't throw, try fallback instead
          throw new Error("Não foi possível gerar o plano de treino com o modelo principal - resposta vazia");
        }
        
        console.log("Workout plan successfully generated with Llama model, saving to database...");
        console.log("COMPLETE GENERATED PLAN:", JSON.stringify(generatedPlan, null, 2));
        
        const savedPlan = await saveWorkoutPlan(generatedPlan, user.id);
        
        if (!savedPlan) {
          throw new Error("Erro ao salvar o plano de treino");
        }
        
        setWorkoutPlan(savedPlan);
        
        await updatePlanGenerationCount(user.id);
        setPlanGenerationCount(prev => prev + 1);
        
        const { data: countData } = await supabase
          .from('plan_generation_counts')
          .select('workout_count')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (countData) {
          setPlanGenerationCount(countData.workout_count);
        }
        
        toast.success(`Plano de treino ${activityDesc} gerado com sucesso!`);
        console.log("Workout plan generation and saving completed successfully");
        
        if (onPlanGenerated) {
          onPlanGenerated();
        }
        
        retryCount.current = 0;
        setLoadingTime(0);
        return;
      } catch (llamaError) {
        console.warn("Failed to generate with Llama model, trying fallback method:", llamaError);
        // Continue to fallback
      }
      
      console.log("Using fallback workout plan generation method...");
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
      setPlanGenerationCount(prev => prev + 1);
      
      const { data: countData } = await supabase
        .from('plan_generation_counts')
        .select('workout_count')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (countData) {
        setPlanGenerationCount(countData.workout_count);
      }
      
      toast.success(`Plano de treino ${activityDesc} gerado com sucesso!`);
      console.log("Workout plan generation and saving completed successfully");
      
      if (onPlanGenerated) {
        onPlanGenerated();
      }
      
      retryCount.current = 0;
      setLoadingTime(0);
    } catch (err: any) {
      console.error("Erro na geração do plano de treino:", err);
      
      const isAuthError = err.message && (
        err.message.includes("autenticado") ||
        err.message.includes("autenticação") ||
        err.message.includes("login") ||
        err.message.includes("authentication") ||
        err.message.includes("authenticated")
      );
      
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
        err.message.includes("presa no estágio") ||
        err.message.includes("non-2xx status code")
      );
      
      if (isAuthError) {
        const authErrorMsg = "Você precisa estar autenticado para gerar um plano de treino. Por favor, faça login e tente novamente.";
        setError(authErrorMsg);
        toast.error("Autenticação necessária", {
          description: "Faça login para gerar um plano de treino"
        });
      } else if (isNetworkError) {
        const networkErrorMsg = "Erro de conexão com o serviço de geração de plano. Por favor, verifique sua conexão e tente novamente em alguns minutos.";
        setError(networkErrorMsg);
        toast.error("Erro de conexão. Tente novamente mais tarde.");
      } else {
        setError(`Erro ao gerar plano de treino: ${err.message}`);
        toast.error(err.message || "Erro ao gerar plano de treino");
      }
    } finally {
      setLoading(false);
      generationInProgress.current = false;
    }
  }, [preferences, onPlanGenerated]);

  useEffect(() => {
    if (!workoutPlan && !loading && !error && !generationInProgress.current && !generationAttempted.current) {
      console.log("Initial workout plan generation starting...");
      generatePlan();
    }
    
    const fetchGenerationCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('plan_generation_counts')
            .select('workout_count')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (data) {
            setPlanGenerationCount(data.workout_count);
          }
        }
      } catch (err) {
        console.error("Error fetching plan generation count:", err);
      }
    };
    
    fetchGenerationCount();
  }, [generatePlan]);

  return { 
    loading, 
    workoutPlan, 
    progressData, 
    error, 
    generatePlan, 
    rawResponse,
    loadingTime,
    loadingPhase,
    loadingMessage: getLoadingMessage(),
    planGenerationCount
  };
};
