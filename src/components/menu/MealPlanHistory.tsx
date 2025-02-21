
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { MealPlanCard } from "./components/MealPlanCard";
import { createPDFContent } from "./utils/meal-plan-helpers";
import type { MealPlanHistoryProps, MealPlanItem } from "./types/meal-plan-history";

export const MealPlanHistory = ({ isLoading, historyPlans, onRefresh }: MealPlanHistoryProps) => {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [generatingPDF, setGeneratingPDF] = useState<Set<string>>(new Set());

  const handleDelete = async (planId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      setDeletingIds(prev => new Set([...prev, planId]));

      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', userData.user.id);

      if (error) {
        toast.error("Erro ao excluir plano alimentar");
        throw error;
      }

      await onRefresh();
      toast.success("Plano alimentar excluído com sucesso");
      
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

  const handleDownloadPDF = async (plan: MealPlanItem) => {
    try {
      setGeneratingPDF(prev => new Set([...prev, plan.id]));
      
      const tempDiv = createPDFContent(plan);
      document.body.appendChild(tempDiv);
      await generateMealPlanPDF(tempDiv);
      document.body.removeChild(tempDiv);
      
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error("Erro ao gerar PDF do plano alimentar");
    } finally {
      setGeneratingPDF(prev => {
        const newSet = new Set(prev);
        newSet.delete(plan.id);
        return newSet;
      });
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

  if (!historyPlans || historyPlans.length === 0) {
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
        {historyPlans.map((plan) => (
          <MealPlanCard
            key={plan.id}
            plan={plan}
            onDelete={handleDelete}
            onDownload={handleDownloadPDF}
            isDeleting={deletingIds.has(plan.id)}
            isGeneratingPDF={generatingPDF.has(plan.id)}
          />
        ))}
      </div>
    </div>
  );
};
