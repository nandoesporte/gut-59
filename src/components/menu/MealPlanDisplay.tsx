
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MealSection } from "./components/MealSection";
import { DailyTotals } from "./components/DailyTotals";
import { Recommendations } from "./components/Recommendations";
import { Coffee, Apple, UtensilsCrossed, Cookie, Moon } from "lucide-react";
import type { MealPlan } from "./types";

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
}

export const MealPlanDisplay = ({ mealPlan }: MealPlanDisplayProps) => {
  const { dailyPlan, recommendations, totalNutrition } = mealPlan;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Seu Plano Alimentar Personalizado
        </h2>
        <Button variant="outline">Baixar PDF</Button>
      </div>

      <div className="space-y-6">
        <MealSection
          title="Café da Manhã"
          icon={<Coffee className="w-5 h-5" />}
          meal={dailyPlan.breakfast}
        />

        <MealSection
          title="Lanche da Manhã"
          icon={<Apple className="w-5 h-5" />}
          meal={dailyPlan.morningSnack}
        />

        <MealSection
          title="Almoço"
          icon={<UtensilsCrossed className="w-5 h-5" />}
          meal={dailyPlan.lunch}
        />

        <MealSection
          title="Lanche da Tarde"
          icon={<Cookie className="w-5 h-5" />}
          meal={dailyPlan.afternoonSnack}
        />

        <MealSection
          title="Jantar"
          icon={<Moon className="w-5 h-5" />}
          meal={dailyPlan.dinner}
        />

        <DailyTotals totalNutrition={totalNutrition} />
        
        <Recommendations recommendations={recommendations} />
      </div>
    </div>
  );
};
