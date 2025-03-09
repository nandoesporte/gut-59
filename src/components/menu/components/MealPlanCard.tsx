
import { Card, CardContent } from "@/components/ui/card";
import { Coffee, Apple, Utensils, Moon } from "lucide-react";
import { MealPlan, DailyNutrition, Meal } from "../types";
import { MealSection } from "./MealSection";
import { DailyTotals } from "./DailyTotals";
import { formatDateToString } from "../utils/meal-plan-helpers";

interface MealPlanCardProps {
  mealPlan: MealPlan;
  day?: string;
}

export const MealPlanCard = ({ mealPlan, day = "monday" }: MealPlanCardProps) => {
  if (!mealPlan?.weeklyPlan || !mealPlan.weeklyPlan[day]) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-center text-gray-500">
            Não existem dados de plano alimentar para este dia.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const dayPlan = mealPlan.weeklyPlan[day];
  const date = mealPlan.created_at ? new Date(mealPlan.created_at) : new Date();
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">{dayPlan.dayName || "Plano Alimentar"}</h3>
          <p className="text-sm text-gray-500">
            {formatDateToString(date)} • {mealPlan.userCalories || mealPlan.weeklyTotals.averageCalories} kcal
          </p>
        </div>
        
        <div className="space-y-4">
          {dayPlan.meals?.breakfast && (
            <MealSection
              title="Café da Manhã"
              icon={<Coffee className="h-4 w-4 text-amber-500" />}
              meal={dayPlan.meals.breakfast}
            />
          )}
          
          {dayPlan.meals?.morningSnack && (
            <MealSection
              title="Lanche da Manhã"
              icon={<Apple className="h-4 w-4 text-red-500" />}
              meal={dayPlan.meals.morningSnack}
            />
          )}
          
          {dayPlan.meals?.lunch && (
            <MealSection
              title="Almoço"
              icon={<Utensils className="h-4 w-4 text-green-600" />}
              meal={dayPlan.meals.lunch}
            />
          )}
          
          {dayPlan.meals?.afternoonSnack && (
            <MealSection
              title="Lanche da Tarde"
              icon={<Apple className="h-4 w-4 text-orange-500" />}
              meal={dayPlan.meals.afternoonSnack}
            />
          )}
          
          {dayPlan.meals?.dinner && (
            <MealSection
              title="Jantar"
              icon={<Moon className="h-4 w-4 text-indigo-500" />}
              meal={dayPlan.meals.dinner}
            />
          )}
          
          <DailyTotals
            totalNutrition={dayPlan.dailyTotals as DailyNutrition}
          />
        </div>
      </CardContent>
    </Card>
  );
};
