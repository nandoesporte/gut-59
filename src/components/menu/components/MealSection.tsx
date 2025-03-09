
import React from "react";
import { Meal } from "../types";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  meal: Meal;
  unitLabels?: Record<string, string>;
}

export const MealSection = ({ title, icon, meal, unitLabels = {} }: MealSectionProps) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center mb-2">
        <div className="mr-2">{icon}</div>
        <h4 className="font-medium text-lg">{title}</h4>
        <div className="ml-auto text-sm font-medium text-gray-500">
          ~{meal.calories} kcal
        </div>
      </div>

      {meal.description && (
        <p className="text-sm text-gray-600 italic mb-2">{meal.description}</p>
      )}

      <ul className="list-disc pl-5 space-y-1">
        {meal.foods?.map((food, index) => (
          <li key={index} className="text-sm">
            <span className="font-medium">{food.name}</span>:{" "}
            {food.portion} {food.unit || "g"}
            {food.details ? ` - ${food.details}` : ""}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-gray-500">
        <div>Proteína: {meal.macros?.protein}g</div>
        <div>Carboidratos: {meal.macros?.carbs}g</div>
        <div>Gorduras: {meal.macros?.fats}g</div>
        <div>Fibras: {meal.macros?.fiber}g</div>
      </div>
    </div>
  );
};
