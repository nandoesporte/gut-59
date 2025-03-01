
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan, ProtocolFood } from "../types";
import { generateMealPlan } from "./useMealPlanGeneration";
import { useMenuDatabase } from "./useMenuDatabase";
import { useWallet } from "@/hooks/useWallet";
import type { CalorieCalculatorForm } from "../CalorieCalculator";
import { REWARDS } from "@/constants/rewards";

// Helper function to save meal plan data to the database
const saveMealPlanData = async (
  userId: string, 
  mealPlan: MealPlan, 
  calorieNeeds: number,
  preferences: DietaryPreferences
) => {
  try {
    console.log('Salvando plano alimentar no banco de dados para usuário:', userId);
    
    const { error } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        plan_data: mealPlan,
        calories: calorieNeeds,
        dietary_preferences: preferences
      });
    
    if (error) {
      console.error('Erro ao salvar plano alimentar:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados do plano alimentar:', error);
    return false;
  }
};

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

    console.log('Iniciando geração do plano alimentar com dados:', {
      calorieNeeds,
      selectedFoodsCount: selectedFoods.length,
      preferences
    });

    setLoading(true);

    try {
      const selectedFoodsData = protocolFoods.filter(food => selectedFoods.includes(String(food.id)));
      console.log('Alimentos selecionados processados:', selectedFoodsData.map(f => ({ id: f.id, name: f.name })));
      
      const sanitizedFoodsByMealType: Record<string, string[]> = {};
      
      if (foodsByMealType) {
        Object.keys(foodsByMealType).forEach(mealType => {
          sanitizedFoodsByMealType[mealType] = foodsByMealType[mealType].map(id => String(id));
        });
      }
      
      console.log('Distribuição de alimentos por refeição:', sanitizedFoodsByMealType);

      await menuDatabase.saveDietaryPreferences(preferences, userData.user.id);
      
      const sanitizedPreferences: DietaryPreferences = {
        hasAllergies: Boolean(preferences.hasAllergies),
        allergies: Array.isArray(preferences.allergies) ? preferences.allergies.map(String) : [],
        dietaryRestrictions: Array.isArray(preferences.dietaryRestrictions) ? preferences.dietaryRestrictions.map(String) : [],
        trainingTime: typeof preferences.trainingTime === 'string' ? preferences.trainingTime : null
      };
      
      console.log('Chamando Edge Function com preferências:', sanitizedPreferences);
      
      const response = await supabase.functions.invoke('generate-meal-plan', {
        body: {
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
          preferences: sanitizedPreferences
        }
      });

      console.log('Resposta da Edge Function:', response);

      if (!response.data || !response.data.mealPlan) {
        console.error('Resposta inválida da Edge Function:', response);
        throw new Error('Plano alimentar não foi gerado corretamente');
      }

      const generatedPlan = response.data.mealPlan;
      
      console.log('Estrutura do plano gerado:', {
        temPlanoSemanal: !!generatedPlan.weeklyPlan,
        diasDisponiveis: generatedPlan.weeklyPlan ? Object.keys(generatedPlan.weeklyPlan) : [],
        temRecomendacoes: !!generatedPlan.recommendations,
        temTotaisSemanais: !!generatedPlan.weeklyTotals
      });

      setMealPlan(generatedPlan);

      try {
        await saveMealPlanData(userData.user.id, generatedPlan, calorieNeeds, sanitizedPreferences);
        console.log('Plano salvo com sucesso no banco de dados');
      } catch (dbError) {
        console.error('Erro ao salvar plano:', dbError);
        // Continuar mesmo com erro no salvamento
      }

      try {
        await addTransactionAsync({
          amount: REWARDS.MEAL_PLAN,
          type: 'meal_plan',
          description: 'Geração de plano alimentar personalizado'
        });
        console.log('Recompensa adicionada com sucesso');
      } catch (rewardError) {
        console.error('Erro ao adicionar recompensa:', rewardError);
      }

      toast.success(`Cardápio personalizado gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);
      return generatedPlan;
    } catch (error) {
      console.error('Erro crítico na geração do plano:', error);
      toast.error("Não foi possível gerar o plano alimentar personalizado");
      return null;
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
