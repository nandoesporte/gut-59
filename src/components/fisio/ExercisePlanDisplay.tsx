
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Stethoscope, RotateCcw, RefreshCw, Trash2 } from "lucide-react";
import { FisioPreferences } from "./types";
import { WorkoutLoadingState } from "@/components/workout/components/WorkoutLoadingState";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFisioPlanGeneration } from "./hooks/useFisioPlanGeneration";
import { RehabPlanDisplay } from "./components/RehabPlanDisplay";
import { DeletePlanDialog } from "./components/DeletePlanDialog";

interface ExercisePlanDisplayProps {
  preferences: FisioPreferences;
  onReset: () => void;
  onPlanGenerated?: () => void;
}

export const ExercisePlanDisplay = ({
  preferences,
  onReset,
  onPlanGenerated,
}: ExercisePlanDisplayProps) => {
  const {
    loading,
    rehabPlan,
    error,
    generatePlan,
    loadingTime,
    loadingPhase,
    loadingMessage,
    planGenerationCount,
  } = useFisioPlanGeneration(preferences, onPlanGenerated);
  
  const isMobile = useIsMobile();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  const handleGenerateNewPlan = () => {
    generatePlan();
  };

  const handleDeletePlan = async () => {
    if (!rehabPlan?.id) return;
    
    try {
      setIsDeletingPlan(true);
      
      const { error } = await supabase
        .from('rehab_plans')
        .delete()
        .eq('id', rehabPlan.id);

      if (error) {
        console.error('Error deleting rehab plan:', error);
        toast.error('Erro ao excluir plano de reabilitação');
        return;
      }

      toast.success('Plano de reabilitação excluído com sucesso');
      onReset();
      if (onPlanGenerated) onPlanGenerated();
    } catch (error) {
      console.error('Error in deletion process:', error);
      toast.error('Erro ao excluir plano de reabilitação');
    } finally {
      setIsDeletingPlan(false);
      setDeleteDialogOpen(false);
    }
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
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <div className="inline-flex items-center justify-center p-2 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
          <Stethoscope className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
          Erro ao gerar plano
        </h3>
        <p className="text-sm text-red-600 dark:text-red-300 max-w-md mx-auto mb-4">
          {error || "Ocorreu um erro ao gerar seu plano de reabilitação. Por favor, tente novamente."}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-2">
          <Button onClick={generatePlan} variant="default">
            Tentar Novamente
          </Button>
          <Button onClick={onReset} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Alterar Preferências
          </Button>
        </div>
      </div>
    );
  }

  if (!rehabPlan) {
    return (
      <div className="text-center p-3 sm:p-8">
        <div className="inline-flex items-center justify-center p-2 bg-amber-100 rounded-full mb-3 sm:mb-4">
          <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-amber-600">
          Aguardando plano de reabilitação
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
          O plano de reabilitação ainda não está pronto. Aguarde enquanto ele é preparado ou tente novamente.
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
      <RehabPlanDisplay plan={rehabPlan} />
      
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
        
        <Button 
          onClick={() => setDeleteDialogOpen(true)} 
          variant="destructive" 
          className="flex items-center gap-1.5 sm:gap-2 text-sm"
          size={isMobile ? "default" : "lg"}
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {isMobile ? "Excluir" : "Excluir Plano"}
        </Button>
      </div>
      
      {planGenerationCount > 1 && (
        <p className="text-xs text-center text-muted-foreground px-3">
          Você já gerou {planGenerationCount} {planGenerationCount === 1 ? 'plano' : 'planos'} de reabilitação. 
          Cada plano contém exercícios diferentes para variar seu programa.
        </p>
      )}
      
      <DeletePlanDialog 
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeletePlan}
        isDeleting={isDeletingPlan}
      />
    </div>
  );
};
