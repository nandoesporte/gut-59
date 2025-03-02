
import { Card, CardContent } from "@/components/ui/card";
import { DailyTotals } from "./DailyTotals";
import { MacroDistributionBar } from "./MacroDistributionBar";
import { MealSection } from "./MealSection";
import { DailyPlan } from "../types";

interface DayContentProps {
  dayData: DailyPlan;
  dayLabel: string;
}

export const DayContent = ({ dayData, dayLabel }: DayContentProps) => {
  if (!dayData) {
    console.error("No data found for selected day:", dayLabel);
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Erro ao carregar os dados para o dia selecionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                Refeições - {dayLabel}
              </h3>
              <div className="space-y-4">
                {dayData.meals.breakfast && (
                  <MealSection
                    title="Café da Manhã"
                    meal={dayData.meals.breakfast}
                    icon="☕"
                  />
                )}
                
                {dayData.meals.morningSnack && (
                  <MealSection
                    title="Lanche da Manhã"
                    meal={dayData.meals.morningSnack}
                    icon="🍎"
                  />
                )}
                
                {dayData.meals.lunch && (
                  <MealSection
                    title="Almoço"
                    meal={dayData.meals.lunch}
                    icon="🍽️"
                  />
                )}
                
                {dayData.meals.afternoonSnack && (
                  <MealSection
                    title="Lanche da Tarde"
                    meal={dayData.meals.afternoonSnack}
                    icon="🥪"
                  />
                )}
                
                {dayData.meals.dinner && (
                  <MealSection
                    title="Jantar"
                    meal={dayData.meals.dinner}
                    icon="🥗"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <div className="space-y-4">
            <DailyTotals
              totalNutrition={dayData.dailyTotals || {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                fiber: 0
              }}
            />
            
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-4">Distribuição de Macronutrientes</h3>
                <MacroDistributionBar
                  macros={{
                    protein: dayData.dailyTotals?.protein || 0,
                    carbs: dayData.dailyTotals?.carbs || 0,
                    fats: dayData.dailyTotals?.fats || 0
                  }}
                />
                <div className="flex text-xs text-gray-500 justify-between mt-2">
                  <div>Proteínas</div>
                  <div>Carboidratos</div>
                  <div>Gorduras</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
