
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WorkoutPreferences } from "./types";
import { WorkoutPlan } from "./types/workout-plan";
import { CurrentWorkoutPlan } from "./components/CurrentWorkoutPlan";
import { WorkoutLoadingState } from "./components/WorkoutLoadingState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RotateCcw, Download, FileDown } from "lucide-react";
import { generateWorkoutPDF } from "./utils/pdf-generator";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
}

export const WorkoutPlanDisplay = ({ preferences, onReset }: WorkoutPlanDisplayProps) => {
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [progressData, setProgressData] = useState<any[]>([]);

  useEffect(() => {
    generateWorkoutPlan();
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        return;
      }

      const { data: response, error } = await supabase.functions.invoke('generate-workout-plan', {
        body: { preferences, userId: user.id }
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

  const handleExportPDF = async () => {
    if (!workoutPlan) return;
    await generateWorkoutPDF(workoutPlan);
  };

  if (loading) {
    return <WorkoutLoadingState message="Gerando seu plano de treino personalizado" />;
  }

  if (!workoutPlan) {
    return (
      <div className="text-center space-y-4 p-12">
        <h3 className="text-xl font-semibold text-red-600">
          Erro ao gerar o plano de treino
        </h3>
        <p className="text-muted-foreground">
          Não foi possível gerar seu plano. Por favor, tente novamente.
        </p>
        <Button onClick={onReset} variant="outline" size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Seu Plano de Treino</h2>
        <Button onClick={handleExportPDF} variant="outline">
          <FileDown className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <CurrentWorkoutPlan plan={workoutPlan} />
      
      {progressData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Seu Progresso</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="difficulty"
                  stroke="#2563eb"
                  name="Nível de Dificuldade"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      
      <div className="flex justify-center">
        <Button 
          onClick={onReset} 
          variant="outline"
          size="lg"
          className="hover:bg-primary/5"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Criar Novo Plano
        </Button>
      </div>
    </div>
  );
};
