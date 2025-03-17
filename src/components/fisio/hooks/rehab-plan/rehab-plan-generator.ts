
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

  // Função para traduzir textos de aquecimento e resfriamento que venham em inglês
  const traduzirTextos = (plano: any): any => {
    if (!plano) return plano;
    
    try {
      // Traduzir textos no nível principal do plano
      if (plano.overview && typeof plano.overview === 'string') {
        const traducoes = {
          "warmup": "aquecimento",
          "warm up": "aquecimento",
          "warming up": "aquecimento",
          "cooldown": "volta à calma",
          "cool down": "volta à calma",
          "stretching": "alongamento",
          "dynamic stretching": "alongamento dinâmico",
          "static stretching": "alongamento estático"
        };
        
        let textoTraduzido = plano.overview;
        Object.entries(traducoes).forEach(([ingles, portugues]) => {
          const regex = new RegExp(ingles, 'gi');
          textoTraduzido = textoTraduzido.replace(regex, portugues);
        });
        plano.overview = textoTraduzido;
      }
      
      // Traduzir textos nas sessões de reabilitação
      if (Array.isArray(plano.rehab_sessions)) {
        plano.rehab_sessions = plano.rehab_sessions.map((sessao: any) => {
          // Traduzir descrições de aquecimento
          if (sessao.warmup_description && typeof sessao.warmup_description === 'string') {
            let textoAquecimento = sessao.warmup_description;
            
            // Padrões comuns de descrição de aquecimento em inglês
            textoAquecimento = textoAquecimento
              .replace(/(\d+)(?:-| to )(\d+) minute(?:s)? warmup/i, '$1-$2 minutos de aquecimento')
              .replace(/(\d+) minute(?:s)? warmup/i, '$1 minutos de aquecimento')
              .replace(/warmup/gi, 'aquecimento')
              .replace(/warm up/gi, 'aquecimento')
              .replace(/warming up/gi, 'aquecimento')
              .replace(/with light cardio/gi, 'com cardio leve')
              .replace(/with light/gi, 'com leve')
              .replace(/dynamic stretching/gi, 'alongamento dinâmico')
              .replace(/static stretching/gi, 'alongamento estático')
              .replace(/for chest/gi, 'para o peito')
              .replace(/for chest and triceps/gi, 'para peito e tríceps')
              .replace(/for legs/gi, 'para as pernas')
              .replace(/for arms/gi, 'para os braços')
              .replace(/for back/gi, 'para as costas')
              .replace(/and triceps/gi, 'e tríceps')
              .replace(/and shoulders/gi, 'e ombros')
              .replace(/and legs/gi, 'e pernas')
              .replace(/and arms/gi, 'e braços')
              .replace(/and back/gi, 'e costas');
            
            sessao.warmup_description = textoAquecimento;
          }
          
          // Traduzir descrições de resfriamento
          if (sessao.cooldown_description && typeof sessao.cooldown_description === 'string') {
            let textoResfriamento = sessao.cooldown_description;
            
            // Padrões comuns de descrição de resfriamento em inglês
            textoResfriamento = textoResfriamento
              .replace(/(\d+)(?:-| to )(\d+) minute(?:s)? cooldown/i, '$1-$2 minutos de volta à calma')
              .replace(/(\d+) minute(?:s)? cooldown/i, '$1 minutos de volta à calma')
              .replace(/cooldown/gi, 'volta à calma')
              .replace(/cool down/gi, 'volta à calma')
              .replace(/with light cardio/gi, 'com cardio leve')
              .replace(/with light/gi, 'com leve')
              .replace(/dynamic stretching/gi, 'alongamento dinâmico')
              .replace(/static stretching/gi, 'alongamento estático')
              .replace(/for chest/gi, 'para o peito')
              .replace(/for chest and triceps/gi, 'para peito e tríceps')
              .replace(/for legs/gi, 'para as pernas')
              .replace(/for arms/gi, 'para os braços')
              .replace(/for back/gi, 'para as costas')
              .replace(/and triceps/gi, 'e tríceps')
              .replace(/and shoulders/gi, 'e ombros')
              .replace(/and legs/gi, 'e pernas')
              .replace(/and arms/gi, 'e braços')
              .replace(/and back/gi, 'e costas');
            
            sessao.cooldown_description = textoResfriamento;
          }
          
          return sessao;
        });
      }
      
      // Traduzir textos na estrutura 'days' se existir
      if (plano.days && typeof plano.days === 'object') {
        Object.keys(plano.days).forEach(day => {
          const dayData = plano.days[day];
          
          if (dayData.warmup_description && typeof dayData.warmup_description === 'string') {
            let textoAquecimento = dayData.warmup_description;
            
            textoAquecimento = textoAquecimento
              .replace(/(\d+)(?:-| to )(\d+) minute(?:s)? warmup/i, '$1-$2 minutos de aquecimento')
              .replace(/(\d+) minute(?:s)? warmup/i, '$1 minutos de aquecimento')
              .replace(/warmup/gi, 'aquecimento')
              .replace(/warm up/gi, 'aquecimento')
              .replace(/warming up/gi, 'aquecimento')
              .replace(/with light cardio/gi, 'com cardio leve')
              .replace(/with light/gi, 'com leve')
              .replace(/dynamic stretching/gi, 'alongamento dinâmico')
              .replace(/static stretching/gi, 'alongamento estático')
              .replace(/for chest/gi, 'para o peito')
              .replace(/for chest and triceps/gi, 'para peito e tríceps')
              .replace(/for legs/gi, 'para as pernas')
              .replace(/for arms/gi, 'para os braços')
              .replace(/for back/gi, 'para as costas')
              .replace(/and triceps/gi, 'e tríceps')
              .replace(/and shoulders/gi, 'e ombros')
              .replace(/and legs/gi, 'e pernas')
              .replace(/and arms/gi, 'e braços')
              .replace(/and back/gi, 'e costas');
            
            dayData.warmup_description = textoAquecimento;
          }
          
          if (dayData.cooldown_description && typeof dayData.cooldown_description === 'string') {
            let textoResfriamento = dayData.cooldown_description;
            
            textoResfriamento = textoResfriamento
              .replace(/(\d+)(?:-| to )(\d+) minute(?:s)? cooldown/i, '$1-$2 minutos de volta à calma')
              .replace(/(\d+) minute(?:s)? cooldown/i, '$1 minutos de volta à calma')
              .replace(/cooldown/gi, 'volta à calma')
              .replace(/cool down/gi, 'volta à calma')
              .replace(/with light cardio/gi, 'com cardio leve')
              .replace(/with light/gi, 'com leve')
              .replace(/dynamic stretching/gi, 'alongamento dinâmico')
              .replace(/static stretching/gi, 'alongamento estático')
              .replace(/for chest/gi, 'para o peito')
              .replace(/for chest and triceps/gi, 'para peito e tríceps')
              .replace(/for legs/gi, 'para as pernas')
              .replace(/for arms/gi, 'para os braços')
              .replace(/for back/gi, 'para as costas')
              .replace(/and triceps/gi, 'e tríceps')
              .replace(/and shoulders/gi, 'e ombros')
              .replace(/and legs/gi, 'e pernas')
              .replace(/and arms/gi, 'e braços')
              .replace(/and back/gi, 'e costas');
            
            dayData.cooldown_description = textoResfriamento;
          }
        });
      }
    } catch (error) {
      console.error("Erro ao traduzir textos:", error);
    }
    
    return plano;
  };

  const generatePlan = useCallback(async (
    preferences: FisioPreferences,
    onPlanGenerated?: () => void
  ) => {
    if (generationInProgress.current) {
      console.log("Geração de plano de reabilitação já em andamento, pulando...");
      return;
    }
    
    generationInProgress.current = true;
    generationAttempted.current = true;
    setLoading(true);
    setError(null);
    setRawResponse(null);
    setLoadingTime(0);

    try {
      console.log("Verificando status de autenticação...");
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Erro de autenticação:", authError);
        throw new Error(`Erro de autenticação: ${authError.message}`);
      }
      
      if (!user) {
        console.error("Usuário não autenticado");
        throw new Error("Usuário não autenticado. Por favor, faça login para gerar um plano de reabilitação.");
      }
      
      console.log("Usuário autenticado:", user.id);
      
      toast.info(getLoadingMessage());
      
      // Call the Supabase edge function to generate the rehab plan
      const { data, error: functionError } = await supabase.functions.invoke('generate-rehab-plan-groq', {
        body: {
          preferences: preferences,
          userId: user.id
        }
      });
      
      if (functionError) {
        console.error("Erro na função edge:", functionError);
        throw new Error(`Erro ao gerar plano: ${functionError.message}`);
      }
      
      if (!data) {
        console.error("Nenhum dado retornado da função edge");
        throw new Error("Não foi possível gerar o plano de reabilitação - resposta vazia");
      }
      
      console.log("Dados do plano de reabilitação recebidos:", data);
      
      if (data.error) {
        console.error("Erro na geração do plano de reabilitação:", data.error);
        throw new Error(data.error);
      }
      
      // Traduzir textos em inglês para português
      const planoTraduzido = traduzirTextos(data);
      
      // Update plan generation count
      await updatePlanGenerationCount(user.id);
      
      // Set the rehab plan data to state
      setRehabPlan(planoTraduzido);
      
      toast.success(`Plano de reabilitação gerado com sucesso!`);
      console.log("Geração do plano de reabilitação concluída com sucesso");
      
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
