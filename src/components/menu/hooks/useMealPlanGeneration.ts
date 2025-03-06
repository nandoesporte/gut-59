
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan, ProtocolFood } from "../types";

interface GenerateMealPlanParams {
  userData: {
    id?: string;
    weight: number;
    height: number;
    age: number;
    gender: string;
    activityLevel: string;
    goal?: string;
    dailyCalories: number;
  };
  selectedFoods: ProtocolFood[];
  foodsByMealType: Record<string, string[]>;
  preferences: DietaryPreferences;
  addTransaction?: (params: any) => Promise<void>;
}

export const generateMealPlan = async ({
  userData,
  selectedFoods,
  foodsByMealType,
  preferences,
  addTransaction
}: GenerateMealPlanParams): Promise<MealPlan | null> => {
  console.log("Starting meal plan generation with Nutri+ agent");
  console.log(`User data: ${userData.weight}kg, ${userData.height}cm, ${userData.age}yo, ${userData.gender}`);
  console.log(`Selected foods: ${selectedFoods.length}`);
  
  try {
    // Call the Nutri+ agent edge function
    const { data, error } = await supabase.functions.invoke('nutri-plus-agent', {
      body: {
        userData,
        selectedFoods,
        foodsByMealType,
        dietaryPreferences: preferences
      }
    });

    if (error) {
      console.error("Error calling Nutri+ agent:", error);
      toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
      return null;
    }

    if (!data?.mealPlan) {
      console.error("No meal plan returned from Nutri+ agent");
      toast.error("Não foi possível gerar o plano alimentar. Por favor, tente novamente.");
      return null;
    }

    console.log("Successfully received meal plan from Nutri+ agent");
    
    // Save the meal plan to the database if user is authenticated
    if (userData.id) {
      try {
        const { error: saveError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userData.id,
            plan_data: data.mealPlan,
            calories: userData.dailyCalories,
            generated_by: "nutri-plus-agent"
          });

        if (saveError) {
          console.error("Error saving meal plan:", saveError);
        } else {
          console.log("Meal plan saved to database");
          
          // Add transaction if wallet function is available
          if (addTransaction) {
            await addTransaction({
              amount: 10,
              type: 'expense',
              description: 'Geração de plano alimentar',
              category: 'meal_plan'
            });
            console.log("Transaction added for meal plan generation");
          }
        }
      } catch (dbError) {
        console.error("Database error while saving meal plan:", dbError);
      }
    }

    // Return the meal plan exactly as generated by the AI
    return data.mealPlan;
  } catch (error) {
    console.error("Unexpected error in generateMealPlan:", error);
    toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
    return null;
  }
};
