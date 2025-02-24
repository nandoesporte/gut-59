
import { useState, useEffect } from "react";
import { WorkoutPreferences } from "../types";
import { WorkoutPlan } from "../types/workout-plan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useWorkoutPlanGeneration = (preferences: WorkoutPreferences) => {
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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
    try {
      console.log("Verificando acesso para usuário:", userId);

      const { data: settings, error: settingsError } = await supabase
        .from('payment_settings')
        .select('is_active, price')
        .eq('plan_type', 'workout')
        .single();

      if (settingsError) {
        console.error("Erro ao buscar configurações de pagamento:", settingsError);
        throw new Error("Erro ao verificar configurações de pagamento");
      }

      console.log("Configurações de pagamento:", settings);

      // Se o pagamento não estiver ativo, permite acesso
      if (!settings?.is_active) {
        return { hasAccess: true };
      }

      const { data: grantData, error: grantError } = await supabase.functions.invoke('grant-plan-access', {
        body: { 
          userId, 
          planType: 'workout',
          incrementCount: true
        }
      });

      if (grantError) {
        console.error("Erro ao verificar acesso:", grantError);
        throw new Error("Erro ao verificar acesso ao plano");
      }

      console.log("Resposta da verificação de acesso:", grantData);

      return {
        hasAccess: !grantData?.requiresPayment,
        price: settings.price,
        message: grantData?.message
      };
    } catch (error) {
      console.error("Erro na verificação de acesso:", error);
      throw new Error(error instanceof Error ? error.message : "Erro ao verificar acesso ao plano");
    }
  };

  const generateWorkoutPlan = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Erro de autenticação:", authError);
        throw new Error("Erro ao verificar autenticação");
      }

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      console.log("Iniciando verificação de acesso para usuário:", user.id);
      const accessResult = await verifyAccess(user.id);
      
      if (!accessResult.hasAccess) {
        toast.error(accessResult.message || "Pagamento necessário para gerar novo plano");
        setLoading(false);
        return;
      }

      console.log("Acesso verificado, gerando plano com preferências:", preferences);
      const { data: response, error } = await supabase.functions.invoke('generate-workout-plan', {
        body: { preferences, userId: user.id }
      });

      if (error) {
        console.error("Erro da edge function:", error);
        throw new Error(error.message || "Erro ao gerar plano de treino");
      }

      if (!response) {
        throw new Error("Nenhum plano foi gerado");
      }

      setWorkoutPlan(response);
      toast.success("Plano de treino gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar plano:", error);
      setError(error.message || "Erro ao gerar plano de treino");
      toast.error(error.message || "Erro ao gerar plano de treino. Por favor, tente novamente.");
      setWorkoutPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateWorkoutPlan();
    fetchProgressData();
  }, []);

  return {
    loading,
    error,
    workoutPlan,
    progressData,
    generateWorkoutPlan
  };
};
