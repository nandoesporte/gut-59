
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CalorieCalculatorForm } from "../CalorieCalculator";

// Update Goal type to match the database enum values
export type Goal = "lose" | "maintain" | "gain";

type NutritionPreference = Database['public']['Tables']['nutrition_preferences']['Insert'];

// This function maps our UI goals to the database enum values
const mapGoalToEnum = (goal: Goal): Database['public']['Enums']['nutritional_goal'] => {
  const goalMap: Record<Goal, Database['public']['Enums']['nutritional_goal']> = {
    'lose': 'lose_weight',
    'maintain': 'maintain',
    'gain': 'gain_mass'
  };
  return goalMap[goal] || 'maintain';
};

export const useCalorieCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);
  
  // Create form data state with proper typing
  const [userData, setUserData] = useState<{
    id?: string;
    weight: number;
    height: number;
    age: number;
    gender: string;
    activityLevel: string;
    goal: Goal;
    dailyCalories: number;
  }>({
    weight: 0,
    height: 0,
    age: 0,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
    dailyCalories: 0
  });

  const calculateBMR = (data: CalorieCalculatorForm) => {
    const weight = parseFloat(data.weight);
    const height = parseFloat(data.height);
    const age = parseFloat(data.age);

    if (data.gender === "male") {
      return 88.36 + (13.4 * weight) + (4.8 * height) - (5.7 * age);
    } else {
      return 447.6 + (9.2 * weight) + (3.1 * height) - (4.3 * age);
    }
  };

  const calculateCalories = (formData: CalorieCalculatorForm, selectedLevel: { multiplier: number }) => {
    try {
      setLoading(true);
      const bmr = calculateBMR(formData);
      const activityMultiplier = selectedLevel ? selectedLevel.multiplier : 1.2;
      const dailyCalories = Math.round(bmr * activityMultiplier);

      // Don't require authentication for calculating calories
      // This allows the calculator to work even if the user is not logged in
      let userId = null;
      
      if (!formData.goal) {
        toast.error("Por favor, selecione um objetivo");
        return 0;
      }

      // Update user data
      setUserData({
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        age: parseFloat(formData.age),
        gender: formData.gender,
        activityLevel: formData.activityLevel,
        goal: formData.goal as Goal,
        dailyCalories
      });

      setCalorieNeeds(dailyCalories);
      return dailyCalories;
    } catch (error) {
      console.error('Error calculating calories:', error);
      toast.error("Erro ao calcular necessidades calóricas");
      return 0;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    calorieNeeds,
    calculateCalories,
    userData,
    setUserData
  };
};
