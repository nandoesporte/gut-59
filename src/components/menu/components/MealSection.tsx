
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Meal, MealFood } from "../types";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  meal: Meal;  // Changed from foods to meal
  selectedFoods?: string[];  // Make this optional
  onFoodSelection?: (foodId: string) => void;  // Make this optional
  disabled?: boolean;
}

export const MealSection = ({
  title,
  icon,
  meal,
  selectedFoods = [],
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
    <div className="space-y-2">
      <p className="text-sm text-gray-600">{meal.description}</p>
      {meal.foods.map((food, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className="text-gray-700">{food.name}</span>
          <span className="text-gray-500 text-sm">
            {food.portion} {food.unit}
          </span>
        </div>
      ))}
      <div className="text-sm text-gray-600 mt-2">
        <strong>Calorias:</strong> {meal.calories.toFixed(0)} kcal
        <br />
        <strong>Macros:</strong> P: {meal.macros.protein.toFixed(0)}g | 
        C: {meal.macros.carbs.toFixed(0)}g | 
        G: {meal.macros.fats.toFixed(0)}g
      </div>
    </div>
  </Card>
);
