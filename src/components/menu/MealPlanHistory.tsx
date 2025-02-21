
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, ChevronDown, Coffee, Apple, UtensilsCrossed, Cookie, Moon, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MealPlan } from "./types";
import { MealSection } from "./components/MealSection";
import { DailyTotals } from "./components/DailyTotals";
import { Recommendations } from "./components/Recommendations";

interface MealPlanHistoryProps {
  isLoading: boolean;
  historyPlans?: Array<{
    id: string;
    created_at: string;
    plan_data: MealPlan;
    calories: number;
    active: boolean;
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
        toast.error("Erro ao excluir plano alimentar");
        throw error;
      }

      toast.dismiss(toastId);
      toast.success("Plano alimentar excluído com sucesso");
      
      await onRefresh();
      
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error("Erro ao excluir plano alimentar");
    }
  };

  const handleSelect = async (planId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const toastId = toast.loading("Selecionando plano alimentar...");

      // Primeiro, desativa todos os planos do usuário
      await supabase
        .from('meal_plans')
        .update({ active: false })
        .eq('user_id', userData.user.id);

      // Depois, ativa o plano selecionado
      const { error } = await supabase
        .from('meal_plans')
        .update({ active: true })
        .eq('id', planId);

      if (error) {
        toast.dismiss(toastId);
        toast.error("Erro ao selecionar plano alimentar");
        throw error;
      }

      toast.dismiss(toastId);
      toast.success("Plano alimentar selecionado com sucesso!");
      
      await onRefresh();
      
    } catch (error) {
      console.error('Erro ao selecionar plano:', error);
      toast.error("Erro ao selecionar plano alimentar");
    }
  };

  const handleDownload = async (planId: string) => {
    const planRef = planRefs.current[planId];
    if (!planRef) {
      toast.error("Erro ao gerar PDF: referência não encontrada");
      return;
    }

    try {
      const toastId = toast.loading("Gerando PDF do plano alimentar...");
      await generateMealPlanPDF(planRef);
      toast.dismiss(toastId);
      toast.success("PDF do plano alimentar gerado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error("Erro ao gerar PDF do plano alimentar");
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

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return <Coffee className="w-5 h-5" />;
      case 'morningSnack': return <Apple className="w-5 h-5" />;
      case 'lunch': return <UtensilsCrossed className="w-5 h-5" />;
      case 'afternoonSnack': return <Cookie className="w-5 h-5" />;
      case 'dinner': return <Moon className="w-5 h-5" />;
      default: return null;
    }
  };

  const getMealTitle = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'Café da Manhã';
      case 'morningSnack': return 'Lanche da Manhã';
      case 'lunch': return 'Almoço';
      case 'afternoonSnack': return 'Lanche da Tarde';
      case 'dinner': return 'Jantar';
      default: return mealType;
    }
  };

  // Filtra para mostrar apenas os 3 planos mais recentes se estiverem todos com active = false
  // Ou mostra o plano ativo + histórico se houver um plano ativo
  const plansToShow = historyPlans?.reduce((acc, plan) => {
    if (plan.active) {
      // Se houver um plano ativo, ele vai primeiro
      return [plan, ...acc];
    } else if (acc.length < 3) {
      // Se não tivermos 3 planos ainda e o plano não for ativo, adiciona
      return [...acc, plan];
    }
    return acc;
  }, [] as typeof historyPlans extends undefined ? undefined : NonNullable<typeof historyPlans>) || [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-4">
        {plansToShow.some(p => p.active) ? 'Plano Atual e Histórico' : 'Opções de Planos Alimentares'}
      </h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        {plansToShow.map((plan, index) => (
          <Collapsible key={plan.id} className="w-full">
            <Card className={`h-full ${plan.active ? 'ring-2 ring-green-500' : ''}`}>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="p-4 md:p-6">
                  <div>
                    <h4 className="text-md font-medium flex items-center gap-2">
                      {plan.active ? (
                        <>
                          <ThumbsUp className="w-4 h-4 text-green-500" />
                          Plano Atual
                        </>
                      ) : (
                        `Opção ${index + 1}`
                      )}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {plan.calories} kcal/dia
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
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
                        e.stopPropagation();
                        handleDelete(plan.id);
                      }}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {!plan.active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(plan.id);
                        }}
                        className="h-8 w-8 text-green-600 hover:text-green-700"
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                    )}
                    <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200 ease-in-out group-data-[state=open]:rotate-180" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div ref={el => planRefs.current[plan.id] = el} className="space-y-6">
                    {plan.plan_data && plan.plan_data.dailyPlan && Object.entries(plan.plan_data.dailyPlan).map(([mealType, meal]) => {
                      if (!meal) return null;
                      return (
                        <MealSection
                          key={mealType}
                          title={getMealTitle(mealType)}
                          icon={getMealIcon(mealType)}
                          meal={meal}
                        />
                      );
                    })}
                    
                    {plan.plan_data?.totalNutrition && (
                      <DailyTotals totalNutrition={plan.plan_data.totalNutrition} />
                    )}
                    
                    {plan.plan_data?.recommendations && (
                      <Recommendations recommendations={plan.plan_data.recommendations} />
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
      
      {(!historyPlans || historyPlans.length === 0) && (
        <Card className="p-4 text-center text-gray-500">
          Nenhum plano alimentar gerado ainda.
        </Card>
      )}
    </div>
  );
};
