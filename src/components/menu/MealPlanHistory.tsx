
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MealPlan } from "./types";

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

  const handleDelete = async (planId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const toastId = toast.loading("Excluindo plano alimentar...");

      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        toast.dismiss(toastId);
        throw error;
      }

      toast.dismiss(toastId);
      toast.success("Plano alimentar excluído com sucesso");
      
      // Forçar atualização da lista
      await onRefresh();
      
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error("Erro ao excluir plano alimentar");
    }
  };

  const handleDownload = async (planId: string) => {
    const planRef = planRefs.current[planId];
    if (planRef) {
      await generateMealPlanPDF(planRef);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-4">Histórico de Planos Alimentares</h2>
      {historyPlans?.map((plan) => (
        <Collapsible key={plan.id} className="w-full">
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between">
                <div>
                  <h4 className="text-md font-medium">
                    Plano de {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Calorias: {plan.calories} kcal
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDownload(plan.id);
                    }}
                    className="h-8 w-8"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(plan.id);
                    }}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200 ease-in-out group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="p-4 md:p-6 pt-0">
                <div ref={el => planRefs.current[plan.id] = el}>
                  <div className="space-y-4">
                    {Object.entries(plan.plan_data).map(([mealType, items]) => (
                      <div key={mealType} className="border-b pb-4 last:border-b-0">
                        <h5 className="font-medium capitalize mb-2">{mealType}</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {Array.isArray(items) && items.map((item: any, index: number) => (
                            <li key={index} className="text-sm text-gray-600">
                              {item.name} {item.portion && `- ${item.portion}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
      
      {(!historyPlans || historyPlans.length === 0) && (
        <Card className="p-4 text-center text-gray-500">
          Nenhum plano alimentar gerado ainda.
        </Card>
      )}
    </div>
  );
};
