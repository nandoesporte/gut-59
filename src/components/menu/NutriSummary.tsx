import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PieChart, BarChart, ArrowUpRight, Target, Calendar, Flame } from 'lucide-react';
import { MealPlan } from './types';

interface LastMealPlanData {
  id: string;
  created_at: string;
  calories: number;
  plan_data: MealPlan;
}

export const NutriSummary = () => {
  const [lastPlan, setLastPlan] = useState<LastMealPlanData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLastMealPlan = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("User not authenticated");
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
          console.error("Error fetching last meal plan:", error);
          setLoading(false);
          return;
        }

        if (data) {
          console.log("Found last meal plan:", data);
          const typedData: LastMealPlanData = {
            id: data.id,
            created_at: data.created_at,
            calories: data.calories,
            plan_data: data.plan_data as MealPlan
          };
          setLastPlan(typedData);
        }
      } catch (error) {
        console.error('Error fetching last meal plan:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLastMealPlan();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }).format(date);
  };

  const getGoalText = () => {
    if (!lastPlan?.plan_data) return "Não definido";
    
    // Try to extract goal from various places in the data structure
    const goal = lastPlan.plan_data.generatedBy || "Equilibrado";
    
    const goalMap: Record<string, string> = {
      "lose": "Perda de peso",
      "maintain": "Manutenção",
      "gain": "Ganho de massa",
      "maintenance": "Manutenção"
    };
    
    return goalMap[goal.toLowerCase()] || "Equilibrado";
  };

  const getMacrosPercentage = () => {
    if (!lastPlan?.plan_data?.weeklyTotals) return { protein: 0, carbs: 0, fats: 0 };
    
    const { averageProtein, averageCarbs, averageFats } = lastPlan.plan_data.weeklyTotals;
    const total = averageProtein + averageCarbs + averageFats;
    
    if (total === 0) return { protein: 0, carbs: 0, fats: 0 };
    
    return {
      protein: Math.round((averageProtein / total) * 100),
      carbs: Math.round((averageCarbs / total) * 100),
      fats: Math.round((averageFats / total) * 100),
    };
  };

  if (loading) {
    return (
      <Card className="w-full animate-pulse">
        <CardContent className="p-6">
          <div className="h-24 bg-gray-200 rounded-md"></div>
        </CardContent>
      </Card>
    );
  }

  if (!lastPlan) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Nutri
          </CardTitle>
          <CardDescription>
            Resumo do seu plano nutricional
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">
            Você ainda não tem um plano alimentar.
          </p>
          <Button onClick={() => navigate('/menu')} className="mt-2">
            Criar plano alimentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const macros = getMacrosPercentage();

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-2">
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary" />
          Nutri
        </CardTitle>
        <CardDescription>
          Resumo do seu plano nutricional
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col p-3 border rounded-lg bg-card/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Calorias Diárias</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold">{lastPlan.calories}</span>
              <span className="ml-1 text-xs text-muted-foreground">kcal</span>
            </div>
          </div>
          
          <div className="flex flex-col p-3 border rounded-lg bg-card/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Objetivo</span>
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">
              {getGoalText()}
            </div>
          </div>
          
          <div className="flex flex-col p-3 border rounded-lg bg-card/50 sm:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Gerado em</span>
              <Calendar className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-lg font-medium">
              {formatDate(lastPlan.created_at)}
            </div>
          </div>
        </div>
        
        <div className="p-4 pt-0">
          <div className="flex flex-col p-3 border rounded-lg bg-card/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Distribuição de Macros</span>
              <BarChart className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex flex-col items-center">
                <div className="text-lg font-bold">{macros.protein}%</div>
                <div className="text-xs text-muted-foreground">Proteína</div>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="text-lg font-bold">{macros.carbs}%</div>
                <div className="text-xs text-muted-foreground">Carboidratos</div>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="text-lg font-bold">{macros.fats}%</div>
                <div className="text-xs text-muted-foreground">Gorduras</div>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full mt-3 flex overflow-hidden">
              <div className="bg-blue-400 h-full" style={{ width: `${macros.protein}%` }}></div>
              <div className="bg-green-400 h-full" style={{ width: `${macros.carbs}%` }}></div>
              <div className="bg-yellow-400 h-full" style={{ width: `${macros.fats}%` }}></div>
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => navigate('/menu')} className="flex items-center gap-1">
            Ver detalhes
            <ArrowUpRight className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
