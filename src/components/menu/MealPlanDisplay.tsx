
import { Coffee, Utensils, Apple, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MealSection } from "./MealSection";
import { TrainingSection } from "./TrainingSection";
import { AdditionalSection } from "./AdditionalSection";

interface ProtocolFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_group_id: number;
}

interface MealPlan {
  dailyPlan: {
    [key: string]: {
      foods: ProtocolFood[];
      calories: number;
      macros: {
        protein: number;
        carbs: number;
        fats: number;
      };
    };
  };
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  recommendations: {
    preworkout: string;
    postworkout: string;
    general: string;
  };
}

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
}

export const MealPlanDisplay = ({ mealPlan }: MealPlanDisplayProps) => {
  return (
    <div className="space-y-6">
      <MealSection
        title="Café da manhã"
        Icon={Coffee}
        foods={mealPlan.dailyPlan.breakfast.foods}
      />

      <MealSection
        title="Almoço"
        Icon={Utensils}
        foods={mealPlan.dailyPlan.lunch.foods}
      />

      <MealSection
        title="Lanche da Manhã e Tarde"
        Icon={Apple}
        foods={mealPlan.dailyPlan.snacks.foods}
      />

      <MealSection
        title="Jantar"
        Icon={Moon}
        foods={mealPlan.dailyPlan.dinner.foods}
      />

      <TrainingSection
        preworkout={mealPlan.recommendations.preworkout}
        postworkout={mealPlan.recommendations.postworkout}
      />

      <AdditionalSection recommendations={mealPlan.recommendations.general} />

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-2">
            <p className="text-sm text-gray-600">
              {mealPlan.totalNutrition.calories} kcal totais
            </p>
          </div>
          <Button className="w-full bg-green-500 hover:bg-green-600">
            MONTAR MINHA DIETA
          </Button>
        </div>
      </div>
    </div>
  );
};
