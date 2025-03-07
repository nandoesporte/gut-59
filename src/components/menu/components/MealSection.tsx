
import { Card, CardContent } from "@/components/ui/card";
import { Meal } from "../types";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  meal: Meal;
}

export const MealSection = ({ title, icon, meal }: MealSectionProps) => {
  // Return null if the meal data is not provided or invalid
  if (!meal || !meal.foods || meal.foods.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        
        <p className="mb-3 text-gray-700">{meal.description}</p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Alimentos</h4>
              <ul className="space-y-2">
                {meal.foods.map((food, index) => (
                  <li key={index} className="border-b pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{food.name}</span>
                      <span>{food.portion} {food.unit}</span>
                    </div>
                    {food.details && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Modo de preparo:</span> {food.details}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Informação Nutricional</h4>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="mb-1">
                  <span className="font-medium">Calorias:</span> {meal.calories} kcal
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <p className="text-sm">
                    <span className="font-medium">Proteínas:</span> {meal.macros.protein}g
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Carboidratos:</span> {meal.macros.carbs}g
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Gorduras:</span> {meal.macros.fats}g
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Fibras:</span> {meal.macros.fiber}g
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
