
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
  onRefresh: () => Promise<void>;
}

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

      // Aguarda a atualização da lista
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

  const handleDownloadPDF = async (plan: { id: string; plan_data: MealPlan; calories: number }) => {
    try {
      setGeneratingPDF(prev => new Set([...prev, plan.id]));
      
      // Criar um elemento temporário para o conteúdo do PDF
      const tempDiv = document.createElement('div');
      tempDiv.className = 'pdf-content bg-white p-8';
      
      // Adicionar o conteúdo do plano ao elemento
      tempDiv.innerHTML = `
        <div class="space-y-6">
          <div class="text-center">
            <h1 class="text-2xl font-bold mb-2">Plano Alimentar</h1>
            <p class="text-gray-600">Data: ${new Date(plan.created_at).toLocaleDateString()}</p>
            <p class="text-gray-600">Meta Calórica: ${plan.calories} kcal</p>
          </div>

          ${Object.entries(plan.plan_data.dailyPlan).map(([meal, data]) => `
            <div class="mb-6">
              <h2 class="text-xl font-semibold mb-2">${formatMealTitle(meal)}</h2>
              <div class="space-y-2">
                ${data.foods.map(food => `
                  <div class="ml-4">
                    <p>• ${food.name} - ${food.portion} ${food.unit}</p>
                    ${food.details ? `<p class="text-sm text-gray-600 ml-4">${food.details}</p>` : ''}
                  </div>
                `).join('')}
              </div>
              <div class="mt-2 text-sm text-gray-600">
                <p>Calorias: ${data.calories} kcal</p>
              </div>
            </div>
          `).join('')}

          <div class="mt-8">
            <h2 class="text-xl font-semibold mb-2">Recomendações</h2>
            <div class="space-y-2">
              ${plan.plan_data.recommendations.general ? 
                `<p class="font-medium">Gerais:</p>
                <p class="ml-4">${plan.plan_data.recommendations.general}</p>` : ''}
              
              ${plan.plan_data.recommendations.preworkout ? 
                `<p class="font-medium">Pré-treino:</p>
                <p class="ml-4">${plan.plan_data.recommendations.preworkout}</p>` : ''}
              
              ${plan.plan_data.recommendations.postworkout ? 
                `<p class="font-medium">Pós-treino:</p>
                <p class="ml-4">${plan.plan_data.recommendations.postworkout}</p>` : ''}
            </div>
          </div>
        </div>
      `;

      // Adicionar o elemento temporário ao documento
      document.body.appendChild(tempDiv);

      // Gerar e baixar o PDF
      await generateMealPlanPDF(tempDiv);

      // Remover o elemento temporário
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

  const formatMealTitle = (meal: string): string => {
    const titles: Record<string, string> = {
      breakfast: "Café da Manhã",
      morningSnack: "Lanche da Manhã",
      lunch: "Almoço",
      afternoonSnack: "Lanche da Tarde",
      dinner: "Jantar"
    };
    return titles[meal] || meal;
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
          <Card key={plan.id} className="p-4">
            <div className="flex justify-between items-center">
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
                  disabled={generatingPDF.has(plan.id)}
                >
                  {generatingPDF.has(plan.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
