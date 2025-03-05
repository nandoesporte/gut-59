<lov-codelov-code>
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
}

export const WorkoutPlanDisplay = ({ preferences, onReset }: WorkoutPlanDisplayProps) => {
  const { loading, workoutPlan, progressData, error, generatePlan, rawResponse, loadingTime } = useWorkoutPlanGeneration(preferences);

  const handleExportPDF = async () => {
    if (!workoutPlan) return;
    try {
      await generateWorkoutPDF(workoutPlan);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const handleRetry = () => {
    generatePlan();
  };

  const handleReset = () => {
    toast.info("Criando novo plano de treino...");
    onReset();
  };

  if (loading) {
    return <WorkoutLoadingState 
      loadingTime={loadingTime} 
      onRetry={handleRetry}
      timePassed={loadingTime > 30} // Convert number to boolean by comparison
    />;
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
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="details">Detalhes Completos</TabsTrigger>
          <TabsTrigger value="raw">Resposta da IA</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <CurrentWorkoutPlan plan={workoutPlan} />
        </TabsContent>
        
        <TabsContent value="details">
          <WorkoutPlanDetailed plan={workoutPlan} />
        </TabsContent>
        
        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Resposta Bruta da IA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[500px]">
                <pre className="text-xs">{rawResponse ? JSON.stringify(rawResponse, null, 2) : "Nenhuma resposta bruta disponível"}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <WorkoutProgressChart progressData={progressData} />
      
      <div className="flex justify-center">
        <Button 
          onClick={handleReset} 
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
</lov-code>
