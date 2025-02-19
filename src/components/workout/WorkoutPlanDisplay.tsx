
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WorkoutPreferences } from "./types";
import { WorkoutPlan } from "./types/workout-plan";
import { CurrentWorkoutPlan } from "./components/CurrentWorkoutPlan";
import { WorkoutLoadingState } from "./components/WorkoutLoadingState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
}

export const WorkoutPlanDisplay = ({ preferences, onReset }: WorkoutPlanDisplayProps) => {
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    generateWorkoutPlan();
  }, []);

  const generateWorkoutPlan = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      console.log("Gerando plano de treino com preferências:", preferences);

      const { data: response, error } = await supabase.functions.invoke('generate-workout-plan', {
        body: {
          preferences: {
            ...preferences,
            muscleGroup: preferences.muscleGroup
          },
          userId: user.id
        }
      });

      if (error) {
        console.error("Erro ao gerar plano:", error);
        throw error;
      }

      console.log("Plano gerado:", response);

      if (!response) {
        throw new Error("Nenhum plano foi gerado");
      }

      setWorkoutPlan(response);
      toast.success("Plano de treino gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar plano:", error);
      toast.error(error.message || "Erro ao gerar plano de treino. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <WorkoutLoadingState />;
  }

  if (!workoutPlan) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-600">Erro ao gerar o plano de treino.</p>
        <Button onClick={onReset}>Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CurrentWorkoutPlan plan={workoutPlan} />
      
      <div className="flex justify-center">
        <Button onClick={onReset} variant="outline">
          Criar Novo Plano
        </Button>
      </div>
    </div>
  );
};
