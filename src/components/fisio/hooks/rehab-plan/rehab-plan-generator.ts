
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RehabPlan } from "../../types/rehab-plan";
import { FisioPreferences } from "../../types";

interface UseRehabPlanGeneratorProps {
  setLoading: (isLoading: boolean) => void;
  setLoadingTime: (time: number) => void;
  updatePlanGenerationCount: (userId: string) => Promise<void>;
  getLoadingMessage: () => string;
}

interface UseRehabPlanGeneratorReturn {
  rehabPlan: RehabPlan | null;
  setRehabPlan: (plan: RehabPlan | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  rawResponse: any;
  setRawResponse: (response: any) => void;
  generatePlan: (preferences: FisioPreferences, onPlanGenerated?: () => void) => Promise<void>;
}

export const useRehabPlanGenerator = ({
  setLoading,
  setLoadingTime,
  updatePlanGenerationCount,
  getLoadingMessage
}: UseRehabPlanGeneratorProps): UseRehabPlanGeneratorReturn => {
  const [rehabPlan, setRehabPlan] = useState<RehabPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  
  const generationInProgress = { current: false };
  const generationAttempted = { current: false };
  const retryCount = { current: 0 };

  const generatePlan = useCallback(async (
    preferences: FisioPreferences,
    onPlanGenerated?: () => void
  ) => {
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
      await updatePlanGenerationCount(user.id);
      
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
  }, [setLoading, setLoadingTime, setError, updatePlanGenerationCount, getLoadingMessage]);

  return {
    rehabPlan,
    setRehabPlan,
    error,
    setError,
    rawResponse,
    setRawResponse,
    generatePlan
  };
};
