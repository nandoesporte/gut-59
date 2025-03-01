
import { useState, useEffect } from "react";
import type { ProtocolFood } from "../types";

export const useFoodSelection = () => {
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);

  const handleFoodSelection = (foodId: string) => {
    setSelectedFoods(prev => {
      if (prev.includes(foodId)) {
        return prev.filter(id => id !== foodId);
      }
      return [...prev, foodId];
    });
  };

  const calculateTotalCalories = (protocolFoods: ProtocolFood[]) => {
    const total = protocolFoods
      .filter(food => selectedFoods.includes(food.id))
      .reduce((sum, food) => sum + food.calories, 0);
    setTotalCalories(total);
  };

  return {
    selectedFoods,
    totalCalories,
    handleFoodSelection,
    calculateTotalCalories,
  };
};
