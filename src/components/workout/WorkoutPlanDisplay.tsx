
import { Button } from "@/components/ui/button";
import { WorkoutPreferences } from "./types";
import { CurrentWorkoutPlan } from "./components/CurrentWorkoutPlan";
import { WorkoutLoadingState } from "./components/WorkoutLoadingState";
import { WorkoutProgressChart } from "./components/WorkoutProgressChart";
import { WorkoutError } from "./components/WorkoutError";
import { Badge } from "@/components/ui/badge";
import { FileDown, RotateCcw, Bot } from "lucide-react";
import { generateWorkoutPDF } from "./utils/pdf-generator";
import { useWorkoutPlanGeneration } from "./hooks/useWorkoutPlanGeneration";

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
}

export const WorkoutPlanDisplay = ({ preferences, onReset }: WorkoutPlanDisplayProps) => {
  const { loading, workoutPlan, progressData, error, generatePlan } = useWorkoutPlanGeneration(preferences);

  const handleExportPDF = async () => {
    if (!workoutPlan) return;
    await generateWorkoutPDF(workoutPlan);
  };

  const handleRetry = () => {
    generatePlan();
  };

  if (loading) {
    return <WorkoutLoadingState message="Gerando seu plano de treino personalizado com Trenner2025" />;
  }

  if (error || !workoutPlan) {
    return <WorkoutError 
      onReset={onReset} 
      errorMessage={error || "Não foi possível gerar seu plano. Por favor, tente novamente com diferentes preferências ou mais tarde."} 
    />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Seu Plano de Treino</h2>
          <div className="flex items-center mt-2 gap-2">
            <Badge variant="outline" className="flex items-center gap-1 bg-primary/5">
              <Bot className="w-3 h-3" />
              Gerado por Trenner2025 (Llama 3 8B via Groq)
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRetry} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Gerar Novo
          </Button>
          <Button onClick={handleExportPDF} variant="outline">
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <CurrentWorkoutPlan plan={workoutPlan} />
      
      <WorkoutProgressChart progressData={progressData} />
      
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
