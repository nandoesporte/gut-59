
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Coffee, Apple, Utensils, Moon, Sun } from "lucide-react";
import { DayPlan } from "../types";
import { MealSection } from "./MealSection";
import { DailyTotals } from "./DailyTotals";

interface DayPlanContentProps {
  dayPlan: DayPlan;
  dayLabel: string;
  mealTypeLabels: Record<string, string>;
  unitLabels: Record<string, string>;
  macroLabels: Record<string, string>;
}

export const DayPlanContent: React.FC<DayPlanContentProps> = ({
  dayPlan,
  dayLabel,
  mealTypeLabels,
  unitLabels,
  macroLabels
}) => {
  // Traduzir o nome do dia da semana
  const translateDayName = (dayName: string): string => {
    const translations: Record<string, string> = {
      "Monday": "Segunda-feira",
      "Tuesday": "Terça-feira",
      "Wednesday": "Quarta-feira",
      "Thursday": "Quinta-feira",
      "Friday": "Sexta-feira",
      "Saturday": "Sábado",
      "Sunday": "Domingo"
    };
    
    return translations[dayName] || dayName;
  };

  return (
    <Card className="animate-fadeIn">
      <CardContent className="p-2 sm:p-6">
        <h3 className="font-bold text-lg sm:text-xl mb-3 flex items-center">
          <Sun className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-blue-600" />
          {translateDayName(dayPlan.dayName) || dayLabel || "Dia da Semana"}
        </h3>
        
        <div className="grid grid-cols-1 gap-3 sm:gap-6">
          {dayPlan.meals?.breakfast && (
            <div className="border rounded-lg p-2.5 sm:p-4 hover:shadow-sm transition-shadow">
              <MealSection
                title={mealTypeLabels["breakfast"] || "Café da Manhã"}
                icon={<Coffee className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />}
                meal={dayPlan.meals.breakfast}
                unitLabels={unitLabels}
                className="text-sm sm:text-base"
              />
            </div>
          )}
          
          {dayPlan.meals?.morningSnack && (
            <div className="border rounded-lg p-2.5 sm:p-4 hover:shadow-sm transition-shadow">
              <MealSection
                title={mealTypeLabels["morningSnack"] || "Lanche da Manhã"}
                icon={<Apple className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />}
                meal={dayPlan.meals.morningSnack}
                unitLabels={unitLabels}
                className="text-sm sm:text-base"
              />
            </div>
          )}
          
          {dayPlan.meals?.lunch && (
            <div className="border rounded-lg p-2.5 sm:p-4 hover:shadow-sm transition-shadow">
              <MealSection
                title={mealTypeLabels["lunch"] || "Almoço"}
                icon={<Utensils className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />}
                meal={dayPlan.meals.lunch}
                unitLabels={unitLabels}
                className="text-sm sm:text-base"
              />
            </div>
          )}
          
          {dayPlan.meals?.afternoonSnack && (
            <div className="border rounded-lg p-2.5 sm:p-4 hover:shadow-sm transition-shadow">
              <MealSection
                title={mealTypeLabels["afternoonSnack"] || "Lanche da Tarde"}
                icon={<Apple className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />}
                meal={dayPlan.meals.afternoonSnack}
                unitLabels={unitLabels}
                className="text-sm sm:text-base"
              />
            </div>
          )}
          
          {dayPlan.meals?.dinner && (
            <div className="border rounded-lg p-2.5 sm:p-4 hover:shadow-sm transition-shadow">
              <MealSection
                title={mealTypeLabels["dinner"] || "Jantar"}
                icon={<Moon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />}
                meal={dayPlan.meals.dinner}
                unitLabels={unitLabels}
                className="text-sm sm:text-base"
              />
            </div>
          )}
          
          <DailyTotals 
            totalNutrition={dayPlan.dailyTotals} 
            macroLabels={macroLabels}
          />
        </div>
      </CardContent>
    </Card>
  );
};
