
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PieChart, Utensils, Dumbbell, ArrowUpRight, Target, Calendar, Flame } from 'lucide-react';
import { MealPlan } from './types';
import { Progress } from "@/components/ui/progress";

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

  // Used calories (mocked for now, but could be integrated with food diary)
  const [consumedCalories, setConsumedCalories] = useState<number>(0);

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
          
          // For demo purposes, set consumed calories to a random value between 0 and target calories
          setConsumedCalories(Math.floor(Math.random() * data.calories * 0.7));
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

  const getRemainingCalories = () => {
    if (!lastPlan) return 0;
    return Math.max(0, lastPlan.calories - consumedCalories);
  };

  const getCaloriesProgress = () => {
    if (!lastPlan) return 0;
    return Math.min(100, Math.round((consumedCalories / lastPlan.calories) * 100));
  };

  if (loading) {
    return (
      <Card className="w-full h-[350px] animate-pulse">
        <CardContent className="p-6 flex items-center justify-center h-full">
          <div className="h-32 w-32 rounded-full bg-gray-200 animate-pulse"></div>
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
      <CardHeader className="bg-gradient-to-r from-blue-50 to-primary/5 border-b flex items-center justify-between flex-row pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-primary">
            <PieChart className="w-5 h-5" />
            Nutri
          </CardTitle>
          <CardDescription>
            Resumo do seu plano nutricional
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/menu')} 
          className="border-primary text-primary hover:bg-primary/5"
        >
          Ver Detalhes
          <ArrowUpRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {/* Main Calories Section */}
        <div className="p-4 border-b">
          <h3 className="text-xl font-bold text-center text-primary mb-1">Calorias</h3>
          <p className="text-sm text-gray-500 text-center mb-4">
            Restantes = Meta - Alimentos + Exercícios
          </p>
          
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-xs font-medium">Meta base</span>
            </div>
            <span className="font-semibold">{lastPlan.calories}</span>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1">
              <Utensils className="w-3 h-3 text-orange-500" />
              <span className="text-xs font-medium">Alimentos</span>
            </div>
            <span className="font-semibold">-{consumedCalories}</span>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3 text-green-500" />
              <span className="text-xs font-medium">Exercícios</span>
            </div>
            <span className="font-semibold">+0</span>
          </div>
          
          <div className="flex justify-center">
            <div className="relative rounded-full w-32 h-32 border-8 border-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold">{getRemainingCalories()}</div>
                <div className="text-xs text-gray-500">Restantes</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={getCaloriesProgress()} className="h-2" />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">0</span>
              <span className="text-xs text-gray-500">{lastPlan.calories}</span>
            </div>
          </div>
        </div>
        
        {/* Macronutrients Section */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Macronutrientes</h3>
          </div>
          
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-blue-400" 
              style={{ width: `${macros.protein}%` }}
              title={`Proteína: ${macros.protein}%`}
            ></div>
            <div 
              className="h-full bg-green-400" 
              style={{ width: `${macros.carbs}%` }}
              title={`Carboidratos: ${macros.carbs}%`}
            ></div>
            <div 
              className="h-full bg-yellow-400" 
              style={{ width: `${macros.fats}%` }}
              title={`Gorduras: ${macros.fats}%`}
            ></div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span className="text-xs">Proteína</span>
              </span>
              <span className="font-semibold">{macros.protein}%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-xs">Carbos</span>
              </span>
              <span className="font-semibold">{macros.carbs}%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-xs">Gorduras</span>
              </span>
              <span className="font-semibold">{macros.fats}%</span>
            </div>
          </div>
        </div>
        
        {/* Additional Info */}
        <div className="grid grid-cols-2 p-4 gap-4">
          <div className="flex flex-col bg-primary/5 rounded-lg p-3">
            <span className="text-xs text-gray-500 mb-1">Objetivo</span>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{getGoalText()}</span>
            </div>
          </div>
          
          <div className="flex flex-col bg-primary/5 rounded-lg p-3">
            <span className="text-xs text-gray-500 mb-1">Data do plano</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">
                {formatDate(lastPlan.created_at).split(' ')[0]}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
