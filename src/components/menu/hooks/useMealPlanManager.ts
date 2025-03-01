
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan, ProtocolFood } from "../types";
import { generateMealPlan } from "./useMealPlanGeneration";
import { useMenuDatabase } from "./useMenuDatabase";
import { useWallet } from "@/hooks/useWallet";
import type { CalorieCalculatorForm } from "../CalorieCalculator";

export const useMealPlanManager = () => {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const wallet = useWallet();
  const menuDatabase = useMenuDatabase();

  const addTransactionAsync = async (params: Parameters<typeof wallet.addTransaction>[0]) => {
    return new Promise<void>((resolve, reject) => {
      try {
        wallet.addTransaction(params);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const generateUserMealPlan = async ({
    formData,
    calorieNeeds,
    selectedFoods,
    foodsByMealType,
    protocolFoods,
    preferences
  }: {
    formData: CalorieCalculatorForm;
    calorieNeeds: number | null;
    selectedFoods: string[];
    foodsByMealType: Record<string, string[]>;
    protocolFoods: ProtocolFood[];
    preferences: DietaryPreferences;
  }) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Usuário não autenticado");
      return false;
    }

    if (!calorieNeeds || calorieNeeds <= 0) {
      toast.error("Necessidade calórica inválida");
      return false;
    }

    if (!selectedFoods || selectedFoods.length === 0) {
      toast.error("Selecione pelo menos um alimento");
      return false;
    }

    if (!formData.goal || !formData.weight || !formData.height || !formData.age) {
      toast.error("Dados do formulário incompletos");
      return false;
    }

    console.log('[MealPlanManager] Preferências alimentares recebidas:', JSON.stringify(preferences, null, 2));
    console.log('[MealPlanManager] Alimentos selecionados:', selectedFoods);

    setLoading(true);

    try {
      const selectedFoodsData = protocolFoods.filter(food => selectedFoods.includes(String(food.id)));
      console.log('[MealPlanManager] Dados dos alimentos selecionados:', selectedFoodsData.map(f => ({ id: f.id, name: f.name })));
      
      const sanitizedFoodsByMealType: Record<string, string[]> = {};
      
      if (foodsByMealType) {
        Object.keys(foodsByMealType).forEach(mealType => {
          sanitizedFoodsByMealType[mealType] = foodsByMealType[mealType].map(id => String(id));
        });
      }
      
      console.log('[MealPlanManager] foodsByMealType sanitized:', JSON.stringify(sanitizedFoodsByMealType, null, 2));

      // Save dietary preferences to database
      await menuDatabase.saveDietaryPreferences(preferences, userData.user.id);
      
      const sanitizedPreferences: DietaryPreferences = {
        hasAllergies: Boolean(preferences.hasAllergies),
        allergies: Array.isArray(preferences.allergies) ? preferences.allergies.map(String) : [],
        dietaryRestrictions: Array.isArray(preferences.dietaryRestrictions) ? preferences.dietaryRestrictions.map(String) : [],
        trainingTime: typeof preferences.trainingTime === 'string' ? preferences.trainingTime : null
      };
      
      console.log('[MealPlanManager] Preferências sanitizadas para o Edge Function:', JSON.stringify(sanitizedPreferences, null, 2));
      
      const generatedMealPlan = await generateMealPlan({
        userData: {
          id: userData.user.id,
          weight: Number(formData.weight),
          height: Number(formData.height),
          age: Number(formData.age),
          gender: formData.gender,
          activityLevel: formData.activityLevel,
          goal: formData.goal,
          dailyCalories: calorieNeeds
        },
        selectedFoods: selectedFoodsData,
        foodsByMealType: sanitizedFoodsByMealType,
        preferences: sanitizedPreferences,
        addTransaction: addTransactionAsync
      });

      if (!generatedMealPlan) {
        throw new Error('Plano alimentar não foi gerado corretamente');
      }

      console.log('[MealPlanManager] Plano gerado:', generatedMealPlan);
      
      setMealPlan(generatedMealPlan);
      return true;
    } catch (error) {
      console.error('[MealPlanManager] Erro completo:', error);
      toast.error("Erro ao gerar o plano alimentar. Tente novamente.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const regenerateMealPlan = async (
    formData: CalorieCalculatorForm,
    calorieNeeds: number | null,
    protocolFoods: ProtocolFood[],
    foodsByMealType: Record<string, string[]>
  ) => {
    try {
      setLoading(true);
      
      const preferences = await menuDatabase.loadDietaryPreferences();
      if (!preferences) return false;
      
      const nutritionPrefs = await menuDatabase.loadNutritionPreferences();
      if (!nutritionPrefs) return false;
      
      const weightNum = Number(formData.weight);
      const heightNum = Number(formData.height);
      const ageNum = Number(formData.age);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return false;
      }
      
      const selectedFoodsData = protocolFoods.filter(food => 
        nutritionPrefs.selected_foods.includes(food.id)
      );
      
      const foodMealTypes: Record<string, string[]> = {};
      
      Object.keys(foodsByMealType).forEach(mealType => {
        foodMealTypes[mealType] = foodsByMealType[mealType].map(id => String(id));
      });
      
      console.log('Regenerating meal plan with sanitized foodsByMealType:', foodMealTypes);
      
      const newMealPlan = await generateMealPlan({
        userData: {
          id: user.id,
          weight: weightNum,
          height: heightNum,
          age: ageNum,
          gender: formData.gender,
          activityLevel: formData.activityLevel,
          goal: formData.goal,
          dailyCalories: calorieNeeds
        },
        selectedFoods: selectedFoodsData,
        foodsByMealType: foodMealTypes,
        preferences: {
          hasAllergies: preferences.has_allergies,
          allergies: preferences.allergies,
          dietaryRestrictions: preferences.dietary_restrictions,
          trainingTime: preferences.training_time
        },
        addTransaction: addTransactionAsync
      });
      
      setMealPlan(newMealPlan);
      toast.success("Plano alimentar atualizado com sucesso!");
      return true;
      
    } catch (error) {
      console.error("Erro ao regenerar plano alimentar:", error);
      toast.error("Não foi possível gerar um novo plano alimentar");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    mealPlan,
    loading,
    generateUserMealPlan,
    regenerateMealPlan,
    setMealPlan
  };
};
