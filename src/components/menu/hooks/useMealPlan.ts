
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan } from "../types";
import type { CalorieCalculatorForm } from "../CalorieCalculator";

export const useMealPlan = (
  formData: CalorieCalculatorForm,
  calorieNeeds: number | null,
  selectedFoods: string[]
) => {
  const [loading, setLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreferences | null>(null);

  const handleDietaryPreferences = async (preferences: DietaryPreferences) => {
    try {
      setLoading(true);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      if (!calorieNeeds) {
        toast.error("Necessidade calórica não calculada");
        return;
      }

      if (selectedFoods.length === 0) {
        toast.error("Nenhum alimento selecionado");
        return;
      }

      setDietaryPreferences(preferences);

      const requestData = {
        userData: {
          ...formData,
          userId: userData.user.id,
          dailyCalories: calorieNeeds,
          lastFeedback: {
            likedFoods: [],
            dislikedFoods: []
          }
        },
        selectedFoods,
        dietaryPreferences: {
          ...preferences,
          hasAllergies: preferences.hasAllergies || false,
          allergies: preferences.allergies || [],
          dietaryRestrictions: preferences.dietaryRestrictions || [],
          trainingTime: preferences.trainingTime || null
        }
      };

      console.log('Enviando requisição:', JSON.stringify(requestData, null, 2));

      const { data: responseData, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: requestData
      });

      if (error) {
        console.error('Erro da função edge:', error);
        toast.error("Erro ao gerar cardápio. Por favor, tente novamente.");
        throw error;
      }

      if (!responseData) {
        throw new Error('Nenhum dado recebido do gerador de cardápio');
      }

      const dietaryPreferencesJson = {
        hasAllergies: preferences.hasAllergies || false,
        allergies: preferences.allergies || [],
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        trainingTime: preferences.trainingTime || null
      };

      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.user.id,
          dietary_preferences: dietaryPreferencesJson,
          calories: calorieNeeds,
          plan_data: responseData,
          macros: responseData.totalNutrition,
          training_time: preferences.trainingTime,
          active: true
        });

      if (saveError) {
        console.error('Erro ao salvar plano:', saveError);
        toast.error("Erro ao salvar seu plano alimentar");
        throw saveError;
      }

      console.log('Cardápio recebido:', responseData);
      setMealPlan(responseData);
      return true;
    } catch (error) {
      console.error('Erro ao gerar cardápio:', error);
      toast.error("Erro ao gerar cardápio personalizado. Por favor, tente novamente.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    mealPlan,
    handleDietaryPreferences
  };
};
