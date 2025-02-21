
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MealSection } from "./components/MealSection";
import { DailyTotals } from "./components/DailyTotals";
import { Recommendations } from "./components/Recommendations";
import { Coffee, Apple, UtensilsCrossed, Cookie, Moon } from "lucide-react";
import type { MealPlan } from "./types";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { useRef } from "react";

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onRefresh: () => Promise<void>;
}

export const MealPlanDisplay = ({ mealPlan, onRefresh }: MealPlanDisplayProps) => {
  const planRef = useRef<HTMLDivElement>(null);

  if (!mealPlan || !mealPlan.dailyPlan) {
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

  const { dailyPlan, recommendations, totalNutrition } = mealPlan;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Seu Plano Alimentar Personalizado
        </h2>
        <Button variant="outline" onClick={handleDownloadPDF}>
          Baixar PDF
        </Button>
      </div>

      <div ref={planRef} className="space-y-6">
        {dailyPlan.breakfast && (
          <MealSection
            title="Café da Manhã"
            icon={<Coffee className="w-5 h-5" />}
            meal={dailyPlan.breakfast}
          />
        )}

        {dailyPlan.morningSnack && (
          <MealSection
            title="Lanche da Manhã"
            icon={<Apple className="w-5 h-5" />}
            meal={dailyPlan.morningSnack}
          />
        )}

        {dailyPlan.lunch && (
          <MealSection
            title="Almoço"
            icon={<UtensilsCrossed className="w-5 h-5" />}
            meal={dailyPlan.lunch}
          />
        )}

        {dailyPlan.afternoonSnack && (
          <MealSection
            title="Lanche da Tarde"
            icon={<Cookie className="w-5 h-5" />}
            meal={dailyPlan.afternoonSnack}
          />
        )}

        {dailyPlan.dinner && (
          <MealSection
            title="Jantar"
            icon={<Moon className="w-5 h-5" />}
            meal={dailyPlan.dinner}
          />
        )}

        {totalNutrition && <DailyTotals totalNutrition={totalNutrition} />}
        
        {recommendations && <Recommendations recommendations={recommendations} />}
      </div>
    </div>
  );
};
