
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { ProtocolFood } from "../types";

export const useFoodSelection = (protocolFoods: ProtocolFood[]) => {
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);

  useEffect(() => {
    const calculateTotalCalories = () => {
      const total = protocolFoods
        .filter(food => selectedFoods.includes(food.id))
        .reduce((sum, food) => sum + food.calories, 0);
      setTotalCalories(total);
    };

    calculateTotalCalories();
  }, [selectedFoods, protocolFoods]);

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

  return {
    selectedFoods,
    totalCalories,
    handleFoodSelection
  };
};
