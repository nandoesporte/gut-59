import { useState, useCallback } from 'react';
import { ProtocolFood } from '../types';

// Define os mapeamentos de food_group_id para refeições
const FOOD_GROUP_TO_MEAL_TYPE = {
  1: 'breakfast',      // Café da Manhã
  2: 'morning_snack',  // Lanche da Manhã
  3: 'lunch',          // Almoço
  4: 'afternoon_snack', // Lanche da Tarde
  5: 'dinner'          // Jantar
};

export const useFoodSelection = () => {
  const [selectedFoods, setSelectedFoods] = useState<ProtocolFood[]>([]);
  const [totalCalories, setTotalCalories] = useState<number>(0);
  
  // Estrutura para armazenar alimentos categorizados por refeição
  const [foodsByMealType, setFoodsByMealType] = useState<Record<string, string[]>>({
    breakfast: [],
    morning_snack: [],
    lunch: [],
    afternoon_snack: [],
    dinner: [],
    uncategorized: [] // Alimentos sem grupo definido
  });

  const addFood = useCallback((food: ProtocolFood) => {
    setSelectedFoods(prevSelected => {
      // Check if food already exists in selection
      const exists = prevSelected.some(f => f.id === food.id);
      if (exists) return prevSelected;
      return [...prevSelected, food];
    });

    // Also update foodsByMealType
    let mealType = 'uncategorized';
    if (food.food_group_id !== null && food.food_group_id !== undefined) {
      const groupId = Number(food.food_group_id);
      if (!isNaN(groupId) && groupId >= 1 && groupId <= 5) {
        mealType = FOOD_GROUP_TO_MEAL_TYPE[groupId as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'uncategorized';
      }
    }

    setFoodsByMealType(prev => {
      const updatedMeals = { ...prev };
      updatedMeals[mealType] = [...updatedMeals[mealType], food.id];
      return updatedMeals;
    });
  }, []);

  const handleFoodSelection = useCallback((food: ProtocolFood) => {
    setSelectedFoods(prevSelected => {
      const foodIndex = prevSelected.findIndex(f => f.id === food.id);
      
      // If food is already selected, remove it
      if (foodIndex >= 0) {
        const newSelected = [...prevSelected];
        newSelected.splice(foodIndex, 1);
        
        // Also remove from foodsByMealType
        setFoodsByMealType(prev => {
          const updatedMeals = { ...prev };
          Object.keys(updatedMeals).forEach(mealType => {
            updatedMeals[mealType] = updatedMeals[mealType].filter(id => id !== food.id);
          });
          return updatedMeals;
        });
        
        return newSelected;
      }
      
      // Otherwise add it
      return [...prevSelected, food];
    });

    // If adding food, update the meal type categorization
    setSelectedFoods(prev => {
      const isSelected = prev.some(f => f.id === food.id);
      if (isSelected) {
        let mealType = 'uncategorized';
        if (food.food_group_id !== null && food.food_group_id !== undefined) {
          const groupId = Number(food.food_group_id);
          if (!isNaN(groupId) && groupId >= 1 && groupId <= 5) {
            mealType = FOOD_GROUP_TO_MEAL_TYPE[groupId as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'uncategorized';
          }
        }
        
        setFoodsByMealType(prevMeals => {
          const updatedMeals = { ...prevMeals };
          updatedMeals[mealType] = [...updatedMeals[mealType], food.id];
          return updatedMeals;
        });
      }
      return prev;
    });

    // Update total calories
    calculateTotalCalories([food]);
  }, []);

  const calculateTotalCalories = useCallback((foods: ProtocolFood[]) => {
    setSelectedFoods(prevSelected => {
      const total = prevSelected.reduce((sum, food) => sum + (food.calories || 0), 0);
      setTotalCalories(total);
      return prevSelected;
    });
    return totalCalories;
  }, [totalCalories]);

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

  // Função para organizar alimentos já selecionados por tipo de refeição
  const categorizeFoodsByMealType = useCallback((foods: ProtocolFood[]) => {
    const mealTypeMap: Record<string, string[]> = {
      breakfast: [],
      morning_snack: [],
      lunch: [],
      afternoon_snack: [],
      dinner: [],
      uncategorized: []
    };
    
    selectedFoods.forEach(food => {
      let mealType = 'uncategorized';
      
      // Verifica se há um food_group_id válido
      if (food.food_group_id !== null && food.food_group_id !== undefined) {
        // Certifica-se de que o food_group_id é um número entre 1 e 5
        const groupId = Number(food.food_group_id);
        if (!isNaN(groupId) && groupId >= 1 && groupId <= 5) {
          mealType = FOOD_GROUP_TO_MEAL_TYPE[groupId as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'uncategorized';
        }
      }

      mealTypeMap[mealType].push(food.id);
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
