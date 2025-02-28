
import { useState, useCallback } from 'react';
import { ProtocolFood } from '../types';

// Define os mapeamentos de food_group_id para refeições
const FOOD_GROUP_TO_MEAL_TYPE = {
  1: 'breakfast', // Café da manhã
  2: 'lunch',     // Almoço
  3: 'snack',     // Lanches
  4: 'dinner'     // Jantar
};

export const useFoodSelection = () => {
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [totalCalories, setTotalCalories] = useState<number>(0);
  
  // Estrutura para armazenar alimentos categorizados por refeição
  const [foodsByMealType, setFoodsByMealType] = useState<Record<string, string[]>>({
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: []
  });

  const handleFoodSelection = useCallback((foodId: string | number, food?: ProtocolFood) => {
    // Certifique-se de que foodId seja sempre uma string
    const stringFoodId = String(foodId);
    
    setSelectedFoods(prevSelected => {
      const newSelected = prevSelected.includes(stringFoodId)
        ? prevSelected.filter(id => id !== stringFoodId)
        : [...prevSelected, stringFoodId];
      
      // Se temos o objeto de alimento completo, vamos categorizá-lo por refeição
      if (food) {
        const mealType = FOOD_GROUP_TO_MEAL_TYPE[food.food_group_id as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'snack';
        
        setFoodsByMealType(prev => {
          const updatedMeals = { ...prev };
          
          // Se o alimento foi selecionado, adiciona à refeição correspondente
          if (!prevSelected.includes(stringFoodId)) {
            updatedMeals[mealType] = [...updatedMeals[mealType], stringFoodId];
          } 
          // Se foi desselecionado, remove da refeição correspondente
          else {
            updatedMeals[mealType] = updatedMeals[mealType].filter(id => id !== stringFoodId);
          }
          
          // Ensure all IDs are stored as strings
          Object.keys(updatedMeals).forEach(key => {
            updatedMeals[key] = updatedMeals[key].map(id => String(id));
          });
          
          return updatedMeals;
        });
      }
      
      return newSelected;
    });
  }, []);

  const calculateTotalCalories = useCallback((foods: ProtocolFood[]) => {
    const selected = foods.filter(food => selectedFoods.includes(String(food.id)));
    const total = selected.reduce((sum, food) => sum + (food.calories || 0), 0);
    setTotalCalories(total);
    return total;
  }, [selectedFoods]);

  // Função para organizar alimentos já selecionados por tipo de refeição
  const categorizeFoodsByMealType = useCallback((foods: ProtocolFood[]) => {
    const mealTypeMap: Record<string, string[]> = {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: []
    };
    
    selectedFoods.forEach(foodId => {
      const food = foods.find(f => String(f.id) === foodId);
      if (food) {
        const mealType = FOOD_GROUP_TO_MEAL_TYPE[food.food_group_id as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'snack';
        mealTypeMap[mealType].push(foodId);
      }
    });
    
    // Double-check that all IDs are strings
    Object.keys(mealTypeMap).forEach(key => {
      mealTypeMap[key] = mealTypeMap[key].map(id => String(id));
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
    categorizeFoodsByMealType
  };
};
