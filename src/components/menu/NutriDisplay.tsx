
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Goal } from "@/components/menu/GoalCards";
import { ArrowRight, Utensils, Goal as GoalIcon, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const NutriDisplay = () => {
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);
  const [goal, setGoal] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [hasMealPlan, setHasMealPlan] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNutritionData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch user's nutrition preferences to get calorie needs and goal
        const { data: nutritionPrefs, error: nutritionError } = await supabase
          .from('nutrition_preferences')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (nutritionError) {
          console.error("Error fetching nutrition preferences:", nutritionError);
        }

        // Fetch the latest meal plan to check if one exists
        const { data: mealPlans, error: mealPlanError } = await supabase
          .from('meal_plans')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (mealPlanError) {
          console.error("Error fetching meal plans:", mealPlanError);
        }

        if (nutritionPrefs) {
          // Map goal from database enum to display text
          const goalMap: Record<string, string> = {
            'lose_weight': 'Perder Peso',
            'maintain': 'Manter Peso',
            'gain_mass': 'Ganhar Massa'
          };

          setCalorieNeeds(nutritionPrefs.daily_calories || 0);
          setGoal(goalMap[nutritionPrefs.goal] || 'Não definido');
        }

        setHasMealPlan(mealPlans && mealPlans.length > 0);
      } catch (error) {
        console.error("Error in fetchNutritionData:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNutritionData();
  }, []);

  const handleAccessMealPlan = () => {
    navigate('/menu');
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="py-4">
          <div className="flex justify-center items-center h-40">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-slate-200 h-10 w-10"></div>
              <div className="flex-1 space-y-6 py-1">
                <div className="h-2 bg-slate-200 rounded"></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                    <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                  </div>
                  <div className="h-2 bg-slate-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!calorieNeeds) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            Nutri+
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Você ainda não possui um plano nutricional. Crie agora mesmo!
            </p>
            <Button 
              onClick={handleAccessMealPlan}
              className="gap-2"
            >
              Criar Plano Nutricional <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-100 to-green-50">
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-primary" />
          Nutri+
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium">Necessidade Calórica:</span>
            </div>
            <span className="text-xl font-bold">{calorieNeeds} kcal</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GoalIcon className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Objetivo:</span>
            </div>
            <Badge variant="outline" className="text-sm">
              {goal}
            </Badge>
          </div>

          <Button 
            onClick={handleAccessMealPlan} 
            className="w-full mt-4 gap-2"
            variant={hasMealPlan ? "default" : "outline"}
          >
            {hasMealPlan ? "Acessar Plano Alimentar" : "Criar Plano Alimentar"} 
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
