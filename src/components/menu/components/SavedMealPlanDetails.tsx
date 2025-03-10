
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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

const dayNameShort: Record<string, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sáb",
  sunday: "Dom"
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
  const isMobile = useIsMobile();
  const days = Object.keys(dayNameMap);
  const currentDayIndex = days.indexOf(selectedDay);

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

  const navigateDay = (direction: 'prev' | 'next') => {
    const totalDays = days.length;
    let newIndex = currentDayIndex;
    
    if (direction === 'prev') {
      newIndex = (currentDayIndex - 1 + totalDays) % totalDays;
    } else {
      newIndex = (currentDayIndex + 1) % totalDays;
    }
    
    setSelectedDay(days[newIndex]);
  };

  const renderDayPlan = (dayKey: string) => {
    const dayPlan = planData.weeklyPlan[dayKey];
    if (!dayPlan) return null;

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="p-3 sm:p-4 bg-muted rounded-md mb-4 sm:mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-primary/10 text-primary rounded-md p-1">📅</span>
            {dayNameMap[dayKey]} – Plano Alimentar
          </h2>
        </div>

        {dayPlan.meals.breakfast && (
          <div className="relative border rounded-lg p-4 hover:shadow-md transition-shadow">
            <MealSection
              title="Café da Manhã"
              icon={<div className="w-5 h-5 text-primary">☀️</div>}
              meal={dayPlan.meals.breakfast}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={() => handleReplaceFood(dayPlan.meals.breakfast.foods[0], dayKey, "breakfast", 0)}
            >
              Substituir
            </Button>
          </div>
        )}

        {dayPlan.meals.morningSnack && (
          <div className="relative border rounded-lg p-4 hover:shadow-md transition-shadow">
            <MealSection
              title="Lanche da Manhã"
              icon={<div className="w-5 h-5 text-primary">🥪</div>}
              meal={dayPlan.meals.morningSnack}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={() => handleReplaceFood(dayPlan.meals.morningSnack.foods[0], dayKey, "morningSnack", 0)}
            >
              Substituir
            </Button>
          </div>
        )}

        {dayPlan.meals.lunch && (
          <div className="relative border rounded-lg p-4 hover:shadow-md transition-shadow">
            <MealSection
              title="Almoço"
              icon={<div className="w-5 h-5 text-primary">🍽️</div>}
              meal={dayPlan.meals.lunch}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={() => handleReplaceFood(dayPlan.meals.lunch.foods[0], dayKey, "lunch", 0)}
            >
              Substituir
            </Button>
          </div>
        )}

        {dayPlan.meals.afternoonSnack && (
          <div className="relative border rounded-lg p-4 hover:shadow-md transition-shadow">
            <MealSection
              title="Lanche da Tarde"
              icon={<div className="w-5 h-5 text-primary">🍎</div>}
              meal={dayPlan.meals.afternoonSnack}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={() => handleReplaceFood(dayPlan.meals.afternoonSnack.foods[0], dayKey, "afternoonSnack", 0)}
            >
              Substituir
            </Button>
          </div>
        )}

        {dayPlan.meals.dinner && (
          <div className="relative border rounded-lg p-4 hover:shadow-md transition-shadow">
            <MealSection
              title="Jantar"
              icon={<div className="w-5 h-5 text-primary">🌙</div>}
              meal={dayPlan.meals.dinner}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-2 right-2"
              onClick={() => handleReplaceFood(dayPlan.meals.dinner.foods[0], dayKey, "dinner", 0)}
            >
              Substituir
            </Button>
          </div>
        )}

        {dayPlan.dailyTotals && (
          <DailyTotals totalNutrition={dayPlan.dailyTotals} />
        )}
      </div>
    );
  };

  // Mobile day navigation with buttons
  const renderMobileDayNav = () => (
    <div className="flex items-center justify-between mb-4 bg-muted rounded-lg p-2">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigateDay('prev')}
        className="p-1 h-8 w-8"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <h3 className="text-lg font-medium">
        {dayNameMap[selectedDay]}
      </h3>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigateDay('next')}
        className="p-1 h-8 w-8"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );

  if (!planData || !planData.weeklyPlan) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="mb-4 sm:mb-6">
            <DialogTitle className="text-xl sm:text-2xl">Detalhes do Plano Alimentar</DialogTitle>
            <DialogDescription className="text-base sm:text-lg">
              Visualize os detalhes do seu plano e faça substituições de alimentos se necessário
            </DialogDescription>
          </DialogHeader>

          {isMobile && renderMobileDayNav()}

          <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
            {!isMobile && (
              <TabsList className="mb-6 w-full flex flex-nowrap overflow-x-auto pb-2 justify-start sm:justify-center gap-1 sm:gap-2">
                {Object.entries(dayNameMap).map(([day, dayName]) => (
                  <TabsTrigger 
                    key={day} 
                    value={day}
                    className="whitespace-nowrap text-sm sm:text-base px-2 sm:px-4"
                  >
                    <span className="hidden sm:inline">{dayName}</span>
                    <span className="sm:hidden">{dayNameShort[day]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            )}

            {Object.keys(dayNameMap).map(day => (
              <TabsContent key={day} value={day}>
                {renderDayPlan(day)}
              </TabsContent>
            ))}
          </Tabs>

          {planData.recommendations && (
            <div className="mt-6">
              <Recommendations recommendations={formatRecommendations(planData.recommendations)} />
            </div>
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
