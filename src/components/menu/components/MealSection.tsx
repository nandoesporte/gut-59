
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Meal } from "../types";

interface MealSectionProps {
  title: string;
  icon: React.ReactNode;
  meal: Meal;
  unitLabels?: Record<string, string>;
  className?: string;
}

export const MealSection: React.FC<MealSectionProps> = ({ 
  title, 
  icon, 
  meal,
  unitLabels = {},
  className = ""
}) => {
  // Função para traduzir unidades
  const translateUnit = (unit: string): string => {
    return unitLabels[unit.toLowerCase()] || unit;
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center mb-2">
        <div className="mr-2">{icon}</div>
        <h4 className={`font-medium ${className}`}>{title}</h4>
      </div>
      
      <div className="space-y-4">
        {meal.foods.map((food, index) => (
          <div key={index} className="pl-2 border-l-2 border-gray-200 ml-1">
            <div className="flex flex-wrap items-baseline gap-x-1">
              <span className="font-medium text-base sm:text-lg">{food.name}</span>
              <span className="text-gray-600 text-sm sm:text-base">
                {food.portion} {translateUnit(food.unit)}
              </span>
            </div>
            {food.details && (
              <p className="text-gray-500 text-xs sm:text-sm mt-1 leading-relaxed">
                {food.details}
              </p>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex flex-wrap gap-2 pt-2 text-sm">
        {meal.nutrition && (
          <>
            {meal.nutrition.calories && (
              <span className="bg-gray-100 px-2 py-1 rounded-md">
                {meal.nutrition.calories} kcal
              </span>
            )}
            {meal.nutrition.protein && (
              <span className="bg-blue-50 px-2 py-1 rounded-md">
                Proteínas: {meal.nutrition.protein}g
              </span>
            )}
            {meal.nutrition.carbs && (
              <span className="bg-green-50 px-2 py-1 rounded-md">
                Carboidratos: {meal.nutrition.carbs}g
              </span>
            )}
            {meal.nutrition.fats && (
              <span className="bg-orange-50 px-2 py-1 rounded-md">
                Gorduras: {meal.nutrition.fats}g
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
