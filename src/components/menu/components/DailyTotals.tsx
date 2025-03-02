
import { Card, CardContent } from "@/components/ui/card";

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
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-medium mb-4">Totais Diários</h3>
        <div className="flex justify-between items-center">
          <div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1.5"></span>
                <span>Proteínas: {totalNutrition.protein}g</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1.5"></span>
                <span>Carboidratos: {totalNutrition.carbs}g</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-1.5"></span>
                <span>Gorduras: {totalNutrition.fats}g</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-1.5"></span>
                <span>Fibras: {totalNutrition.fiber || 0}g</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {totalNutrition.calories}
            </div>
            <div className="text-sm text-gray-600">kcal totais</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
