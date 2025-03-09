
import React from "react";
import { Meal } from "../types";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  meal: Meal;
}

export const MealSection = ({ title, icon, meal }: MealSectionProps) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-gray-800 flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </h4>
        <span className="text-sm font-medium bg-green-100 text-green-800 px-2 py-1 rounded">
          {meal.calories} kcal
        </span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600">{meal.description}</p>
      </div>
      
      <div className="space-y-2">
        {meal.foods.map((food, index) => (
          <div key={index} className="bg-gray-50 p-2 rounded text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{food.name}</span>
              <span>{food.portion} {food.unit}</span>
            </div>
            {food.details && (
              <p className="text-xs text-gray-500 mt-1">{food.details}</p>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div>Proteínas: {meal.macros.protein}g</div>
        <div>Carboidratos: {meal.macros.carbs}g</div>
        <div>Gorduras: {meal.macros.fats}g</div>
      </div>
    </div>
  );
};
