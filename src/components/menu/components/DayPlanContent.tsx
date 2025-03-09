
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
    <Card>
      <CardContent className="p-4 sm:p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center">
          <Sun className="w-5 h-5 mr-2 text-blue-600" />
          {translateDayName(dayPlan.dayName) || dayLabel || "Dia da Semana"}
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
          {dayPlan.meals?.breakfast && (
            <MealSection
              title={mealTypeLabels["breakfast"] || "Café da Manhã"}
              icon={<Coffee className="h-5 w-5 text-amber-500" />}
              meal={dayPlan.meals.breakfast}
              unitLabels={unitLabels}
            />
          )}
          
          {dayPlan.meals?.morningSnack && (
            <MealSection
              title={mealTypeLabels["morningSnack"] || "Lanche da Manhã"}
              icon={<Apple className="h-5 w-5 text-red-500" />}
              meal={dayPlan.meals.morningSnack}
              unitLabels={unitLabels}
            />
          )}
          
          {dayPlan.meals?.lunch && (
            <MealSection
              title={mealTypeLabels["lunch"] || "Almoço"}
              icon={<Utensils className="h-5 w-5 text-green-600" />}
              meal={dayPlan.meals.lunch}
              unitLabels={unitLabels}
            />
          )}
          
          {dayPlan.meals?.afternoonSnack && (
            <MealSection
              title={mealTypeLabels["afternoonSnack"] || "Lanche da Tarde"}
              icon={<Apple className="h-5 w-5 text-orange-500" />}
              meal={dayPlan.meals.afternoonSnack}
              unitLabels={unitLabels}
            />
          )}
          
          {dayPlan.meals?.dinner && (
            <MealSection
              title={mealTypeLabels["dinner"] || "Jantar"}
              icon={<Moon className="h-5 w-5 text-indigo-500" />}
              meal={dayPlan.meals.dinner}
              unitLabels={unitLabels}
            />
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
