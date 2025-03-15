import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CurrentWorkoutPlan } from "./CurrentWorkoutPlan";
import { WorkoutPlan } from "../types/workout-plan";
import { SavedWorkoutPlanDetails } from "./SavedWorkoutPlanDetails";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ClipboardList, RefreshCcw, Trash2, Loader2 } from "lucide-react";
import { DeleteWorkoutDialog } from "./DeleteWorkoutDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkoutHistoryProps {
  plans: WorkoutPlan[];
  isLoading: boolean;
  onRefresh: () => void;
  selectedPlanId?: string | null;
}

const WorkoutHistory = ({ plans, isLoading, onRefresh, selectedPlanId }: WorkoutHistoryProps) => {
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [activeTab, setActiveTab] = useState<string>("plans-list");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (selectedPlanId && plans.length > 0) {
      const plan = plans.find(p => p.id === selectedPlanId);
      if (plan) {
        setSelectedPlan(plan);
        setActiveTab("plan-details");
      }
    }
  }, [selectedPlanId, plans]);

  const handleViewPlan = (plan: WorkoutPlan) => {
    setSelectedPlan(plan);
    setActiveTab("plan-details");
  };

  const handleBackToList = () => {
    setActiveTab("plans-list");
    setSelectedPlan(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd 'de' MMMM", { locale: ptBR });
    } catch (e) {
      return "Data indisponível";
    }
  };

  const openDeleteDialog = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;

    try {
      setDeletingPlan(true);
      
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planToDelete);

      if (error) {
        console.error('Error deleting workout plan:', error);
        toast.error('Erro ao excluir plano de treino');
        return;
      }

      toast.success('Plano de treino excluído com sucesso');
      
      if (selectedPlan && selectedPlan.id === planToDelete) {
        setSelectedPlan(null);
        setActiveTab("plans-list");
      }
      
      onRefresh();
    } catch (error) {
      console.error('Error in deletion process:', error);
      toast.error('Erro ao excluir plano de treino');
    } finally {
      setDeletingPlan(false);
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  const formatGoalName = (goal: string) => {
    switch(goal) {
      case "gain_mass":
        return "Ganho de Massa";
      case "lose_weight":
        return "Perda de Peso";
      case "maintain":
        return "Manter Peso";
      case "strength":
        return "Força";
      case "hypertrophy":
        return "Hipertrofia";
      case "endurance":
        return "Resistência";
      case "flexibility":
        return "Flexibilidade";
      default:
        return goal.split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  };

  return (
    <Card className="w-full border border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Histórico de Treinos</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh} 
            disabled={isLoading}
            className="h-8 px-2"
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
        <CardDescription>
          Visualize seus planos de treino anteriores
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="plans-list" className="flex-1">
              <ClipboardList className="h-4 w-4 mr-2" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="plan-details" className="flex-1" disabled={!selectedPlan}>
              Detalhes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans-list" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground">
                <p>Nenhum plano de treino encontrado.</p>
                <p className="text-sm mt-2">
                  Crie seu primeiro plano utilizando o formulário acima.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div 
                    key={plan.id}
                    className="border rounded-lg p-3 hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => handleViewPlan(plan)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Plano de {formatGoalName(plan.goal)}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(plan.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-8"
                          onClick={(e) => openDeleteDialog(plan.id, e)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8">
                          Visualizar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="plan-details" className="mt-0">
            {selectedPlan ? (
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToList}
                  className="mb-2"
                >
                  ← Voltar para a lista
                </Button>
                
                <CurrentWorkoutPlan plan={selectedPlan} />
                
                <Separator className="my-4" />
                
                <SavedWorkoutPlanDetails plan={selectedPlan} />
              </div>
            ) : (
              <div className="text-center p-6 text-muted-foreground">
                <p>Selecione um plano para ver os detalhes.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <DeleteWorkoutDialog 
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeletePlan}
      />
    </Card>
  );
};

export default WorkoutHistory;
