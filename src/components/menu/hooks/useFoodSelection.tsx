
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { ProtocolFood } from "../types";

export const useFoodSelection = () => {
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);

  const handleFoodSelection = (foodId: string) => {
    setSelectedFoods(prev => {
      if (prev.includes(foodId)) {
        return prev.filter(id => id !== foodId);
      }
      if (prev.length >= 20) {
        toast.error("Você já selecionou o máximo de 20 alimentos!");
        return prev;
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
