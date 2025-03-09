
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Goal = "lose" | "maintain" | "gain";

export interface CalorieCalculatorForm {
  weight: string;
  height: string;
  age: string;
  gender: "male" | "female";
  activityLevel: string;
  goal?: Goal;
}

type NutritionPreference = Database['public']['Tables']['nutrition_preferences']['Insert'];

const mapGoalToEnum = (goal: string): Database['public']['Enums']['nutritional_goal'] => {
  const goalMap: Record<string, Database['public']['Enums']['nutritional_goal']> = {
    'lose': 'lose_weight',
    'maintain': 'maintain',
    'gain': 'gain_mass'
  };
  return goalMap[goal] || 'maintain';
};

export const useCalorieCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [calorieNeeds, setCalorieNeeds] = useState<number | null>(null);

  const calculateBMR = (weight: string | number, height: string | number, age: string | number, gender: string) => {
    const weightNum = parseFloat(weight.toString());
    const heightNum = parseFloat(height.toString());
    const ageNum = parseFloat(age.toString());

    if (gender === "male") {
      return 88.36 + (13.4 * weightNum) + (4.8 * heightNum) - (5.7 * ageNum);
    } else {
      return 447.6 + (9.2 * weightNum) + (3.1 * heightNum) - (4.3 * ageNum);
    }
  };

  const calculateCalories = (
    weight: string | number, 
    height: string | number, 
    age: string | number, 
    gender: string, 
    activityLevel: string, 
    goal?: string
  ): number => {
    try {
      setLoading(true);
      
      // Map activity level to multiplier
      let activityMultiplier = 1.2; // default to sedentary
      
      switch(activityLevel) {
        case 'sedentary':
          activityMultiplier = 1.2;
          break;
        case 'light':
          activityMultiplier = 1.375;
          break;
        case 'moderate':
          activityMultiplier = 1.55;
          break;
        case 'intense':
          activityMultiplier = 1.725;
          break;
      }
      
      const bmr = calculateBMR(weight, height, age, gender);
      const dailyCalories = Math.round(bmr * activityMultiplier);

      if (!goal) {
        toast.error("Por favor, selecione um objetivo");
        return 0;
      }

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
  };
};
