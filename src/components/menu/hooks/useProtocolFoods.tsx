
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtocolFood } from '../types';

export const FOOD_GROUP_MAP = {
  1: 'Café da Manhã',
  2: 'Lanche da Manhã',
  3: 'Almoço',
  4: 'Lanche da Tarde',
  5: 'Jantar'
};

export const useProtocolFoods = () => {
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [foodsByMealType, setFoodsByMealType] = useState<Record<string, ProtocolFood[]>>({
    breakfast: [],
    morning_snack: [],
    lunch: [],
    afternoon_snack: [],
    dinner: [],
    uncategorized: []
  });

  useEffect(() => {
    const fetchProtocolFoods = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('protocol_foods')
          .select('*')
          .order('name');
          
        if (error) {
          throw new Error(`Error fetching protocol foods: ${error.message}`);
        }
        
        const foods = data as ProtocolFood[];
        setProtocolFoods(foods);
        
        // Categorize foods by meal type using the actual ProtocolFood objects
        const categorizedFoods: Record<string, ProtocolFood[]> = {
          breakfast: [],
          morning_snack: [],
          lunch: [],
          afternoon_snack: [],
          dinner: [],
          uncategorized: []
        };
        
        foods.forEach(food => {
          if (food.food_group_id === 1) {
            categorizedFoods.breakfast.push(food);
          } else if (food.food_group_id === 2) {
            categorizedFoods.morning_snack.push(food);
          } else if (food.food_group_id === 3) {
            categorizedFoods.lunch.push(food);
          } else if (food.food_group_id === 4) {
            categorizedFoods.afternoon_snack.push(food);
          } else if (food.food_group_id === 5) {
            categorizedFoods.dinner.push(food);
          } else {
            categorizedFoods.uncategorized.push(food);
          }
        });
        
        setFoodsByMealType(categorizedFoods);
      } catch (err) {
        console.error('Failed to fetch protocol foods:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    
    fetchProtocolFoods();
  }, []);

  return { protocolFoods, loading, error, foodsByMealType };
};
