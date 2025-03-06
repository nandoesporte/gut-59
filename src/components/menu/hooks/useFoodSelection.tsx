
import { useState, useCallback } from 'react';
import { ProtocolFood } from '../types';

// Define os mapeamentos de food_group_id para refeições
const FOOD_GROUP_TO_MEAL_TYPE = {
  1: 'breakfast',    // Café da Manhã
  2: 'morning_snack', // Lanche da Manhã
  3: 'lunch',        // Almoço
  4: 'afternoon_snack', // Lanche da Tarde
  5: 'dinner'        // Jantar
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
    dinner: []
  });

  const handleFoodSelection = useCallback((foodId: string, food?: ProtocolFood) => {
    setSelectedFoods(prevSelected => {
      const newSelected = prevSelected.includes(foodId)
        ? prevSelected.filter(id => id !== foodId)
        : [...prevSelected, foodId];
      
      // Se temos o objeto de alimento completo, vamos categorizá-lo por refeição
      if (food) {
        const mealType = FOOD_GROUP_TO_MEAL_TYPE[food.food_group_id as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'lunch';
        
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
      lunch: [],
      snack: [],
      dinner: []
    };
    
    selectedFoods.forEach(foodId => {
      const food = foods.find(f => f.id === foodId);
      if (food) {
        const mealType = FOOD_GROUP_TO_MEAL_TYPE[food.food_group_id as keyof typeof FOOD_GROUP_TO_MEAL_TYPE] || 'snack';
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
