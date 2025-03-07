
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, AlertCircle, Utensils, Target, Flame } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NutritionPreference {
  calories_needed: number;
  goal: string;
  created_at: string;
}

interface MealPlan {
  id: string;
  created_at: string;
  calories: number;
}

export const NutritionSummary = () => {
  const [loading, setLoading] = useState(true);
  const [nutritionPreference, setNutritionPreference] = useState<NutritionPreference | null>(null);
  const [latestMealPlan, setLatestMealPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNutritionData = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch the latest nutrition preferences
        const { data: preferences, error: preferencesError } = await supabase
          .from('nutrition_preferences')
          .select('calories_needed, goal, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (preferencesError) throw preferencesError;

        // Fetch the latest meal plan
        const { data: mealPlans, error: mealPlansError } = await supabase
          .from('meal_plans')
          .select('id, created_at, calories')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (mealPlansError) throw mealPlansError;

        setNutritionPreference(preferences?.[0] || null);
        setLatestMealPlan(mealPlans?.[0] || null);
      } catch (error) {
        console.error('Error fetching nutrition data:', error);
        setError('Não foi possível carregar os dados nutricionais.');
      } finally {
        setLoading(false);
      }
    };

    fetchNutritionData();
  }, []);

  const handleNavigateToMenu = () => {
    navigate('/menu');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const getGoalLabel = (goal: string) => {
    const goals: Record<string, string> = {
      'weight_loss': 'Perda de peso',
      'lose_weight': 'Perda de peso',
      'weight_gain': 'Ganho de peso',
      'muscle_gain': 'Ganho de massa muscular',
      'maintenance': 'Manutenção do peso',
      'improved_health': 'Melhora da saúde',
    };
    return goals[goal] || goal;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If there's no nutrition data yet
  if (!nutritionPreference && !latestMealPlan) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium flex items-center justify-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Nutri+
            </h3>
            <p className="text-gray-600">
              Você ainda não possui um plano nutricional.
            </p>
            <Button onClick={handleNavigateToMenu} className="w-full sm:w-auto">
              Criar meu plano alimentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <div className="bg-primary/10 px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Utensils className="h-5 w-5 text-primary" />
          Nutri+
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNavigateToMenu}
          className="text-sm"
        >
          Ver plano completo
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {nutritionPreference && (
            <>
              <div className="p-4 flex items-center">
                <div className="bg-orange-100 p-3 rounded-full mr-4">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Necessidade calórica diária</p>
                  <p className="text-xl font-bold">{nutritionPreference.calories_needed} kcal</p>
                </div>
              </div>

              <div className="p-4 flex items-center">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <Target className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Objetivo</p>
                  <p className="text-xl font-bold">{getGoalLabel(nutritionPreference.goal)}</p>
                </div>
              </div>
            </>
          )}

          {latestMealPlan && (
            <div className="p-4 flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <Utensils className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">Último plano alimentar</p>
                <p className="text-lg font-semibold">{formatDate(latestMealPlan.created_at)}</p>
                <p className="text-sm text-gray-600">Média diária: {latestMealPlan.calories} kcal</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
