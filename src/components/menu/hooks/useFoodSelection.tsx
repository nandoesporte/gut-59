
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtocolFood } from "../types";
import { toast } from "sonner";

export const useFoodSelection = () => {
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<ProtocolFood[]>([]);
  const [foodsByMealType, setFoodsByMealType] = useState<Record<string, ProtocolFood[]>>({});
  const [totalCalories, setTotalCalories] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load protocol foods
  const loadFoods = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("protocol_foods")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      setProtocolFoods(data as ProtocolFood[]);
      return data;
    } catch (error) {
      console.error("Error loading foods:", error);
      toast.error("Erro ao carregar alimentos");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Calculate total calories
  const calculateTotalCalories = (foods: ProtocolFood[]) => {
    return foods.reduce((total, food) => total + (food.calories || 0), 0);
  };

  // Handle food selection
  const handleFoodSelection = (foodId: string, food?: ProtocolFood) => {
    const foodToUse = food || protocolFoods.find(f => f.id === foodId);
    
    if (!foodToUse) return;
    
    setSelectedFoods(prevSelectedFoods => {
      // Check if this food is already selected
      const isSelected = prevSelectedFoods.some(f => f.id === foodId);
      
      // If selected, remove it
      if (isSelected) {
        const newSelectedFoods = prevSelectedFoods.filter(f => f.id !== foodId);
        setTotalCalories(calculateTotalCalories(newSelectedFoods));
        return newSelectedFoods;
      } 
      // If not selected, add it
      else {
        const newSelectedFoods = [...prevSelectedFoods, foodToUse];
        setTotalCalories(calculateTotalCalories(newSelectedFoods));
        return newSelectedFoods;
      }
    });
  };

  // Categorize foods by meal type
  const categorizeFoodsByMealType = (foods: ProtocolFood[]) => {
    const foodsByType: Record<string, ProtocolFood[]> = {
      breakfast: [],
      morning_snack: [],
      lunch: [],
      afternoon_snack: [],
      dinner: [],
      any: []
    };

    foods.forEach(food => {
      if (!food.meal_type || food.meal_type.length === 0 || 
          (Array.isArray(food.meal_type) && food.meal_type.includes('any'))) {
        foodsByType.any.push(food);
      } else if (Array.isArray(food.meal_type)) {
        food.meal_type.forEach(type => {
          if (type in foodsByType) {
            foodsByType[type].push(food);
          }
        });
      }
    });

    return foodsByType;
  };

  // Update foodsByMealType when selectedFoods change
  useEffect(() => {
    setFoodsByMealType(categorizeFoodsByMealType(selectedFoods));
  }, [selectedFoods]);

  return {
    protocolFoods,
    selectedFoods,
    foodsByMealType,
    totalCalories,
    loading,
    setSelectedFoods,
    handleFoodSelection,
    calculateTotalCalories,
    categorizeFoodsByMealType,
    loadFoods
  };
};
