
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

export const LastMealPlanSummary = () => {
  const [lastPlan, setLastPlan] = useState<{
    id: string;
    created_at: string;
    plan_data: MealPlan;
    calories: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
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

        // Buscar o plano alimentar mais recente do usuário
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
          // Validar se o plano possui a estrutura esperada
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
    // Navegar para a página de detalhes do plano com o ID do plano
    if (lastPlan && lastPlan.id) {
      navigate(`/menu?planId=${lastPlan.id}`);
    } else {
      navigate("/menu");
    }
  };

  // Formatar a data de criação do plano
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
    return null; // Não exibir nada se não houver plano
  }

  // Calcular o número de refeições no plano
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

  // Obter o objetivo baseado nas macros (maior %, aproximado)
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
    <Card className="w-full mt-4 overflow-hidden border-none shadow-md bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
      <CardContent className="p-6">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Seu Plano Alimentar</h3>
                <p className="text-sm text-gray-500">
                  {formatDate(lastPlan.created_at)}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewDetails}
              className="bg-white hover:bg-primary/5 border-primary/20 text-primary hover:text-primary-600 transition-all"
            >
              Ver completo <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl p-3 transition-all hover:shadow-sm">
              <div className="flex items-center text-green-600 dark:text-green-400 mb-1">
                <Flame className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Calorias</span>
              </div>
              <p className="text-xl font-bold">{lastPlan.calories || lastPlan.plan_data.weeklyTotals.averageCalories || 0} kcal</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl p-3 transition-all hover:shadow-sm">
              <div className="flex items-center text-blue-600 dark:text-blue-400 mb-1">
                <Target className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Objetivo</span>
              </div>
              <p className="text-xl font-bold">{getGoalFromMacros()}</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl p-3 transition-all hover:shadow-sm">
              <div className="flex items-center text-purple-600 dark:text-purple-400 mb-1">
                <CalendarDays className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Dias</span>
              </div>
              <p className="text-xl font-bold">{Object.keys(lastPlan.plan_data.weeklyPlan).length}</p>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 rounded-xl p-3 transition-all hover:shadow-sm">
              <div className="flex items-center text-amber-600 dark:text-amber-400 mb-1">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Refeições</span>
              </div>
              <p className="text-xl font-bold">{getMealCount()} / dia</p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 rounded-lg p-3 transition-all hover:shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Proteínas</p>
              <p className="font-semibold text-lg">{lastPlan.plan_data.weeklyTotals.averageProtein || 0}g</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 rounded-lg p-3 transition-all hover:shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Carboidratos</p>
              <p className="font-semibold text-lg">{lastPlan.plan_data.weeklyTotals.averageCarbs || 0}g</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 rounded-lg p-3 transition-all hover:shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Gorduras</p>
              <p className="font-semibold text-lg">{lastPlan.plan_data.weeklyTotals.averageFats || 0}g</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
