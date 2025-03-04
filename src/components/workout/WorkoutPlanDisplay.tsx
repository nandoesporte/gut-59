
import { Button } from "@/components/ui/button";
import { WorkoutPreferences } from "./types";
import { CurrentWorkoutPlan } from "./components/CurrentWorkoutPlan";
import { WorkoutLoadingState } from "./components/WorkoutLoadingState";
import { WorkoutProgressChart } from "./components/WorkoutProgressChart";
import { WorkoutError } from "./components/WorkoutError";
import { RotateCcw } from "lucide-react";
import { generateWorkoutPDF } from "./utils/pdf-generator";
import { useWorkoutPlanGeneration } from "./hooks/useWorkoutPlanGeneration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkoutPlanHeader } from "./components/WorkoutPlanHeader";
import { WorkoutPlanDetailed } from "./components/WorkoutPlanDetailed";

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
      <WorkoutPlanHeader 
        workoutPlan={workoutPlan}
        onExportPDF={handleExportPDF}
        onRetry={handleRetry}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="details">Detalhes Completos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <CurrentWorkoutPlan plan={workoutPlan} />
        </TabsContent>
        
        <TabsContent value="details">
          <WorkoutPlanDetailed plan={workoutPlan} />
        </TabsContent>
      </Tabs>
      
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
