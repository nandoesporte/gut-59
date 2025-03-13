
import React from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell, RotateCcw, RefreshCw } from "lucide-react";
import { WorkoutPreferences } from "./types";
import { WorkoutLoadingState } from "./components/WorkoutLoadingState";
import { useWorkoutPlanGeneration } from "./hooks/useWorkoutPlanGeneration";
import { CurrentWorkoutPlan } from "./components/CurrentWorkoutPlan";
import { useIsMobile } from "@/hooks/use-mobile";

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
  onPlanGenerated?: () => void;
}

export const WorkoutPlanDisplay = ({
  preferences,
  onReset,
  onPlanGenerated,
}: WorkoutPlanDisplayProps) => {
  const {
    loading,
    workoutPlan,
    error,
    generatePlan,
    loadingTime,
    loadingPhase,
    loadingMessage,
    planGenerationCount,
  } = useWorkoutPlanGeneration(preferences, onPlanGenerated);
  
  const isMobile = useIsMobile();

  const handleGenerateNewPlan = () => {
    generatePlan();
  };

  if (loading) {
    return (
      <WorkoutLoadingState
        loadingTime={loadingTime}
        loadingPhase={loadingPhase}
        loadingMessage={loadingMessage}
        onRetry={generatePlan}
        timePassed={loadingTime > 30}
      />
    );
  }

  if (error) {
    return (
      <div className="text-center p-3 sm:p-8 space-y-3 sm:space-y-4">
        <div className="inline-flex items-center justify-center p-2 bg-red-100 rounded-full mb-3 sm:mb-4">
          <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-red-600">
          Erro ao gerar o plano de treino
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {error || "Ocorreu um erro durante a geração do plano. Por favor, tente novamente."}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-2 mt-4 sm:mt-6">
          <Button onClick={generatePlan} className="w-full sm:w-auto text-sm">
            Tentar Novamente
          </Button>
          <Button onClick={onReset} variant="outline" className="w-full sm:w-auto text-sm">
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Alterar Preferências
          </Button>
        </div>
      </div>
    );
  }

  if (!workoutPlan) {
    return (
      <div className="text-center p-3 sm:p-8">
        <div className="inline-flex items-center justify-center p-2 bg-amber-100 rounded-full mb-3 sm:mb-4">
          <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-amber-600">
          Aguardando plano de treino
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
          O plano de treino ainda não está pronto. Aguarde enquanto ele é preparado ou tente novamente.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-2 mt-4 sm:mt-6">
          <Button onClick={handleGenerateNewPlan} className="w-full sm:w-auto text-sm">
            Gerar Plano
          </Button>
          <Button onClick={onReset} variant="outline" className="w-full sm:w-auto text-sm">
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Alterar Preferências
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      <CurrentWorkoutPlan plan={workoutPlan} />
      
      <div className={`flex ${isMobile ? 'flex-col' : 'justify-center'} gap-2 sm:gap-3 mt-4 sm:mt-6`}>
        <Button 
          onClick={handleGenerateNewPlan} 
          variant="default" 
          className="flex items-center gap-1.5 sm:gap-2 text-sm"
          size={isMobile ? "default" : "lg"}
        >
          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {isMobile ? "Novo Plano" : "Novo Plano com Diferentes Exercícios"}
        </Button>
        
        <Button 
          onClick={onReset} 
          variant="outline" 
          className="flex items-center gap-1.5 sm:gap-2 text-sm"
          size={isMobile ? "default" : "lg"}
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {isMobile ? "Mudar Preferências" : "Alterar Preferências"}
        </Button>
      </div>
      
      {planGenerationCount > 1 && (
        <p className="text-xs text-center text-muted-foreground px-3">
          Você já gerou {planGenerationCount} {planGenerationCount === 1 ? 'plano' : 'planos'} de treino. 
          Cada plano contém exercícios diferentes para variar seus treinos.
        </p>
      )}
    </div>
  );
};
