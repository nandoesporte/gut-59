
import { Button } from "@/components/ui/button";
import { Coffee, Utensils, Apple, Moon, Dumbbell, Plus } from "lucide-react";
import { MealPlan, ProtocolFood } from "./types";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  foods: ProtocolFood[];
}

const MealSection = ({ title, icon, foods }: MealSectionProps) => (
  <div className="bg-white rounded-lg shadow-sm p-6">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      {icon}
      {title}
    </h2>
    <div className="mt-4 grid grid-cols-3 gap-3">
      {Array.isArray(foods) && foods.map((food) => (
        <Button
          key={food.id}
          variant="outline"
          className="flex items-center justify-center p-2 h-auto text-sm"
        >
          {food.name} ({food.portion}{food.portionUnit})
        </Button>
      ))}
    </div>
  </div>
);

interface MealPlanDisplayProps {
  mealPlan: MealPlan;
  onReset: () => void;
}

export const MealPlanDisplay = ({ mealPlan, onReset }: MealPlanDisplayProps) => {
  const renderMealSection = (meal: any, title: string, icon: React.ReactNode) => {
    if (!meal?.foods) return null;
    return (
      <MealSection
        title={title}
        icon={icon}
        foods={meal.foods}
      />
    );
  };

  if (!mealPlan?.dailyPlan) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600">Erro ao carregar o cardápio. Por favor, tente novamente.</p>
        <Button 
          onClick={onReset}
          className="mt-4 bg-green-500 hover:bg-green-600 text-white"
        >
          COMEÇAR NOVA DIETA
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderMealSection(mealPlan.dailyPlan.breakfast, "Café da manhã", <Coffee className="h-5 w-5" />)}
      {renderMealSection(mealPlan.dailyPlan.morningSnack, "Lanche da Manhã", <Apple className="h-5 w-5" />)}
      {renderMealSection(mealPlan.dailyPlan.lunch, "Almoço", <Utensils className="h-5 w-5" />)}
      {renderMealSection(mealPlan.dailyPlan.afternoonSnack, "Lanche da Tarde", <Apple className="h-5 w-5" />)}
      {renderMealSection(mealPlan.dailyPlan.dinner, "Jantar", <Moon className="h-5 w-5" />)}

      {mealPlan.recommendations && (
        <>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Treinos e Atividades
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-medium mb-2">Pré-treino:</h4>
                <p className="text-gray-600">{mealPlan.recommendations.preworkout}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Pós-treino:</h4>
                <p className="text-gray-600">{mealPlan.recommendations.postworkout}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionais na Dieta
            </h2>
            <div className="mt-4">
              <p className="text-gray-600">{mealPlan.recommendations.general}</p>
              {Array.isArray(mealPlan.recommendations.timing) && (
                <div className="mt-4 space-y-2">
                  {mealPlan.recommendations.timing.map((tip, index) => (
                    <p key={index} className="text-gray-600">• {tip}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-2">
            <p className="text-sm text-gray-600">
              {mealPlan.totalNutrition?.calories ?? 0} kcal totais
            </p>
          </div>
          <Button 
            onClick={onReset}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            COMEÇAR NOVA DIETA
          </Button>
        </div>
      </div>
    </div>
  );
};
