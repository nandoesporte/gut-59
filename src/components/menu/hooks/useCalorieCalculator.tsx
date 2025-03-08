
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CalorieCalculatorForm } from "../CalorieCalculator";

export type Goal = "lose" | "maintain" | "gain";

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

  const calculateCalories = async (formData: CalorieCalculatorForm, selectedLevel: { multiplier: number }) => {
    try {
      setLoading(true);
      const bmr = calculateBMR(formData);
      const activityMultiplier = selectedLevel ? selectedLevel.multiplier : 1.2;
      const dailyCalories = Math.round(bmr * activityMultiplier);

      // Don't require authentication for calculating calories
      // This allows the calculator to work even if the user is not logged in
      let userId = null;
      try {
        const { data: userData } = await supabase.auth.getUser();
        userId = userData.user?.id;
      } catch (authError) {
        console.warn("User not authenticated, proceeding with calculation only:", authError);
      }

      if (!formData.goal) {
        toast.error("Por favor, selecione um objetivo");
        return null;
      }

      // Only save to database if user is logged in
      if (userId) {
        const nutritionPreference: NutritionPreference = {
          weight: parseFloat(formData.weight),
          height: parseFloat(formData.height),
          age: parseFloat(formData.age),
          gender: formData.gender,
          activity_level: formData.activityLevel as Database['public']['Enums']['activity_level'],
          goal: mapGoalToEnum(formData.goal),
          user_id: userId
        };

        const { error: nutritionError } = await supabase
          .from('nutrition_preferences')
          .upsert(nutritionPreference);

        if (nutritionError) {
          console.error('Error saving nutrition preferences:', nutritionError);
          // Continue anyway, this shouldn't block the calculation
        }
      }

      setCalorieNeeds(dailyCalories);
      return dailyCalories;
    } catch (error) {
      console.error('Error calculating calories:', error);
      toast.error("Erro ao calcular necessidades calóricas");
      return null;
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
