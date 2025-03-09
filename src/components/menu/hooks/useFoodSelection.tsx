
import { useState, useCallback } from "react";
import { ProtocolFood } from "../types";

interface FoodSelectionResult {
  selectedFoods: ProtocolFood[];
  foodsByMealType: Record<string, string[]>;
  totalCalories: number;
  handleFoodSelection: (food: ProtocolFood) => void;
  calculateTotalCalories: (foods: ProtocolFood[]) => number;
  categorizeFoodsByMealType: (foods: ProtocolFood[]) => Record<string, string[]>;
  addFood: (food: ProtocolFood) => void;
  resetSelection: () => void;
}

export const useFoodSelection = (): FoodSelectionResult => {
  const [selectedFoods, setSelectedFoods] = useState<ProtocolFood[]>([]);
  const [foodsByMealType, setFoodsByMealType] = useState<Record<string, string[]>>({});

  // Calculate total calories
  const calculateTotalCalories = useCallback((foods: ProtocolFood[]): number => {
    return foods.reduce((sum, food) => sum + food.calories, 0);
  }, []);

  const totalCalories = calculateTotalCalories(selectedFoods);

  // Toggle food selection
  const handleFoodSelection = useCallback((food: ProtocolFood) => {
    setSelectedFoods(prev => {
      const isSelected = prev.some(f => f.id === food.id);
      
      if (isSelected) {
        return prev.filter(f => f.id !== food.id);
      } else {
        return [...prev, food];
      }
    });
  }, []);

  // Add a food to selection without toggling
  const addFood = useCallback((food: ProtocolFood) => {
    setSelectedFoods(prev => {
      const isSelected = prev.some(f => f.id === food.id);
      
      if (!isSelected) {
        return [...prev, food];
      }
      return prev;
    });
  }, []);

  // Reset selection
  const resetSelection = useCallback(() => {
    setSelectedFoods([]);
  }, []);

  // Categorize foods by meal type for API
  const categorizeFoodsByMealType = useCallback((foods: ProtocolFood[]): Record<string, string[]> => {
    const mealTypes: Record<string, string[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: []
    };

    foods.forEach(food => {
      const foodId = food.id;
      
      // Simple logic for categorizing foods - can be improved with actual food metadata
      if (food.food_group_name?.toLowerCase().includes('fruta') || 
          food.food_group_name?.toLowerCase().includes('laticínio')) {
        mealTypes.breakfast.push(foodId);
        mealTypes.snacks.push(foodId);
      } else if (food.food_group_name?.toLowerCase().includes('carne') || 
                food.food_group_name?.toLowerCase().includes('legume')) {
        mealTypes.lunch.push(foodId);
        mealTypes.dinner.push(foodId);
      } else {
        // Default, add to all meal types
        mealTypes.breakfast.push(foodId);
        mealTypes.lunch.push(foodId);
        mealTypes.dinner.push(foodId);
        mealTypes.snacks.push(foodId);
      }
    });

    return mealTypes;
  }, []);

  return {
    selectedFoods,
    foodsByMealType,
    totalCalories,
    handleFoodSelection,
    calculateTotalCalories,
    categorizeFoodsByMealType,
    addFood,
    resetSelection
  };
};
