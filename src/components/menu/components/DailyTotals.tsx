
import { MacroDistributionBar } from "./MacroDistributionBar";
import { DailyNutrition } from "../types";

interface DailyTotalsProps {
  totalNutrition?: DailyNutrition;
  dailyTotals?: DailyNutrition;
}

export const DailyTotals = ({ totalNutrition, dailyTotals }: DailyTotalsProps) => {
  // Use either the provided totalNutrition or dailyTotals
  const nutrition = totalNutrition || dailyTotals || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0
  };

  return (
    <div className="py-6 border-t mt-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg text-green-700">Totais Diários</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
            <div>Proteínas: {nutrition.protein}g</div>
            <div>Carboidratos: {nutrition.carbs}g</div>
            <div>Gorduras: {nutrition.fats}g</div>
            <div>Fibras: {nutrition.fiber}g</div>
          </div>
          <div className="mt-4">
            <MacroDistributionBar
              macros={{
                protein: nutrition.protein,
                carbs: nutrition.carbs,
                fats: nutrition.fats
              }}
            />
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {nutrition.calories}
          </div>
          <div className="text-sm text-gray-600">kcal totais</div>
        </div>
      </div>
    </div>
  );
};
