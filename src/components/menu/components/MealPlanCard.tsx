
import { Card } from "@/components/ui/card";
import { DayPlan } from "../types";

interface MealPlanCardProps {
  dayPlan: DayPlan;
}

export const MealPlanCard = ({ dayPlan }: MealPlanCardProps) => {
  if (!dayPlan || !dayPlan.meals) {
    return (
      <Card className="p-4">
        <p className="text-gray-500">Dados do plano alimentar indisponíveis</p>
      </Card>
    );
  }

  const { meals, dailyTotals } = dayPlan;

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-bold">{dayPlan.dayName}</h3>
      
      <div className="space-y-2">
        <div className="grid grid-cols-3 text-sm">
          <span className="font-medium">Refeição</span>
          <span className="font-medium">Alimentos</span>
          <span className="font-medium text-right">Calorias</span>
        </div>
        
        {meals.cafeDaManha && (
          <div className="grid grid-cols-3 text-sm py-1 border-t">
            <span>Café da Manhã</span>
            <span>{meals.cafeDaManha.foods.map(f => f.name).join(', ')}</span>
            <span className="text-right">{meals.cafeDaManha.calories} kcal</span>
          </div>
        )}
        
        {meals.lancheDaManha && (
          <div className="grid grid-cols-3 text-sm py-1 border-t">
            <span>Lanche da Manhã</span>
            <span>{meals.lancheDaManha.foods.map(f => f.name).join(', ')}</span>
            <span className="text-right">{meals.lancheDaManha.calories} kcal</span>
          </div>
        )}
        
        {meals.almoco && (
          <div className="grid grid-cols-3 text-sm py-1 border-t">
            <span>Almoço</span>
            <span>{meals.almoco.foods.map(f => f.name).join(', ')}</span>
            <span className="text-right">{meals.almoco.calories} kcal</span>
          </div>
        )}
        
        {meals.lancheDaTarde && (
          <div className="grid grid-cols-3 text-sm py-1 border-t">
            <span>Lanche da Tarde</span>
            <span>{meals.lancheDaTarde.foods.map(f => f.name).join(', ')}</span>
            <span className="text-right">{meals.lancheDaTarde.calories} kcal</span>
          </div>
        )}
        
        {meals.jantar && (
          <div className="grid grid-cols-3 text-sm py-1 border-t">
            <span>Jantar</span>
            <span>{meals.jantar.foods.map(f => f.name).join(', ')}</span>
            <span className="text-right">{meals.jantar.calories} kcal</span>
          </div>
        )}
      </div>
      
      <div className="pt-2 border-t">
        <div className="grid grid-cols-5 gap-2 text-sm text-center">
          <div>
            <p className="text-xs text-gray-500">Calorias</p>
            <p className="font-semibold">{dailyTotals.calories}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Proteínas</p>
            <p className="font-semibold">{dailyTotals.protein}g</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Carboidratos</p>
            <p className="font-semibold">{dailyTotals.carbs}g</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Gorduras</p>
            <p className="font-semibold">{dailyTotals.fats}g</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fibras</p>
            <p className="font-semibold">{dailyTotals.fiber}g</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
