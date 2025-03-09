
import React from "react";
import { Button } from "@/components/ui/button";
import { Food } from "../types";

interface FoodReplaceButtonProps {
  food: Food;
  dayKey: string;
  mealType: string;
  index: number;
  onReplaceFood: (food: Food, dayKey: string, mealType: string, index: number) => void;
}

export const FoodReplaceButton: React.FC<FoodReplaceButtonProps> = ({
  food,
  dayKey,
  mealType,
  index,
  onReplaceFood
}) => {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="absolute top-2 right-2"
      onClick={() => onReplaceFood(food, dayKey, mealType, index)}
    >
      Substituir
    </Button>
  );
};
