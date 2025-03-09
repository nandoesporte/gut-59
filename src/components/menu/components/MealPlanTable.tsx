
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MealSection } from "./MealSection";
import type { DayPlan, MealPlan } from "../types";

interface MealPlanTableProps {
  dayPlan?: DayPlan;
  mealPlan?: MealPlan;
}

export const MealPlanTable = ({ dayPlan, mealPlan }: MealPlanTableProps) => {
  // Handle the case where mealPlan is provided instead of dayPlan
  if (mealPlan && !dayPlan) {
    // Display the first day's plan when mealPlan is provided
    const firstDayKey = Object.keys(mealPlan.weeklyPlan)[0] as keyof typeof mealPlan.weeklyPlan;
    dayPlan = mealPlan.weeklyPlan[firstDayKey];
  }

  if (!dayPlan || !dayPlan.meals) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500">Dados do plano indisponíveis.</p>
      </div>
    );
  }

  const mealTypes = {
    breakfast: "Café da Manhã",
    morningSnack: "Lanche da Manhã",
    lunch: "Almoço",
    afternoonSnack: "Lanche da Tarde",
    dinner: "Jantar"
  };

  return (
    <Accordion type="multiple" defaultValue={["breakfast", "lunch", "dinner"]} className="w-full">
      {Object.entries(mealTypes).map(([mealType, mealName]) => {
        const meal = dayPlan?.meals[mealType as keyof typeof dayPlan.meals];
        if (!meal) return null;
        
        return (
          <AccordionItem key={mealType} value={mealType}>
            <AccordionTrigger className="hover:bg-gray-50 px-4 py-3 rounded-lg">
              <div className="flex items-center justify-between w-full">
                <div className="font-medium">{mealName}</div>
                <div className="text-sm text-gray-500 mr-4">
                  {meal.calories} kcal • 
                  <span className="ml-1">{meal.macros?.protein || 0}g proteína</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-2 pb-4">
              <MealSection meal={meal} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
