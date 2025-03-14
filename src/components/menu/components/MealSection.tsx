
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Meal } from "../types";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  
  // Função para traduzir unidades
  const translateUnit = (unit: string): string => {
    return unitLabels[unit.toLowerCase()] || unit;
  };
  
  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center">
        <div className="mr-2">{icon}</div>
        <h4 className={`font-medium ${className}`}>{title}</h4>
      </div>
      
      <div className="space-y-2.5 sm:space-y-4">
        {meal.foods.map((food, index) => (
          <div 
            key={index} 
            className="pl-2 border-l-2 border-gray-200 ml-1 py-1 hover:bg-gray-50 rounded-r-md transition-colors"
          >
            <div className="flex flex-wrap items-baseline gap-x-1">
              <span className="font-medium text-sm sm:text-base">{food.name}</span>
              <span className="text-gray-600 text-xs sm:text-sm">
                {food.portion} {translateUnit(food.unit)}
              </span>
            </div>
            {food.details && (
              <p className="text-gray-500 text-xs mt-0.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
                {food.details}
              </p>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex flex-wrap gap-1 sm:gap-2 pt-1.5 text-2xs sm:text-xs">
        {meal.calories && (
          <span className="bg-gray-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
            {meal.calories} kcal
          </span>
        )}
        {meal.macros && (
          <>
            {meal.macros.protein && (
              <span className="bg-blue-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
                {isMobile ? "P: " : "Proteínas: "}{meal.macros.protein}g
              </span>
            )}
            {meal.macros.carbs && (
              <span className="bg-green-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
                {isMobile ? "C: " : "Carboidratos: "}{meal.macros.carbs}g
              </span>
            )}
            {meal.macros.fats && (
              <span className="bg-orange-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
                {isMobile ? "G: " : "Gorduras: "}{meal.macros.fats}g
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
