
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

  // Função auxiliar para formatar a porção baseada no tipo de alimento
  const formatPortion = (food: any): string => {
    const size = food.portion_size || '';
    const unit = food.portion_unit?.toLowerCase() || '';
    
    // Mapeamento de unidades de medida
    if (unit.includes('fatia')) {
      return `${size} fatia${size > 1 ? 's' : ''}`;
    }
    if (unit.includes('colher')) {
      return `${size} colher${size > 1 ? 'es' : ''} de sopa`;
    }
    if (unit.includes('xicara')) {
      return size === 0.5 ? '1/2 xícara' : `${size} xícara${size > 1 ? 's' : ''}`;
    }
    if (unit.includes('unidade')) {
      return `${size} unidade${size > 1 ? 's' : ''}`;
    }
    if (unit.includes('meio')) {
      return 'meio';
    }
    
    // Adiciona descrição de tamanho quando disponível
    const sizeDesc = food.size_description ? ` ${food.size_description}` : '';
    
    // Se não houver um mapeamento específico, retorna a medida padrão
    return `${size} ${unit}${sizeDesc}`;
  };

  // Função auxiliar para converter ProtocolFood[] para o formato esperado
  const formatFoods = (foods: any[]) => {
    return foods.map(food => ({
      name: food.name,
      portion: formatPortion(food),
      calories: food.calories,
      description: food.preparation_method || food.description // Inclui método de preparo quando disponível
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
