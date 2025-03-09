
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CalendarDays, Flame, Target, Clock, FileText, ChevronRight, UtensilsCrossed } from "lucide-react";
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
            setLastPlan({
              id: data.id,
              created_at: data.created_at,
              plan_data: planData as MealPlan,
              calories: data.calories
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
      return format(new Date(dateString), "dd 'de' MMM", { locale: ptBR });
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

  const getGoalFromMacros = () => {
    try {
      const { averageProtein, averageCarbs, averageFats } = lastPlan.plan_data.weeklyTotals;
      const total = averageProtein + averageCarbs + averageFats;
      
      if (total === 0) return "Equilibrado";
      
      const proteinPct = (averageProtein / total) * 100;
      const carbsPct = (averageCarbs / total) * 100;
      
      if (proteinPct > 30) return "Rico em Proteínas";
      if (carbsPct > 55) return "Rico em Carboidratos";
      return "Equilibrado";
    } catch (e) {
      return "Equilibrado";
    }
  };

  return (
    <>
      <Card className="w-full border-none shadow-sm overflow-hidden bg-white dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                  <UtensilsCrossed className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-blue-800 dark:text-blue-300">Seu Plano Alimentar</h3>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                    {formatDate(lastPlan.created_at)}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleViewDetails}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 p-1 h-auto"
              >
                Ver completo <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-lg p-2 transition-all hover:shadow-sm">
                <div className="flex items-center text-green-600 dark:text-green-400 mb-0.5">
                  <Flame className="h-3 w-3 mr-1" />
                  <span className="text-xs font-medium">Calorias</span>
                </div>
                <p className="text-sm font-bold text-green-800 dark:text-green-300">{lastPlan.calories || lastPlan.plan_data.weeklyTotals.averageCalories || 0}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg p-2 transition-all hover:shadow-sm">
                <div className="flex items-center text-blue-600 dark:text-blue-400 mb-0.5">
                  <Target className="h-3 w-3 mr-1" />
                  <span className="text-xs font-medium">Objetivo</span>
                </div>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-300">{getGoalFromMacros()}</p>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-lg p-2 transition-all hover:shadow-sm">
                <div className="flex items-center text-indigo-600 dark:text-indigo-400 mb-0.5">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  <span className="text-xs font-medium">Dias</span>
                </div>
                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">{Object.keys(lastPlan.plan_data.weeklyPlan).length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-lg p-2 transition-all hover:shadow-sm">
                <div className="flex items-center text-purple-600 dark:text-purple-400 mb-0.5">
                  <Clock className="h-3 w-3 mr-1" />
                  <span className="text-xs font-medium">Refeições</span>
                </div>
                <p className="text-sm font-bold text-purple-800 dark:text-purple-300">{getMealCount()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 rounded-lg p-2 transition-all hover:shadow-sm text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400">Proteínas</p>
                <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">{lastPlan.plan_data.weeklyTotals.averageProtein || 0}g</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 rounded-lg p-2 transition-all hover:shadow-sm text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400">Carboidratos</p>
                <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">{lastPlan.plan_data.weeklyTotals.averageCarbs || 0}g</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 rounded-lg p-2 transition-all hover:shadow-sm text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400">Gorduras</p>
                <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">{lastPlan.plan_data.weeklyTotals.averageFats || 0}g</p>
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
