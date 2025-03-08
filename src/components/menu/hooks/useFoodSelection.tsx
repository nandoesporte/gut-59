
import { useState, useCallback } from 'react';
import { ProtocolFood } from '../types';
import { FOOD_GROUP_MAP } from './useProtocolFoods';

// Define the meal type mapping
const FOOD_GROUP_TO_MEAL_TYPE = {
  1: 'breakfast',      // Café da Manhã
  2: 'morning_snack',  // Lanche da Manhã
  3: 'lunch',          // Almoço
  4: 'afternoon_snack', // Lanche da Tarde
  5: 'dinner'          // Jantar
};

export const useFoodSelection = () => {
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [totalCalories, setTotalCalories] = useState<number>(0);
  
  // Structure to store foods categorized by meal type
  const [foodsByMealType, setFoodsByMealType] = useState<Record<string, ProtocolFood[]>>({
    breakfast: [],
    morning_snack: [],
    lunch: [],
    afternoon_snack: [],
    dinner: [],
    uncategorized: []
  });

  // Add food to selection
  const addFood = useCallback((food: ProtocolFood) => {
    handleFoodSelection(food.id, food);
  }, []);

  // Reset selection
  const resetSelection = useCallback(() => {
    setSelectedFoods([]);
    setTotalCalories(0);
    setFoodsByMealType({
      breakfast: [],
      morning_snack: [],
      lunch: [],
      afternoon_snack: [],
      dinner: [],
      uncategorized: []
    });
  }, []);

  const handleFoodSelection = useCallback((foodId: string, food?: ProtocolFood) => {
    setSelectedFoods(prevSelected => {
      const newSelected = prevSelected.includes(foodId)
        ? prevSelected.filter(id => id !== foodId)
        : [...prevSelected, foodId];
      
      // If we have the food object, categorize it by meal type
      if (food) {
        let mealType = 'uncategorized';
        
        // Check if there's a valid food_group_id
        if (food.food_group_id !== null && food.food_group_id !== undefined) {
          // Ensure the food_group_id is a number between 1 and 5
          const groupId = Number(food.food_group_id);
          if (!isNaN(groupId) && groupId >= 1 && groupId <= 5) {
            mealType = FOOD_GROUP_TO_MEAL_TYPE[groupId as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'uncategorized';
          }
        }
        
        setFoodsByMealType(prev => {
          const updatedMeals = { ...prev };
          
          // If the food was selected, add to the corresponding meal type
          if (!prevSelected.includes(foodId)) {
            updatedMeals[mealType] = [...(updatedMeals[mealType] || []), food];
          } 
          // If deselected, remove from the meal type
          else {
            updatedMeals[mealType] = (updatedMeals[mealType] || []).filter(
              item => item.id !== foodId
            );
          }
          
          return updatedMeals;
        });
      }
      
      return newSelected;
    });
  }, []);

  const calculateTotalCalories = useCallback((foods: ProtocolFood[]) => {
    const selected = foods.filter(food => selectedFoods.includes(food.id));
    const total = selected.reduce((sum, food) => sum + (food.calories || 0), 0);
    setTotalCalories(total);
    return total;
  }, [selectedFoods]);

  // Function to organize selected foods by meal type
  const categorizeFoodsByMealType = useCallback((foods: ProtocolFood[]) => {
    const mealTypeMap: Record<string, ProtocolFood[]> = {
      breakfast: [],
      morning_snack: [],
      lunch: [],
      afternoon_snack: [],
      dinner: [],
      uncategorized: []
    };
    
    selectedFoods.forEach(foodId => {
      const food = foods.find(f => f.id === foodId);
      if (food) {
        let mealType = 'uncategorized';
        
        // Check if there's a valid food_group_id
        if (food.food_group_id !== null && food.food_group_id !== undefined) {
          // Ensure the food_group_id is a number between 1 and 5
          const groupId = Number(food.food_group_id);
          if (!isNaN(groupId) && groupId >= 1 && groupId <= 5) {
            mealType = FOOD_GROUP_TO_MEAL_TYPE[groupId as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'uncategorized';
          }
        }

        mealTypeMap[mealType].push(food);
      }
    });
    
    setFoodsByMealType(mealTypeMap);
    return mealTypeMap;
  }, [selectedFoods]);

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
