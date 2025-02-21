
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDown, RefreshCcw } from "lucide-react";
import { generateMealPlanPDF } from "./utils/pdf-generator";
import { DailyTotals } from "./components/DailyTotals";
import { MealSection } from "./components/MealSection";
import { Recommendations } from "./components/Recommendations";
import type { MealPlan } from "./types";
import { useRef } from "react";

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onRefresh: () => Promise<void>;
}

export const MealPlanDisplay = ({ mealPlan, onRefresh }: MealPlanDisplayProps) => {
  const planRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!planRef.current) return;
    await generateMealPlanPDF(planRef.current);
  };

  if (!mealPlan) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Nenhum plano alimentar disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Seu Plano Alimentar
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Gerar Novo
          </Button>
        </div>
      </div>

      <div ref={planRef} className="space-y-6 bg-white p-8 rounded-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Plano Alimentar</h1>
          <p className="text-gray-600">Recomendações Diárias</p>
        </div>

        {mealPlan.dailyPlan && (
          <div className="space-y-6">
            {mealPlan.dailyPlan.breakfast && (
              <MealSection
                title="Café da Manhã"
                icon={<div className="w-5 h-5 text-primary">☀️</div>}
                meal={mealPlan.dailyPlan.breakfast}
              />
            )}

            {mealPlan.dailyPlan.morningSnack && (
              <MealSection
                title="Lanche da Manhã"
                icon={<div className="w-5 h-5 text-primary">🥪</div>}
                meal={mealPlan.dailyPlan.morningSnack}
              />
            )}

            {mealPlan.dailyPlan.lunch && (
              <MealSection
                title="Almoço"
                icon={<div className="w-5 h-5 text-primary">🍽️</div>}
                meal={mealPlan.dailyPlan.lunch}
              />
            )}

            {mealPlan.dailyPlan.afternoonSnack && (
              <MealSection
                title="Lanche da Tarde"
                icon={<div className="w-5 h-5 text-primary">🍎</div>}
                meal={mealPlan.dailyPlan.afternoonSnack}
              />
            )}

            {mealPlan.dailyPlan.dinner && (
              <MealSection
                title="Jantar"
                icon={<div className="w-5 h-5 text-primary">🌙</div>}
                meal={mealPlan.dailyPlan.dinner}
              />
            )}

            {mealPlan.totalNutrition && (
              <DailyTotals totalNutrition={mealPlan.totalNutrition} />
            )}

            {mealPlan.recommendations && (
              <Recommendations recommendations={mealPlan.recommendations} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
