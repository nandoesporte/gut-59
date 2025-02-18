
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MacroDistributionBar } from "./MacroDistributionBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ProtocolFood } from "../types";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  foods: ProtocolFood[];
  macros?: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  calories?: number;
}

export const MealSection = ({ 
  title, 
  icon, 
  foods, 
  macros, 
  calories,
}: MealSectionProps) => {
  const formatPortion = (food: ProtocolFood): string => {
    if (!food.portion) return '';
    return `${food.portion}${food.portionUnit || 'g'}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-green-700 mb-4">
        {icon}
        {title} {calories && `(${calories} kcal)`}
      </h2>

      <div className="space-y-4">
        {foods.map((food, index) => (
          <div key={index} className="text-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="font-medium">{formatPortion(food)}</span>
                  <span className="text-gray-600">de</span>
                  <span>{food.name}</span>
                </div>
                {food.description && (
                  <span className="text-gray-500 text-sm block mt-1 ml-4">
                    {food.description}
                  </span>
                )}
              </div>
              <div className="text-right whitespace-nowrap text-gray-500 text-sm font-medium">
                {food.calories} kcal
              </div>
            </div>
            {index < foods.length - 1 && <div className="border-b my-3 border-gray-100" />}
          </div>
        ))}
      </div>

      {macros && (
        <div className="mt-6 text-sm text-gray-600 border-t pt-4">
          <div className="grid grid-cols-4 gap-2 mt-2">
            <div className="font-medium">Proteínas: {macros.protein}g</div>
            <div className="font-medium">Carboidratos: {macros.carbs}g</div>
            <div className="font-medium">Gorduras: {macros.fats}g</div>
            <div className="font-medium">Fibras: {macros.fiber}g</div>
          </div>
          <div className="mt-3">
            <MacroDistributionBar 
              macros={{
                protein: macros.protein,
                carbs: macros.carbs,
                fats: macros.fats
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
