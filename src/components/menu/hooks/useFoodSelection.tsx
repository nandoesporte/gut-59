
import { useState, useCallback } from 'react';
import { ProtocolFood } from '../types';
import { FOOD_GROUP_MAP } from './useProtocolFoods';

// Define os mapeamentos de food_group_id para refeições
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
  
  // Estrutura para armazenar alimentos categorizados por refeição
  const [foodsByMealType, setFoodsByMealType] = useState<Record<string, string[]>>({
    breakfast: [],
    morning_snack: [],
    lunch: [],
    afternoon_snack: [],
    dinner: [],
    uncategorized: [] // Alimentos sem grupo definido
  });

  const handleFoodSelection = useCallback((foodId: string, food?: ProtocolFood) => {
    setSelectedFoods(prevSelected => {
      const newSelected = prevSelected.includes(foodId)
        ? prevSelected.filter(id => id !== foodId)
        : [...prevSelected, foodId];
      
      // Se temos o objeto de alimento completo, vamos categorizá-lo por refeição
      if (food) {
        let mealType = 'uncategorized';
        
        // Verifica se há um food_group_id válido
        if (food.food_group_id !== null && food.food_group_id !== undefined) {
          // Certifica-se de que o food_group_id é um número entre 1 e 5
          const groupId = Number(food.food_group_id);
          if (!isNaN(groupId) && groupId >= 1 && groupId <= 5) {
            mealType = FOOD_GROUP_TO_MEAL_TYPE[groupId as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'uncategorized';
          }
        }
        
        setFoodsByMealType(prev => {
          const updatedMeals = { ...prev };
          
          // Se o alimento foi selecionado, adiciona à refeição correspondente
          if (!prevSelected.includes(foodId)) {
            updatedMeals[mealType] = [...updatedMeals[mealType], foodId];
          } 
          // Se foi desselecionado, remove da refeição correspondente
          else {
            updatedMeals[mealType] = updatedMeals[mealType].filter(id => id !== foodId);
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
    
    selectedFoods.forEach(foodId => {
      const food = foods.find(f => f.id === foodId);
      if (food) {
        let mealType = 'uncategorized';
        
        // Verifica se há um food_group_id válido
        if (food.food_group_id !== null && food.food_group_id !== undefined) {
          // Certifica-se de que o food_group_id é um número entre 1 e 5
          const groupId = Number(food.food_group_id);
          if (!isNaN(groupId) && groupId >= 1 && groupId <= 5) {
            mealType = FOOD_GROUP_TO_MEAL_TYPE[groupId as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'uncategorized';
          }
        }

        mealTypeMap[mealType].push(foodId);
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
    categorizeFoodsByMealType
  };
};
