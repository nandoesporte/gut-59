
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { MealPlan } from "./types";
import { generateMealPlanPDF } from "./utils/pdf-generator";

interface MealPlanHistoryProps {
  isLoading: boolean;
  historyPlans?: Array<{
    id: string;
    created_at: string;
    plan_data: MealPlan;
    calories: number;
  }>;
  onRefresh: () => Promise<void> | void;
}

export const MealPlanHistory = ({ isLoading, historyPlans, onRefresh }: MealPlanHistoryProps) => {
  const planRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [localPlans, setLocalPlans] = useState(historyPlans || []);

  // Atualiza o estado local quando historyPlans muda
  useState(() => {
    setLocalPlans(historyPlans || []);
  }, [historyPlans]);

  const handleDelete = async (planId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      setDeletingIds(prev => new Set([...prev, planId]));
      const toastId = toast.loading("Excluindo plano alimentar...");

      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        toast.dismiss(toastId);
        toast.error("Erro ao excluir plano alimentar");
        throw error;
      }

      // Atualiza o estado local imediatamente
      setLocalPlans(prev => prev.filter(plan => plan.id !== planId));
      
      toast.dismiss(toastId);
      toast.success("Plano alimentar excluído com sucesso");
      
      // Atualiza os dados do servidor em segundo plano
      await onRefresh();
      
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error("Erro ao excluir plano alimentar");
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(planId);
        return newSet;
      });
    }
  };

  const handleDownloadPDF = async (plan: { id: string; plan_data: MealPlan }) => {
    const containerRef = planRefs.current[plan.id];
    if (!containerRef) {
      toast.error("Erro ao gerar PDF");
      return;
    }
    
    try {
      await generateMealPlanPDF(containerRef);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error("Erro ao gerar PDF do plano alimentar");
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-green-500" />
        </div>
      </Card>
    );
  }

  if (!localPlans || localPlans.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Planos Alimentares Gerados
        </h2>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4">
        {localPlans.map((plan) => (
          <Card key={plan.id} className="p-4">
            <div 
              ref={el => planRefs.current[plan.id] = el}
              className="flex justify-between items-center"
            >
              <div>
                <p className="font-medium">
                  Plano Alimentar - {new Date(plan.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  Calorias: {plan.calories} kcal
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(plan.id)}
                  disabled={deletingIds.has(plan.id)}
                >
                  {deletingIds.has(plan.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownloadPDF(plan)}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
