
import { Button } from "@/components/ui/button";
import { ProtocolFood } from "../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MacroDistributionBar } from "./MacroDistributionBar";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  foods: ProtocolFood[];
  description?: string;
  macros?: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  calories?: number;
  foodSubstitutions?: {
    originalFoodId: string;
    alternatives: ProtocolFood[];
  }[];
  onFoodSubstitute?: (originalFoodId: string, newFoodId: string) => void;
}

export const MealSection = ({ 
  title, 
  icon, 
  foods, 
  description, 
  macros, 
  calories,
  foodSubstitutions,
  onFoodSubstitute 
}: MealSectionProps) => {
  const formatDescription = (description: string) => {
    return description.split('\n').map((line, index) => (
      <p key={index} className="text-sm text-gray-600 mb-1">
        {line}
      </p>
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-green-700">
        {icon}
        {title} {calories && `(${calories} kcal)`}
      </h2>
      <div className="mt-4 space-y-2">
        {Array.isArray(foods) && foods.map((food) => (
          <div key={food.id} className="flex justify-between items-center text-gray-700">
            <div className="flex items-center gap-2">
              <span>
                {food.portion} {food.portionUnit} de {food.name}
              </span>
              {foodSubstitutions?.find(sub => sub.originalFoodId === food.id) && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      Substituições
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Alternativas equivalentes:</h4>
                      {foodSubstitutions
                        .find(sub => sub.originalFoodId === food.id)
                        ?.alternatives.map((alt) => (
                          <div key={alt.id} className="flex justify-between items-center">
                            <span>{alt.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onFoodSubstitute?.(food.id, alt.id)}
                            >
                              Substituir
                            </Button>
                          </div>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <span className="text-gray-500">
              ({food.calculatedNutrients?.calories} kcal)
            </span>
          </div>
        ))}
      </div>
      {description && (
        <div className="mt-4 text-gray-600 border-t border-gray-100 pt-4">
          {formatDescription(description)}
        </div>
      )}
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
