
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MealSection } from "./components/MealSection";
import { DailyTotals } from "./components/DailyTotals";
import { Recommendations } from "./components/Recommendations";
import { Coffee, Apple, UtensilsCrossed, Cookie, Moon } from "lucide-react";
import type { MealPlan } from "./types";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { useState, useRef } from "react";
import { weekDayNames } from "./types/meal-plan-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onRefresh: () => Promise<void>;
}

export const MealPlanDisplay = ({ mealPlan, onRefresh }: MealPlanDisplayProps) => {
  const [activeDay, setActiveDay] = useState<string>("monday");
  const planRef = useRef<HTMLDivElement>(null);

  if (!mealPlan) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Nenhum plano alimentar disponível</p>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    if (!planRef.current) return;
    try {
      await generateMealPlanPDF(planRef.current);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Seu Plano Alimentar Semanal
        </h2>
        <Button variant="outline" onClick={handleDownloadPDF}>
          Baixar PDF
        </Button>
      </div>

      <Tabs defaultValue="monday" value={activeDay} onValueChange={setActiveDay}>
        <TabsList className="grid grid-cols-7 mb-4">
          {Object.entries(weekDayNames).map(([day, label]) => (
            <TabsTrigger key={day} value={day} className="text-sm">
              {label.split('-')[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(weekDayNames).map(([day, label]) => (
          <TabsContent key={day} value={day}>
            <div ref={planRef} className="space-y-6">
              <h3 className="text-xl font-semibold text-green-700 mb-4">{label}</h3>
              
              {mealPlan[day]?.dailyPlan?.breakfast && (
                <MealSection
                  title="Café da Manhã"
                  icon={<Coffee className="w-5 h-5" />}
                  meal={mealPlan[day].dailyPlan.breakfast}
                />
              )}

              {mealPlan[day]?.dailyPlan?.morningSnack && (
                <MealSection
                  title="Lanche da Manhã"
                  icon={<Apple className="w-5 h-5" />}
                  meal={mealPlan[day].dailyPlan.morningSnack}
                />
              )}

              {mealPlan[day]?.dailyPlan?.lunch && (
                <MealSection
                  title="Almoço"
                  icon={<UtensilsCrossed className="w-5 h-5" />}
                  meal={mealPlan[day].dailyPlan.lunch}
                />
              )}

              {mealPlan[day]?.dailyPlan?.afternoonSnack && (
                <MealSection
                  title="Lanche da Tarde"
                  icon={<Cookie className="w-5 h-5" />}
                  meal={mealPlan[day].dailyPlan.afternoonSnack}
                />
              )}

              {mealPlan[day]?.dailyPlan?.dinner && (
                <MealSection
                  title="Jantar"
                  icon={<Moon className="w-5 h-5" />}
                  meal={mealPlan[day].dailyPlan.dinner}
                />
              )}

              {mealPlan[day]?.totalNutrition && (
                <DailyTotals totalNutrition={mealPlan[day].totalNutrition} />
              )}
            </div>
          </TabsContent>
        ))}

        {mealPlan.recommendations && (
          <div className="mt-8">
            <Recommendations recommendations={mealPlan.recommendations} />
          </div>
        )}
      </Tabs>
    </div>
  );
};
