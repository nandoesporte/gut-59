
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
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-green-700 mb-4">
        {icon}
        {title} ({meal.calories} kcal)
      </h2>

      <div className="mb-4">
        <p className="text-gray-600 italic">{meal.description}</p>
      </div>

      <div className="space-y-4">
        {meal.foods.map((food, index) => (
          <div key={index} className="text-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="font-medium">{food.portion} {food.unit}</span>
                  <span className="text-gray-600">de</span>
                  <span>{food.name}</span>
                </div>
                {food.details && (
                  <span className="text-gray-500 text-sm block mt-1 ml-4">
                    {food.details}
                  </span>
                )}
              </div>
            </div>
            {index < meal.foods.length - 1 && <div className="border-b my-3 border-gray-100" />}
          </div>
        ))}
      </div>

      <div className="mt-6 text-sm text-gray-600 border-t pt-4">
        <div className="grid grid-cols-4 gap-2 mt-2">
          <div className="font-medium">Proteínas: {meal.macros.protein}g</div>
          <div className="font-medium">Carboidratos: {meal.macros.carbs}g</div>
          <div className="font-medium">Gorduras: {meal.macros.fats}g</div>
          <div className="font-medium">Fibras: {meal.macros.fiber}g</div>
        </div>
        <div className="mt-3">
          <MacroDistributionBar 
            macros={{
              protein: meal.macros.protein,
              carbs: meal.macros.carbs,
              fats: meal.macros.fats
            }}
          />
        </div>
      </div>
    </div>
  );
};
