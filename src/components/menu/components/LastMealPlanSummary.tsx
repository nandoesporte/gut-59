
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { toast } from "sonner";
import { CalendarDays, Flame, Target, Clock, FileText, ChevronRight } from "lucide-react";
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
          const plan = data.plan_data;
          if (plan && plan.weeklyPlan && plan.weeklyTotals) {
            console.log("Último plano alimentar encontrado:", data.id);
            setLastPlan(data);
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
    navigate("/menu");
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
    <Card className="w-full mt-4 hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-semibold flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-600" />
                Seu Plano Alimentar
              </h3>
              <p className="text-sm text-gray-500">
                {formatDate(lastPlan.created_at)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleViewDetails}>
              Ver completo <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center text-green-600 mb-1">
                <Flame className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Calorias</span>
              </div>
              <p className="text-xl font-bold">{lastPlan.calories || lastPlan.plan_data.weeklyTotals.averageCalories || 0} kcal</p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center text-blue-600 mb-1">
                <Target className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Objetivo</span>
              </div>
              <p className="text-xl font-bold">{getGoalFromMacros()}</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center text-purple-600 mb-1">
                <CalendarDays className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Dias</span>
              </div>
              <p className="text-xl font-bold">{Object.keys(lastPlan.plan_data.weeklyPlan).length}</p>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="flex items-center text-amber-600 mb-1">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Refeições</span>
              </div>
              <p className="text-xl font-bold">{getMealCount()} / dia</p>
            </div>
          </div>
          
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500">Proteínas</p>
              <p className="font-semibold">{lastPlan.plan_data.weeklyTotals.averageProtein || 0}g</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500">Carboidratos</p>
              <p className="font-semibold">{lastPlan.plan_data.weeklyTotals.averageCarbs || 0}g</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500">Gorduras</p>
              <p className="font-semibold">{lastPlan.plan_data.weeklyTotals.averageFats || 0}g</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
