
import { Card } from "@/components/ui/card";

interface DailyTotalsProps {
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  totalNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

export const DailyTotals = ({ dailyTotals, totalNutrition }: DailyTotalsProps) => {
  // Use totalNutrition if provided, otherwise use dailyTotals
  const nutritionData = totalNutrition || dailyTotals;
  
  const stats = [
    { name: "Calorias", value: nutritionData.calories || 0, unit: "kcal" },
    { name: "Proteínas", value: nutritionData.protein || 0, unit: "g" },
    { name: "Carboidratos", value: nutritionData.carbs || 0, unit: "g" },
    { name: "Gorduras", value: nutritionData.fats || 0, unit: "g" },
    { name: "Fibras", value: nutritionData.fiber || 0, unit: "g" },
  ];

  return (
    <Card className="p-4">
      <h3 className="text-lg font-medium mb-3">Totais Diários</h3>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.name} 
            className="bg-gray-50 rounded-lg p-3 text-center"
          >
            <p className="text-sm text-gray-500">{stat.name}</p>
            <p className="text-lg font-semibold">{stat.value} {stat.unit}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
