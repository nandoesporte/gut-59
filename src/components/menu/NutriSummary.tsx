
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
          // Convert the JSON data to the expected MealPlan type
          const planDataWithTypes: LastMealPlanData = {
            id: data.id,
            created_at: data.created_at,
            calories: data.calories,
            plan_data: JSON.parse(JSON.stringify(data.plan_data)) as MealPlan
          };
          setLastPlan(planDataWithTypes);
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
      <Card className="w-full h-[250px] animate-pulse">
        <CardContent className="p-6 flex items-center justify-center h-full">
          <div className="h-24 w-24 rounded-full bg-gray-200 animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!lastPlan) {
    return (
      <Card className="w-full overflow-hidden shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-primary/5 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <PieChart className="w-5 h-5" />
            Nutri
          </CardTitle>
          <CardDescription>
            Resumo do seu plano nutricional
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-primary/10 p-6">
              <PieChart className="w-12 h-12 text-primary/60" />
            </div>
            <p className="text-muted-foreground">
              Você ainda não tem um plano alimentar.
            </p>
            <Button onClick={() => navigate('/menu')} className="mt-2">
              Criar plano alimentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const macros = getMacrosPercentage();

  return (
    <Card className="w-full overflow-hidden shadow-md border-0">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-primary/5 border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-primary">
          <PieChart className="w-5 h-5" />
          Nutri
        </CardTitle>
        <CardDescription>
          Resumo do seu plano nutricional
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1 flex flex-col p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-primary/80">Calorias Diárias</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-primary">{lastPlan.calories}</span>
              <span className="ml-1 text-xs text-muted-foreground">kcal</span>
            </div>
          </div>
          
          <div className="flex flex-col p-4 rounded-xl bg-gradient-to-br from-green-100 to-green-50 border border-green-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-green-700">Objetivo</span>
              <Target className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-800">
              {getGoalText()}
            </div>
          </div>
          
          <div className="flex flex-col p-4 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-700">Gerado em</span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-medium text-blue-800 truncate">
              {formatDate(lastPlan.created_at)}
            </div>
          </div>
        </div>
        
        <div className="px-5 pb-4">
          <div className="flex flex-col p-4 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-100">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-purple-700">Distribuição de Macros</span>
              <BarChart className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex flex-col items-center">
                <div className="text-xl font-bold text-blue-700">{macros.protein}%</div>
                <div className="text-xs text-muted-foreground">Proteína</div>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="text-xl font-bold text-green-700">{macros.carbs}%</div>
                <div className="text-xs text-muted-foreground">Carboidratos</div>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="text-xl font-bold text-yellow-700">{macros.fats}%</div>
                <div className="text-xs text-muted-foreground">Gorduras</div>
              </div>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full mt-3 flex overflow-hidden">
              <div className="bg-blue-400 h-full" style={{ width: `${macros.protein}%` }}></div>
              <div className="bg-green-400 h-full" style={{ width: `${macros.carbs}%` }}></div>
              <div className="bg-yellow-400 h-full" style={{ width: `${macros.fats}%` }}></div>
            </div>
          </div>
        </div>
        
        <div className="p-5 pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => navigate('/menu')} className="flex items-center gap-1 border-primary text-primary hover:bg-primary/5">
            Ver detalhes completos
            <ArrowUpRight className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
