
import { Button } from "@/components/ui/button";
import { WorkoutPreferences } from "./types";
import { CurrentWorkoutPlan } from "./components/CurrentWorkoutPlan";
import { WorkoutLoadingState } from "./components/WorkoutLoadingState";
import { WorkoutProgressChart } from "./components/WorkoutProgressChart";
import { WorkoutError } from "./components/WorkoutError";
import { FileDown, RotateCcw } from "lucide-react";
import { generateWorkoutPDF } from "./utils/pdf-generator";
import { useWorkoutPlanGeneration } from "./hooks/useWorkoutPlanGeneration";

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
}

export const WorkoutPlanDisplay = ({ preferences, onReset }: WorkoutPlanDisplayProps) => {
  const { loading, workoutPlan, progressData } = useWorkoutPlanGeneration(preferences);

  const handleExportPDF = async () => {
    if (!workoutPlan) return;
    await generateWorkoutPDF(workoutPlan);
  };

  if (loading) {
    return <WorkoutLoadingState message="Gerando seu plano de treino personalizado" />;
  }

  if (!workoutPlan) {
    return <WorkoutError onReset={onReset} />;
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
