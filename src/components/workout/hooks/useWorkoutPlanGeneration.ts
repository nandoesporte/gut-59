
import { useState, useEffect } from "react";
import { WorkoutPreferences } from "../types";
import { WorkoutPlan } from "../types/workout-plan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useWorkoutPlanGeneration = (preferences: WorkoutPreferences) => {
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [progressData, setProgressData] = useState<any[]>([]);

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

      if (error) throw error;

      const formattedData = data.map(item => ({
        date: new Date(item.created_at).toLocaleDateString(),
        difficulty: item.difficulty_rating,
        exercise: item.exercises?.name
      }));

      setProgressData(formattedData);
    } catch (error) {
      console.error("Erro ao buscar progresso:", error);
    }
  };

  const generateWorkoutPlan = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      console.log("Chamando edge function com:", { preferences, userId: user.id });

      const { data: grantData, error: grantError } = await supabase.functions.invoke('grant-plan-access', {
        body: { 
          userId: user.id, 
          planType: 'workout',
          incrementCount: true
        }
      });

      if (grantError) {
        console.error("Erro ao conceder acesso:", grantError);
        throw new Error("Erro ao conceder acesso ao plano de treino");
      }

      if (grantData?.requiresPayment) {
        toast.error(grantData.message || "Pagamento necessário para gerar novo plano");
        setLoading(false);
        return;
      }

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

      console.log("Plano gerado:", response);
      setWorkoutPlan(response);
      toast.success("Plano de treino gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar plano:", error);
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
    workoutPlan,
    progressData,
    generateWorkoutPlan
  };
};
