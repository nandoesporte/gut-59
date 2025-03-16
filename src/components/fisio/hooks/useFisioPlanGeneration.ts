
import { useState, useEffect, useRef, useCallback } from "react";
import { FisioPreferences } from "../types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RehabPlan } from "../types/rehab-plan";

const mockProgressData = [
  { day: 1, completion: 0 },
  { day: 2, completion: 0 },
  { day: 3, completion: 0 },
  { day: 4, completion: 0 },
  { day: 5, completion: 0 },
  { day: 6, completion: 0 },
  { day: 7, completion: 0 },
];

export const useFisioPlanGeneration = (
  preferences: FisioPreferences,
  onPlanGenerated?: () => void
) => {
  const [loading, setLoading] = useState(false);
  const [rehabPlan, setRehabPlan] = useState<RehabPlan | null>(null);
  const [progressData, setProgressData] = useState(mockProgressData);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [loadingTime, setLoadingTime] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState<string>("preparing");
  const [planGenerationCount, setPlanGenerationCount] = useState(0);
  
  const generationInProgress = useRef(false);
  const generationAttempted = useRef(false);
  const retryCount = useRef(0);
  const loadingTimer = useRef<NodeJS.Timeout | null>(null);

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

  const getLoadingMessage = () => {
    switch (loadingPhase) {
      case "preparing":
        return `Preparando seu plano de reabilitação...`;
      case "analyzing":
        return `Analisando exercícios ideais para sua condição...`;
      case "generating":
        return `Gerando sequência de exercícios otimizada...`;
      case "finalizing":
        return `Finalizando seu plano personalizado...`;
      default:
        return `Gerando plano de reabilitação...`;
    }
  };

  const generatePlan = useCallback(async () => {
    if (generationInProgress.current) {
      console.log("Rehab plan generation already in progress, skipping...");
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
      console.log("Checking authentication status...");
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Authentication error:", authError);
        throw new Error(`Erro de autenticação: ${authError.message}`);
      }
      
      if (!user) {
        console.error("User not authenticated");
        throw new Error("Usuário não autenticado. Por favor, faça login para gerar um plano de reabilitação.");
      }
      
      console.log("User authenticated:", user.id);
      
      toast.info(getLoadingMessage());
      
      // Call the Supabase edge function to generate the rehab plan
      const { data, error: functionError } = await supabase.functions.invoke('generate-rehab-plan-groq', {
        body: {
          preferences: preferences,
          userId: user.id
        }
      });
      
      if (functionError) {
        console.error("Edge function error:", functionError);
        throw new Error(`Erro ao gerar plano: ${functionError.message}`);
      }
      
      if (!data) {
        console.error("No data returned from edge function");
        throw new Error("Não foi possível gerar o plano de reabilitação - resposta vazia");
      }
      
      console.log("Rehab plan data received:", data);
      
      if (data.error) {
        console.error("Error in rehab plan generation:", data.error);
        throw new Error(data.error);
      }
      
      // Update plan generation count
      try {
        const { data: countData, error: countError } = await supabase
          .from('plan_generation_counts')
          .select('rehab_count')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (countError) {
          console.error("Error getting count:", countError);
        } else if (countData) {
          const newCount = (countData.rehab_count || 0) + 1;
          await supabase
            .from('plan_generation_counts')
            .update({ rehab_count: newCount })
            .eq('user_id', user.id);
          setPlanGenerationCount(newCount);
        } else {
          await supabase
            .from('plan_generation_counts')
            .insert({ user_id: user.id, rehab_count: 1 });
          setPlanGenerationCount(1);
        }
      } catch (countError) {
        console.error("Error updating count:", countError);
      }
      
      // Set the rehab plan data to state
      setRehabPlan(data);
      
      toast.success(`Plano de reabilitação gerado com sucesso!`);
      console.log("Rehab plan generation completed successfully");
      
      if (onPlanGenerated) {
        onPlanGenerated();
      }
      
      retryCount.current = 0;
      setLoadingTime(0);
    } catch (err: any) {
      console.error("Erro na geração do plano de reabilitação:", err);
      
      setError(err.message || "Erro ao gerar plano de reabilitação");
      toast.error(err.message || "Erro ao gerar plano de reabilitação");
    } finally {
      setLoading(false);
      generationInProgress.current = false;
    }
  }, [preferences, onPlanGenerated]);

  useEffect(() => {
    if (!rehabPlan && !loading && !error && !generationInProgress.current && !generationAttempted.current) {
      console.log("Initial rehab plan generation starting...");
      generatePlan();
    }
    
    const fetchGenerationCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('plan_generation_counts')
            .select('rehab_count')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (data) {
            setPlanGenerationCount(data.rehab_count || 0);
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
    rehabPlan, 
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
