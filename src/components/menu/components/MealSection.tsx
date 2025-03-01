
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MacroDistributionBar } from "./MacroDistributionBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Meal, MealFood } from "../types";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  meal: Meal;
}

export const MealSection = ({ 
  title, 
  icon, 
  meal,
}: MealSectionProps) => {
  // Ensure meal has all required properties with fallbacks
  const safeFood = {
    calories: meal?.calories || 0,
    description: meal?.description || "",
    foods: meal?.foods || [],
    macros: {
      protein: meal?.macros?.protein || a0,
      carbs: meal?.macros?.carbs || 0,
      fats: meal?.macros?.fats || 0,
      fiber: meal?.macros?.fiber || 0
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 mb-4">
        {icon}
        {title}
      </h3>

      <div className="mb-4">
        <p className="text-gray-600 italic">
          {safeFood.description?.replace(/carboidrato/gi, "carbo")}
        </p>
      </div>

      <div className="space-y-4">
        {safeFood.foods.map((food, index) => (
          <div key={index} className="text-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="font-medium">{food.portion} {food.unit}</span>
                  <span className="text-gray-600">de</span>
                  <span>{food.name.replace(/carboidrato/gi, "carbo")}</span>
                </div>
                {food.details && (
                  <span className="text-gray-500 text-sm block mt-1 ml-4">
                    {food.details.replace(/carboidrato/gi, "carbo")}
                  </span>
                )}
              </div>
            </div>
            {index < safeFood.foods.length - 1 && <div className="border-b my-3 border-gray-100" />}
          </div>
        ))}
      </div>

      <div className="mt-6 text-sm text-gray-600 border-t pt-4">
        <div className="mb-2 text-md font-medium">
          Total: {safeFood.calories} kcal
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          <div className="font-medium">Proteínas: {safeFood.macros.protein}g</div>
          <div className="font-medium">Carbos: {safeFood.macros.carbs}g</div>
          <div className="font-medium">Gorduras: {safeFood.macros.fats}g</div>
          <div className="font-medium">Fibras: {safeFood.macros.fiber}g</div>
        </div>
        <div className="mt-3">
          <MacroDistributionBar 
            macros={{
              protein: safeFood.macros.protein,
              carbs: safeFood.macros.carbs,
              fats: safeFood.macros.fats
            }}
          />
        </div>
      </div>
    </div>
  );
};
