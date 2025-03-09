
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MealSection } from "./MealSection";
import { DailyTotals } from "./DailyTotals";
import { Recommendations } from "./Recommendations";
import { MealPlan, Food, RecommendationsObject } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { FoodReplacementDialog } from "./FoodReplacementDialog";

interface SavedMealPlanDetailsProps {
  planId: string;
  planData: MealPlan;
  isOpen: boolean;
  onClose: () => void;
}

const dayNameMap: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
};

export const SavedMealPlanDetails = ({ planId, planData, isOpen, onClose }: SavedMealPlanDetailsProps) => {
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const [replaceFoodDialogOpen, setReplaceFoodDialogOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<{
    food: Food;
    dayKey: string;
    mealType: string;
    index: number;
  } | null>(null);

  const handleReplaceFood = (food: Food, dayKey: string, mealType: string, index: number) => {
    setSelectedFood({ food, dayKey, mealType, index });
    setReplaceFoodDialogOpen(true);
  };

  const handleFoodReplaced = async (originalFood: Food, newFood: Food, dayKey: string, mealType: string, foodIndex: number) => {
    try {
      // Create a deep copy of the plan data
      const updatedPlanData = JSON.parse(JSON.stringify(planData)) as MealPlan;
      
      // Update the specific food item
      if (updatedPlanData.weeklyPlan[dayKey]?.meals) {
        const dayPlan = updatedPlanData.weeklyPlan[dayKey];
        const meal = dayPlan.meals[mealType as keyof typeof dayPlan.meals];
        
        if (meal && meal.foods && meal.foods[foodIndex]) {
          meal.foods[foodIndex] = newFood;
          
          // Update the meal plan in the database
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            toast.error("Usuário não autenticado");
            return;
          }

          // Cast the MealPlan to a compatible JSON structure for Supabase
          const { error } = await supabase
            .from('meal_plans')
            .update({ 
              plan_data: updatedPlanData as unknown as Record<string, any> 
            })
            .eq('id', planId);

          if (error) {
            console.error("Erro ao atualizar plano:", error);
            toast.error("Erro ao atualizar o alimento");
            return;
          }

          toast.success("Alimento substituído com sucesso!");
        }
      }
    } catch (error) {
      console.error("Erro ao substituir alimento:", error);
      toast.error("Erro ao substituir o alimento");
    } finally {
      setReplaceFoodDialogOpen(false);
    }
  };

  // Function to format recommendations
  const formatRecommendations = (recs: string | string[] | RecommendationsObject | undefined): {
    general?: string;
    preworkout?: string;
    postworkout?: string;
    timing?: string[];
  } | undefined => {
    if (!recs) return undefined;
    
    if (typeof recs === 'string') {
      return { general: recs };
    } else if (Array.isArray(recs)) {
      return { general: recs.join('\n') };
    }
    
    // Convert any string[] to string by joining with newlines
    let formatted: { 
      general?: string; 
      preworkout?: string; 
      postworkout?: string; 
      timing?: string[];
    } = {};
    
    if (recs.general) {
      formatted.general = Array.isArray(recs.general) ? recs.general.join('\n') : recs.general;
    }
    
    if (recs.preworkout) {
      formatted.preworkout = Array.isArray(recs.preworkout) ? recs.preworkout.join('\n') : recs.preworkout;
    }
    
    if (recs.postworkout) {
      formatted.postworkout = Array.isArray(recs.postworkout) ? recs.postworkout.join('\n') : recs.postworkout;
    }
    
    if (recs.timing) {
      formatted.timing = recs.timing;
    }
    
    return formatted;
  };

  const renderDayPlan = (dayKey: string) => {
    const dayPlan = planData.weeklyPlan[dayKey];
    if (!dayPlan) return null;

    return (
      <div className="space-y-6">
        <div className="p-4 bg-muted rounded-md mb-6">
          <h2 className="text-xl font-bold">📅 {dayNameMap[dayKey]} – Plano Alimentar</h2>
        </div>

        {dayPlan.meals.breakfast && (
          <div className="relative">
            <MealSection
              title="Café da Manhã"
              icon={<div className="w-5 h-5 text-primary">☀️</div>}
              meal={dayPlan.meals.breakfast}
            />
            {dayPlan.meals.breakfast.foods.map((food, index) => (
              <Button 
                key={`breakfast-${index}`}
                variant="outline" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => handleReplaceFood(food, dayKey, "breakfast", index)}
              >
                Substituir
              </Button>
            ))}
          </div>
        )}

        {dayPlan.meals.morningSnack && (
          <div className="relative">
            <MealSection
              title="Lanche da Manhã"
              icon={<div className="w-5 h-5 text-primary">🥪</div>}
              meal={dayPlan.meals.morningSnack}
            />
            {dayPlan.meals.morningSnack.foods.map((food, index) => (
              <Button 
                key={`morningSnack-${index}`}
                variant="outline" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => handleReplaceFood(food, dayKey, "morningSnack", index)}
              >
                Substituir
              </Button>
            ))}
          </div>
        )}

        {dayPlan.meals.lunch && (
          <div className="relative">
            <MealSection
              title="Almoço"
              icon={<div className="w-5 h-5 text-primary">🍽️</div>}
              meal={dayPlan.meals.lunch}
            />
            {dayPlan.meals.lunch.foods.map((food, index) => (
              <Button 
                key={`lunch-${index}`}
                variant="outline" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => handleReplaceFood(food, dayKey, "lunch", index)}
              >
                Substituir
              </Button>
            ))}
          </div>
        )}

        {dayPlan.meals.afternoonSnack && (
          <div className="relative">
            <MealSection
              title="Lanche da Tarde"
              icon={<div className="w-5 h-5 text-primary">🍎</div>}
              meal={dayPlan.meals.afternoonSnack}
            />
            {dayPlan.meals.afternoonSnack.foods.map((food, index) => (
              <Button 
                key={`afternoonSnack-${index}`}
                variant="outline" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => handleReplaceFood(food, dayKey, "afternoonSnack", index)}
              >
                Substituir
              </Button>
            ))}
          </div>
        )}

        {dayPlan.meals.dinner && (
          <div className="relative">
            <MealSection
              title="Jantar"
              icon={<div className="w-5 h-5 text-primary">🌙</div>}
              meal={dayPlan.meals.dinner}
            />
            {dayPlan.meals.dinner.foods.map((food, index) => (
              <Button 
                key={`dinner-${index}`}
                variant="outline" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => handleReplaceFood(food, dayKey, "dinner", index)}
              >
                Substituir
              </Button>
            ))}
          </div>
        )}

        {dayPlan.dailyTotals && (
          <DailyTotals totalNutrition={dayPlan.dailyTotals} />
        )}
      </div>
    );
  };

  if (!planData || !planData.weeklyPlan) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Plano Alimentar</DialogTitle>
            <DialogDescription>
              Visualize os detalhes do seu plano e faça substituições de alimentos se necessário
            </DialogDescription>
          </DialogHeader>

          <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
            <TabsList className="mb-6 w-full flex flex-nowrap overflow-x-auto pb-2 justify-start sm:justify-center gap-1 sm:gap-2">
              {Object.entries(dayNameMap).map(([day, dayName]) => (
                <TabsTrigger 
                  key={day} 
                  value={day}
                  className="whitespace-nowrap text-sm sm:text-base px-2 sm:px-4"
                >
                  <span className="hidden sm:inline">{dayName}</span>
                  <span className="sm:hidden">{dayName.split('-')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(dayNameMap).map(day => (
              <TabsContent key={day} value={day}>
                {renderDayPlan(day)}
              </TabsContent>
            ))}
          </Tabs>

          {planData.recommendations && (
            <Recommendations recommendations={formatRecommendations(planData.recommendations)} />
          )}
        </DialogContent>
      </Dialog>

      {selectedFood && (
        <FoodReplacementDialog
          open={replaceFoodDialogOpen}
          onOpenChange={setReplaceFoodDialogOpen}
          originalFood={selectedFood.food}
          dayKey={selectedFood.dayKey}
          mealType={selectedFood.mealType}
          foodIndex={selectedFood.index}
          onFoodReplaced={handleFoodReplaced}
        />
      )}
    </>
  );
};
