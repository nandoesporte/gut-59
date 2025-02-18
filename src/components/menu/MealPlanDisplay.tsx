
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MealSection } from "./components/MealSection";
import { DailyTotals } from "./components/DailyTotals";
import { Recommendations } from "./components/Recommendations";
import { Coffee, Apple, UtensilsCrossed, Cookie, Moon } from "lucide-react";
import { MealPlan, ProtocolFood } from "./types";

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
}

export const MealPlanDisplay = ({ mealPlan }: MealPlanDisplayProps) => {
  const { dailyPlan, recommendations, totalNutrition } = mealPlan;

  // Função auxiliar para converter para ProtocolFood com todos os campos necessários
  const formatFood = (food: any): ProtocolFood => ({
    id: food.id || `temp-${Math.random()}`,
    name: food.name,
    calories: food.calories,
    protein: food.protein || 0,
    carbs: food.carbs || 0,
    fats: food.fats || 0,
    food_group_id: food.food_group_id || 0,
    portion: food.portion_size || food.portion || 0,
    portionUnit: food.portion_unit || 'g',
    description: food.preparation_method || food.description || '',
  });

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
          foods={dailyPlan.breakfast.foods.map(formatFood)}
          macros={dailyPlan.breakfast.macros}
          calories={dailyPlan.breakfast.calories}
        />

        <MealSection
          title="Lanche da Manhã"
          icon={<Apple className="w-5 h-5" />}
          foods={dailyPlan.morningSnack.foods.map(formatFood)}
          macros={dailyPlan.morningSnack.macros}
          calories={dailyPlan.morningSnack.calories}
        />

        <MealSection
          title="Almoço"
          icon={<UtensilsCrossed className="w-5 h-5" />}
          foods={dailyPlan.lunch.foods.map(formatFood)}
          macros={dailyPlan.lunch.macros}
          calories={dailyPlan.lunch.calories}
        />

        <MealSection
          title="Lanche da Tarde"
          icon={<Cookie className="w-5 h-5" />}
          foods={dailyPlan.afternoonSnack.foods.map(formatFood)}
          macros={dailyPlan.afternoonSnack.macros}
          calories={dailyPlan.afternoonSnack.calories}
        />

        <MealSection
          title="Jantar"
          icon={<Moon className="w-5 h-5" />}
          foods={dailyPlan.dinner.foods.map(formatFood)}
          macros={dailyPlan.dinner.macros}
          calories={dailyPlan.dinner.calories}
        />

        <DailyTotals totalNutrition={totalNutrition} />
        
        <Recommendations recommendations={recommendations} />
      </div>
    </div>
  );
};
