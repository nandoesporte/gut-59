
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CalendarDays, Flame, Target, Clock, ChevronRight, UtensilsCrossed } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MealPlan } from "../types";
import { SavedMealPlanDetails } from "./SavedMealPlanDetails";

export const LastMealPlanSummary = () => {
  const [lastPlan, setLastPlan] = useState<{
    id: string;
    created_at: string;
    plan_data: MealPlan;
    calories: number;
    goal?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlanDetailsOpen, setIsPlanDetailsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLastPlan = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("Usuário não autenticado");
          setLoading(false);
          return;
        }

        // First fetch the last meal plan
        const { data, error } = await supabase
          .from('meal_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.log("Erro ao buscar último plano alimentar:", error);
          setLoading(false);
          return;
        }

        if (data) {
          const planData = typeof data.plan_data === 'string' 
            ? JSON.parse(data.plan_data) 
            : data.plan_data;
            
          if (planData && planData.weeklyPlan && planData.weeklyTotals) {
            console.log("Último plano alimentar encontrado:", data.id);
            
            // Now fetch the user's nutrition preferences to get their selected goal
            const { data: nutritionPrefs, error: prefsError } = await supabase
              .from('nutrition_preferences')
              .select('goal')
              .eq('user_id', user.id)
              .single();
            
            if (prefsError && prefsError.code !== 'PGRST116') {
              console.log("Erro ao buscar preferências nutricionais:", prefsError);
            }
            
            // Map database goal to display goal
            let displayGoal = "Equilibrado";
            if (nutritionPrefs?.goal) {
              switch(nutritionPrefs.goal) {
                case 'lose_weight':
                  displayGoal = "Perda de Peso";
                  break;
                case 'maintain':
                  displayGoal = "Manter Peso";
                  break;
                case 'gain_mass':
                  displayGoal = "Ganho de Massa";
                  break;
                default:
                  displayGoal = "Equilibrado";
              }
            }
            
            setLastPlan({
              id: data.id,
              created_at: data.created_at,
              plan_data: planData as MealPlan,
              calories: data.calories,
              goal: displayGoal
            });
          } else {
            console.log("Plano encontrado com formato inválido");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar último plano alimentar:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLastPlan();
  }, []);

  const handleViewDetails = () => {
    if (lastPlan && lastPlan.id) {
      setIsPlanDetailsOpen(true);
    } else {
      toast.error("Não foi possível abrir os detalhes do plano");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (e) {
      return "Data indisponível";
    }
  };

  if (loading) {
    return (
      <Card className="w-full mt-4">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lastPlan) {
    return null;
  }

  const getMealCount = () => {
    try {
      const firstDay = Object.keys(lastPlan.plan_data.weeklyPlan)[0];
      const dayPlan = lastPlan.plan_data.weeklyPlan[firstDay];
      if (dayPlan && dayPlan.meals) {
        return Object.keys(dayPlan.meals).length;
      }
      return 0;
    } catch (e) {
      return 0;
    }
  };

  return (
    <>
      <Card className="w-full mt-4 overflow-hidden border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="bg-teal-100 p-2 rounded-full">
                  <UtensilsCrossed className="h-5 w-5 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-teal-800">Seu Plano Alimentar</h3>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsPlanDetailsOpen(true)}
                className="bg-white hover:bg-teal-50 border-teal-200 text-teal-700 text-xs px-3 py-1 h-auto"
              >
                Ver completo <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>

            <p className="text-sm text-teal-600/80 mb-2 -mt-1">
              {format(new Date(lastPlan.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>

            <div className="grid grid-cols-4 gap-2 mb-2">
              <div className="bg-green-50 rounded-lg p-2 transition-all">
                <div className="flex items-center justify-center text-green-600 mb-1">
                  <Flame className="h-4 w-4" />
                </div>
                <p className="text-xs text-center text-green-800 font-medium">Calorias</p>
                <p className="text-sm font-bold text-center text-green-700">{lastPlan.calories || lastPlan.plan_data.weeklyTotals.averageCalories || 0} kcal</p>
              </div>
              
              <div className="bg-cyan-50 rounded-lg p-2 transition-all">
                <div className="flex items-center justify-center text-cyan-600 mb-1">
                  <Target className="h-4 w-4" />
                </div>
                <p className="text-xs text-center text-cyan-800 font-medium">Objetivo</p>
                <p className="text-sm font-bold text-center text-cyan-700">{lastPlan.goal}</p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-2 transition-all">
                <div className="flex items-center justify-center text-blue-600 mb-1">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <p className="text-xs text-center text-blue-800 font-medium">Dias</p>
                <p className="text-sm font-bold text-center text-blue-700">{Object.keys(lastPlan.plan_data.weeklyPlan).length}</p>
              </div>
              
              <div className="bg-indigo-50 rounded-lg p-2 transition-all">
                <div className="flex items-center justify-center text-indigo-600 mb-1">
                  <Clock className="h-4 w-4" />
                </div>
                <p className="text-xs text-center text-indigo-800 font-medium">Refeições</p>
                <p className="text-sm font-bold text-center text-indigo-700">{getMealCount()} / dia</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 rounded-lg p-2 transition-all text-center">
                <p className="text-xs text-slate-600 font-medium">Proteínas</p>
                <p className="text-sm font-bold text-primary-700">{lastPlan.plan_data.weeklyTotals.averageProtein || 0}g</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 transition-all text-center">
                <p className="text-xs text-slate-600 font-medium">Carboidratos</p>
                <p className="text-sm font-bold text-primary-700">{lastPlan.plan_data.weeklyTotals.averageCarbs || 0}g</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 transition-all text-center">
                <p className="text-xs text-slate-600 font-medium">Gorduras</p>
                <p className="text-sm font-bold text-primary-700">{lastPlan.plan_data.weeklyTotals.averageFats || 0}g</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {lastPlan && (
        <SavedMealPlanDetails
          planId={lastPlan.id}
          planData={lastPlan.plan_data}
          isOpen={isPlanDetailsOpen}
          onClose={() => setIsPlanDetailsOpen(false)}
        />
      )}
    </>
  );
};
