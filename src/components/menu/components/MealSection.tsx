
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ProtocolFood } from "../types/food";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  foods: ProtocolFood[];
  selectedFoods: string[];
  onFoodSelection: (foodId: string) => void;
  disabled?: boolean;
}

export const MealSection = ({
  title,
  icon,
  foods,
  selectedFoods,
  onFoodSelection,
  disabled
}: MealSectionProps) => (
  <Card className="p-6 space-y-4 shadow-lg hover:shadow-xl transition-shadow">
    <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
      <div className="bg-green-50 p-2 rounded-lg">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {foods.map((food) => (
        <Button
          key={food.id}
          variant={selectedFoods.includes(food.id) ? "default" : "outline"}
          onClick={() => onFoodSelection(food.id)}
          disabled={disabled}
          className={`
            h-auto py-3 px-4 w-full text-left justify-start
            ${selectedFoods.includes(food.id)
              ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200 hover:text-green-800'
              : 'hover:bg-green-50 hover:border-green-200'}
          `}
        >
          <span className="truncate">{food.name}</span>
        </Button>
      ))}
    </div>
  </Card>
);
