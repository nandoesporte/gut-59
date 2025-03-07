
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MealPlan, ProtocolFood, DietaryPreferences } from "../types";

interface GenerateMealPlanParams {
  calorieNeeds: number;
  selectedFoods: ProtocolFood[];
  dietaryPreferences: DietaryPreferences;
}

export const useMealPlanGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [mealPlanResult, setMealPlanResult] = useState<MealPlan | null>(null);

  const generateMealPlan = async (params: GenerateMealPlanParams) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      toast.info("Gerando seu plano alimentar personalizado...");
      
      // Extract food IDs for the API call
      const foodIds = params.selectedFoods.map(food => food.id);
      
      // Call the edge function to generate the meal plan
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          calorieNeeds: params.calorieNeeds,
          selectedFoods: foodIds,
          hasAllergies: params.dietaryPreferences.hasAllergies,
          allergies: params.dietaryPreferences.allergies,
          dietaryRestrictions: params.dietaryPreferences.dietaryRestrictions,
          trainingTime: params.dietaryPreferences.trainingTime
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data || !data.mealPlan) {
        throw new Error("Failed to generate meal plan");
      }
      
      // Save the meal plan to the database
      const { error: saveError } = await supabase
        .from("meal_plans")
        .insert({
          user_id: user.id,
          plan_data: data.mealPlan,
          calories: params.calorieNeeds,
          dietary_preferences: {
            hasAllergies: params.dietaryPreferences.hasAllergies,
            allergies: params.dietaryPreferences.allergies,
            dietaryRestrictions: params.dietaryPreferences.dietaryRestrictions,
            trainingTime: params.dietaryPreferences.trainingTime
          }
        });
      
      if (saveError) {
        console.error("Error saving meal plan:", saveError);
        toast.error("Erro ao salvar plano alimentar no banco de dados");
      }
      
      setMealPlanResult(data.mealPlan);
      toast.success("Plano alimentar gerado com sucesso!");
      
      return data.mealPlan;
    } catch (error) {
      console.error("Error generating meal plan:", error);
      toast.error("Erro ao gerar plano alimentar");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateMealPlan,
    loading,
    mealPlanResult
  };
};
