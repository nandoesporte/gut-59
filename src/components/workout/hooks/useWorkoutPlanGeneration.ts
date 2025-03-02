
import { useState, useEffect } from "react";
import { WorkoutPreferences } from "../types";
import { WorkoutPlan } from "../types/workout-plan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REWARDS } from '@/constants/rewards';
import { useWallet } from "@/hooks/useWallet";

export const useWorkoutPlanGeneration = (preferences: WorkoutPreferences) => {
  const { addTransaction } = useWallet();
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Erro: Usuário não autenticado em fetchProgressData");
        toast.error("Usuário não autenticado");
        return;
      }

      const { data, error } = await supabase
        .from('workout_progress')
        .select(`
          id,
          difficulty_rating,
          created_at,
          exercise_id,
          exercises (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Erro ao buscar progresso:", error);
        throw error;
      }

      const formattedData = data.map(item => ({
        date: new Date(item.created_at).toLocaleDateString(),
        difficulty: item.difficulty_rating,
        exercise: item.exercises?.name
      }));

      setProgressData(formattedData);
    } catch (error) {
      console.error("Erro ao buscar progresso:", error);
      setError("Erro ao buscar dados de progresso");
    }
  };

  const verifyAccess = async (userId: string) => {
    if (!userId) {
      console.error("verifyAccess: userId está vazio ou indefinido");
      throw new Error("ID do usuário inválido");
    }

    try {
      console.log("Iniciando verificação de acesso...");
      console.log("UserID:", userId);

      // Primeiro, verifica se já existe um acesso ativo
      const { data: existingAccess, error: accessError } = await supabase
        .from('plan_access')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_type', 'workout')
        .eq('is_active', true)
        .maybeSingle();

      if (accessError) {
        console.error("Erro ao verificar acesso existente:", accessError);
        throw new Error("Falha ao verificar acesso existente");
      }

      console.log("Acesso existente:", existingAccess);

      if (existingAccess && !existingAccess.payment_required) {
        console.log("Usuário já possui acesso ativo");
        return { hasAccess: true };
      }

      // Verifica configurações de pagamento
      const { data: settings, error: settingsError } = await supabase
        .from('payment_settings')
        .select('is_active, price')
        .eq('plan_type', 'workout')
        .maybeSingle();

      if (settingsError) {
        console.error("Erro ao buscar configurações de pagamento:", settingsError);
        throw new Error("Erro ao verificar configurações de pagamento");
      }

      console.log("Configurações de pagamento:", settings);

      if (!settings?.is_active) {
        console.log("Pagamento não está ativo, permitindo acesso");
        return { hasAccess: true };
      }

      // Verifica com a edge function
      const { data: grantData, error: grantError } = await supabase.functions.invoke('grant-plan-access', {
        body: { 
          userId, 
          planType: 'workout',
          incrementCount: true
        }
      });

      if (grantError) {
        console.error("Erro na edge function grant-plan-access:", grantError);
        throw new Error("Erro ao verificar acesso ao plano");
      }

      console.log("Resposta da verificação de acesso (edge function):", grantData);

      if (!grantData) {
        console.error("Edge function retornou dados vazios");
        throw new Error("Resposta inválida do servidor");
      }

      return {
        hasAccess: !grantData.requiresPayment,
        price: settings?.price,
        message: grantData.message
      };
    } catch (error) {
      console.error("Erro crítico na verificação de acesso:", error);
      if (error instanceof Error) {
        throw new Error(`Erro na verificação de acesso: ${error.message}`);
      }
      throw new Error("Erro desconhecido na verificação de acesso");
    }
  };

  const generatePlan = async () => {
    try {
      console.log("Iniciando geração do plano de treino com Llama 3");
      setLoading(true);
      setError(null);

      const authResponse = await supabase.auth.getUser();
      console.log("Resposta de autenticação:", authResponse);

      if (authResponse.error) {
        console.error("Erro de autenticação:", authResponse.error);
        throw new Error("Erro ao verificar autenticação");
      }

      const user = authResponse.data.user;
      if (!user) {
        console.error("Usuário não encontrado na sessão");
        throw new Error("Usuário não autenticado");
      }

      console.log("Usuário autenticado:", user.id);
      
      const accessResult = await verifyAccess(user.id);
      console.log("Resultado da verificação de acesso:", accessResult);
      
      if (!accessResult.hasAccess) {
        const message = accessResult.message || "Pagamento necessário para gerar novo plano";
        console.log("Acesso negado:", message);
        toast.error(message);
        setLoading(false);
        return;
      }

      console.log("Acesso permitido, gerando plano com Llama 3...");
      
      // Usamos a nova função generate-workout-plan-llama com log detalhado
      console.log("Chamando edge function com preferências:", preferences);
      const { data: response, error: planError } = await supabase.functions.invoke('generate-workout-plan-llama', {
        body: { 
          preferences, 
          userId: user.id 
        }
      });

      if (planError) {
        console.error("Erro ao gerar plano com Llama 3:", planError);
        throw new Error(planError.message || "Erro ao gerar plano de treino com Llama 3");
      }

      console.log("Resposta da edge function:", response);

      if (!response) {
        console.error("Nenhum plano foi retornado da edge function Llama 3");
        throw new Error("Nenhum plano foi gerado");
      }

      console.log("Plano gerado com sucesso usando Llama 3");
      await addTransaction({
        amount: REWARDS.WORKOUT_PLAN,
        type: 'workout_plan',
        description: 'Geração de plano de treino com Llama 3'
      });
      
      setWorkoutPlan(response);
      toast.success(`Plano de treino personalizado gerado com Llama 3! +${REWARDS.WORKOUT_PLAN} FITs`);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao gerar plano de treino";
      console.error("Erro no processo de geração do plano:", error);
      setError(errorMessage);
      toast.error(errorMessage);
      setWorkoutPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePlan();
    fetchProgressData();
  }, []);

  return {
    loading,
    error,
    workoutPlan,
    progressData,
    generatePlan
  };
};
