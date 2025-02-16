
import { Button } from "@/components/ui/button";
import { ProtocolFood } from "../types";
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

const checkMealRequirements = (foods: ProtocolFood[], mealType: string) => {
  const categories = foods.reduce((acc, food) => {
    if (food.nutritional_category) {
      food.nutritional_category.forEach(cat => acc.add(cat));
    }
    return acc;
  }, new Set<string>());

  const requirements = {
    'Café da Manhã': {
      min: 3,
      required: ['carb', 'protein'],
      optional: ['fat', 'fruit'],
      message: 'Deve incluir carboidrato complexo, proteína e gordura boa ou fruta'
    },
    'Lanche': {
      min: 2,
      required: ['protein', 'carb'],
      optional: ['fruit'],
      message: 'Deve incluir proteína e carboidrato ou fruta'
    },
    'Almoço': {
      min: 4,
      required: ['carb', 'protein', 'vegetable', 'fat'],
      optional: [],
      message: 'Deve incluir carboidrato complexo, proteína, vegetais e gordura boa'
    },
    'Jantar': {
      min: 4,
      required: ['carb', 'protein', 'vegetable', 'fat'],
      optional: [],
      message: 'Deve incluir carboidrato complexo, proteína, vegetais e gordura boa'
    }
  };

  const mealReqs = requirements[mealType];
  if (!mealReqs) return { meets: true, message: '' };

  const hasMinItems = foods.length >= mealReqs.min;
  const hasRequiredCategories = mealReqs.required.every(cat => categories.has(cat));

  return {
    meets: hasMinItems && hasRequiredCategories,
    message: !hasMinItems || !hasRequiredCategories ? mealReqs.message : ''
  };
};

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
  const requirements = checkMealRequirements(foods, title);

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

      {!requirements.meets && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {requirements.message}
          </AlertDescription>
        </Alert>
      )}

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
