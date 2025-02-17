
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

  // Função auxiliar para converter ProtocolFood[] para o formato esperado
  const formatFoods = (foods: any[]) => {
    return foods.map(food => ({
      name: food.name,
      portion: `${food.portion_size || ''} ${food.portion_unit || 'g'}`,
      calories: food.calories,
      description: food.description
    }));
  };

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
          foods={formatFoods(dailyPlan.breakfast.foods)}
          macros={dailyPlan.breakfast.macros}
          calories={dailyPlan.breakfast.calories}
        />

        <MealSection
          title="Lanche da Manhã"
          icon={<Apple className="w-5 h-5" />}
          foods={formatFoods(dailyPlan.morningSnack.foods)}
          macros={dailyPlan.morningSnack.macros}
          calories={dailyPlan.morningSnack.calories}
        />

        <MealSection
          title="Almoço"
          icon={<UtensilsCrossed className="w-5 h-5" />}
          foods={formatFoods(dailyPlan.lunch.foods)}
          macros={dailyPlan.lunch.macros}
          calories={dailyPlan.lunch.calories}
        />

        <MealSection
          title="Lanche da Tarde"
          icon={<Cookie className="w-5 h-5" />}
          foods={formatFoods(dailyPlan.afternoonSnack.foods)}
          macros={dailyPlan.afternoonSnack.macros}
          calories={dailyPlan.afternoonSnack.calories}
        />

        <MealSection
          title="Jantar"
          icon={<Moon className="w-5 h-5" />}
          foods={formatFoods(dailyPlan.dinner.foods)}
          macros={dailyPlan.dinner.macros}
          calories={dailyPlan.dinner.calories}
        />

        <DailyTotals totalNutrition={totalNutrition} />
        
        <Recommendations recommendations={recommendations} />
      </div>
    </div>
  );
};
