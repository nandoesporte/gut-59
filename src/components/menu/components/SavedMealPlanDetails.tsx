
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { SavedDayPlanRenderer } from "./SavedDayPlanRenderer";
import { Recommendations } from "./Recommendations";
import { MealPlan, Food } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { FoodReplacementDialog } from "./FoodReplacementDialog";
import { formatRecommendations } from "../utils/recommendations-formatter";

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

            {Object.entries(dayNameMap).map(([day, dayName]) => (
              <TabsContent key={day} value={day}>
                <SavedDayPlanRenderer
                  dayKey={day}
                  dayName={dayName}
                  dayPlan={planData.weeklyPlan[day]}
                  onReplaceFood={handleReplaceFood}
                />
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
