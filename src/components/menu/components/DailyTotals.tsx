
import { MacroDistributionBar } from "./MacroDistributionBar";

interface DailyTotalsProps {
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

export const DailyTotals = ({ totalNutrition }: DailyTotalsProps) => {
  return (
    <div className="py-6 border-t mt-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg text-green-700">Totais Diários</h3>
          <div className="grid grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
            <div>Proteínas: {totalNutrition.protein}g</div>
            <div>Carboidratos: {totalNutrition.carbs}g</div>
            <div>Gorduras: {totalNutrition.fats}g</div>
            <div>Fibras: {totalNutrition.fiber}g</div>
          </div>
          <div className="mt-4">
            <MacroDistributionBar
              macros={{
                protein: totalNutrition.protein,
                carbs: totalNutrition.carbs,
                fats: totalNutrition.fats
              }}
            />
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {totalNutrition.calories}
          </div>
          <div className="text-sm text-gray-600">kcal totais</div>
        </div>
      </div>
    </div>
  );
};
