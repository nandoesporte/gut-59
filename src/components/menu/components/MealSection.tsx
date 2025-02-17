
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MacroDistributionBar } from "./MacroDistributionBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  foods: Array<{
    name: string;
    portion: string;
  }>;
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
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-green-700">
        {icon}
        {title} {calories && `(${calories} kcal)`}
      </h2>

      <div className="mt-4 space-y-3">
        {foods.map((food, index) => (
          <div key={index} className="flex justify-between items-start text-gray-700">
            <div className="flex-1">
              <span className="block">{food.name}</span>
            </div>
            <div className="text-right whitespace-nowrap text-gray-500 text-sm">
              {food.portion}
            </div>
          </div>
        ))}
      </div>

      {macros && (
        <div className="mt-4 text-sm text-gray-600 border-t pt-4">
          <div className="grid grid-cols-4 gap-2 mt-2">
            <div>P: {macros.protein}g</div>
            <div>C: {macros.carbs}g</div>
            <div>G: {macros.fats}g</div>
            <div>F: {macros.fiber}g</div>
          </div>
          <div className="mt-2">
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
