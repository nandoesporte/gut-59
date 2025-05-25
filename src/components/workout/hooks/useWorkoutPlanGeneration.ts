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
  const loadingTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading) {
      loadingTimer.current = setInterval(() => {
        setLoadingTime(prev => {
          const newTime = prev + 1;
          
          if (newTime === 3 && loadingPhase === "preparing") {
            setLoadingPhase("trenner2025");
          } else if (newTime === 8 && loadingPhase === "trenner2025") {
            setLoadingPhase("grok");
          } else if (newTime === 15 && loadingPhase === "grok") {
            setLoadingPhase("generating");
          } else if (newTime === 25 && loadingPhase === "generating") {
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

  const getLoadingMessage = () => {
    switch (loadingPhase) {
      case "preparing":
        return `Preparando ambiente para geração...`;
      case "trenner2025":
        return `🤖 Trenner2025 analisando suas preferências...`;
      case "grok":
        return `🧠 Grok-3 Mini criando seu plano personalizado...`;
      case "generating":
        return `⚡ Gerando sequência de exercícios otimizada...`;
      case "finalizing":
        return `✨ Finalizando seu plano de treino...`;
      default:
        return `Gerando plano de treino ${activityLevelDescriptions[preferences.activity_level]}...`;
    }
  };

  const generatePlan = useCallback(async () => {
    if (generationInProgress.current) {
      console.log("🚫 Geração já em progresso, ignorando nova solicitação...");
      return;
    }
    
    generationInProgress.current = true;
    generationAttempted.current = true;
    setLoading(true);
    setError(null);
    setRawResponse(null);
    setLoadingTime(0);
    setLoadingPhase("preparing");

    try {
      console.log("🔐 Verificando autenticação...");
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("❌ Erro de autenticação:", authError);
        throw new Error(`Erro de autenticação: ${authError.message}`);
      }
      
      if (!user) {
        console.error("❌ Usuário não autenticado");
        throw new Error("Usuário não autenticado. Por favor, faça login para gerar um plano de treino.");
      }
      
      console.log("✅ Usuário autenticado:", user.id);
      
      const activityDesc = activityLevelDescriptions[preferences.activity_level as keyof typeof activityLevelDescriptions] || 
                           "Personalizado";
      
      toast.info("🤖 Trenner2025 iniciando geração do seu plano...");
      
      // Buscar configurações de IA
      setLoadingPhase("trenner2025");
      const { data: aiSettings, error: aiSettingsError } = await supabase
        .from('ai_model_settings')
        .select('*')
        .eq('name', 'trene2025')
        .maybeSingle();
        
      if (aiSettingsError) {
        console.warn("⚠️ Erro ao buscar configurações de IA, usando padrões:", aiSettingsError);
      }
      
      console.log("🏃‍♂️ Iniciando geração com Trenner2025...");
      console.log(`📊 Nível de atividade: ${preferences.activity_level}`);
      
      const timestamp = Date.now();
      const requestId = `trenner2025_${user.id}_${timestamp}`;
      
      setLoadingPhase("grok");
      toast.info("🧠 Grok-3 Mini processando suas preferências...");
      
      console.log("🚀 Chamando generateWorkoutPlanWithTrenner2025...");
      
      const { workoutPlan: generatedPlan, error: generationError, rawResponse: rawResponseData } = 
        await generateWorkoutPlanWithTrenner2025(preferences, user.id, aiSettings || undefined, requestId);
      
      if (rawResponseData) {
        console.log("📋 RAW RESPONSE FROM TRENNER2025:", JSON.stringify(rawResponseData, null, 2));
        setRawResponse(rawResponseData);
      } else {
        console.warn("⚠️ Nenhuma resposta bruta recebida do Trenner2025");
      }
      
      if (generationError) {
        console.error("❌ Erro na geração:", generationError);
        throw new Error(generationError);
      }
      
      if (!generatedPlan) {
        console.error("❌ Nenhum plano gerado");
        throw new Error("Não foi possível gerar o plano de treino - resposta vazia do Trenner2025");
      }
      
      setLoadingPhase("finalizing");
      console.log("💾 Plano gerado com sucesso, salvando na base de dados...");
      console.log("📋 PLANO COMPLETO GERADO:", JSON.stringify(generatedPlan, null, 2));
      
      const savedPlan = await saveWorkoutPlan(generatedPlan, user.id);
      
      if (!savedPlan) {
        throw new Error("Erro ao salvar o plano de treino na base de dados");
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
      
      toast.success(`🎉 Plano ${activityDesc} criado pelo Trenner2025!`);
      console.log("✅ Geração e salvamento completados com sucesso");
      
      if (onPlanGenerated) {
        onPlanGenerated();
      }
      
      retryCount.current = 0;
      setLoadingTime(0);
    } catch (err: any) {
      console.error("💥 Erro na geração do plano de treino:", err);
      
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
        err.message.includes("presa no estágio")
      );
      
      if (isAuthError) {
        const authErrorMsg = "Você precisa estar autenticado para gerar um plano de treino. Por favor, faça login e tente novamente.";
        setError(authErrorMsg);
        toast.error("Autenticação necessária", {
          description: "Faça login para gerar um plano de treino"
        });
      } else if (isNetworkError) {
        const networkErrorMsg = "Erro de conexão com o Trenner2025. Por favor, verifique sua conexão e tente novamente.";
        setError(networkErrorMsg);
        toast.error("Erro de conexão com Trenner2025. Tente novamente mais tarde.");
      } else {
        setError(`Erro no Trenner2025: ${err.message}`);
        toast.error(err.message || "Erro no agente Trenner2025");
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
