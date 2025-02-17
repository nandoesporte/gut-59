
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MealSection } from "./components/MealSection";
import { DailyTotals } from "./components/DailyTotals";
import { Recommendations } from "./components/Recommendations";
import { Coffee, Apple, UtensilsCrossed, Cookie, Moon } from "lucide-react";
import { MealPlan } from "./types";

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
          foods={dailyPlan.breakfast.foods}
          description={dailyPlan.breakfast.description}
          macros={dailyPlan.breakfast.macros}
          calories={dailyPlan.breakfast.calories}
        />

        <MealSection
          title="Lanche da Manhã"
          icon={<Apple className="w-5 h-5" />}
          foods={dailyPlan.morningSnack.foods}
          description={dailyPlan.morningSnack.description}
          macros={dailyPlan.morningSnack.macros}
          calories={dailyPlan.morningSnack.calories}
        />

        <MealSection
          title="Almoço"
          icon={<UtensilsCrossed className="w-5 h-5" />}
          foods={dailyPlan.lunch.foods}
          description={dailyPlan.lunch.description}
          macros={dailyPlan.lunch.macros}
          calories={dailyPlan.lunch.calories}
        />

        <MealSection
          title="Lanche da Tarde"
          icon={<Cookie className="w-5 h-5" />}
          foods={dailyPlan.afternoonSnack.foods}
          description={dailyPlan.afternoonSnack.description}
          macros={dailyPlan.afternoonSnack.macros}
          calories={dailyPlan.afternoonSnack.calories}
        />

        <MealSection
          title="Jantar"
          icon={<Moon className="w-5 h-5" />}
          foods={dailyPlan.dinner.foods}
          description={dailyPlan.dinner.description}
          macros={dailyPlan.dinner.macros}
          calories={dailyPlan.dinner.calories}
        />

        <DailyTotals totalNutrition={totalNutrition} />
        
        <Recommendations recommendations={recommendations} />
      </div>
    </div>
  );
};
