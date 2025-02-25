
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DietaryPreferences, ProtocolFood } from "../types";
import { REWARDS } from '@/constants/rewards';
import type { TransactionType } from "@/types/wallet";
import type { UseMutateFunction } from "@tanstack/react-query";

interface MealPlanGenerationProps {
  userData: {
    id: string;
    weight: number;
    height: number;
    age: number;
    gender: string;
    activityLevel: string;
    goal: string;
    dailyCalories: number;
  };
  selectedFoods: ProtocolFood[];
  preferences: DietaryPreferences;
  addTransaction: UseMutateFunction<void, Error, {
    amount: number;
    type: TransactionType;
    description?: string;
    recipientId?: string;
    qrCodeId?: string;
  }>;
}

export const generateMealPlan = async ({
  userData,
  selectedFoods,
  preferences,
  addTransaction
}: MealPlanGenerationProps) => {
  let toastId: string | number | undefined;

  try {
    console.log('Iniciando processo de geração com preferências:', preferences);
    
    const selectedFoodsDetails = selectedFoods.map(food => ({
      id: food.id,
      name: food.name,
      calories: food.calories,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fats: food.fats || 0,
      portion: food.portion || 100,
      portionUnit: food.portionUnit || 'g',
      food_group_id: food.food_group_id
    }));

    toastId = toast.loading("Gerando seu plano alimentar personalizado...");

    const { data: response, error: generateError } = await supabase.functions.invoke(
      'generate-meal-plan',
      {
        body: {
          userData: {
            weight: userData.weight,
            height: userData.height,
            age: userData.age,
            gender: userData.gender,
            activityLevel: userData.activityLevel,
            goal: userData.goal === "lose" ? "lose_weight" : userData.goal === "gain" ? "gain_weight" : "maintain",
            userId: userData.id,
            dailyCalories: userData.dailyCalories
          },
          selectedFoods: selectedFoodsDetails,
          dietaryPreferences: preferences
        }
      }
    );

    if (generateError || !response?.mealPlan) {
      console.error('Erro ao gerar plano:', generateError);
      throw new Error(generateError?.message || 'Falha ao gerar cardápio');
    }

    console.log('Resposta da Edge Function:', response);

    await addTransaction({
      amount: REWARDS.MEAL_PLAN,
      type: 'meal_plan',
      description: 'Geração de plano alimentar'
    });

    // Salvar os dados do plano
    try {
      await saveMealPlanData(userData.id, response.mealPlan, userData.dailyCalories, preferences);
      console.log('Dados do plano e preferências salvos com sucesso');
    } catch (saveError) {
      console.error('Erro ao salvar dados do plano:', saveError);
      // Não vamos interromper o fluxo se falhar ao salvar, apenas logar o erro
    }

    toast.dismiss(toastId);
    toast.success(`Cardápio personalizado gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);

    return response.mealPlan;
  } catch (error) {
    if (toastId) toast.dismiss(toastId);
    console.error('Erro na geração do plano:', error);
    throw error;
  }
};

const saveMealPlanData = async (userId: string, mealPlan: any, calories: number, preferences: DietaryPreferences) => {
  try {
    console.log('Iniciando salvamento das preferências dietéticas:', preferences);
    
    // Salvar preferências dietéticas
    const { error: dietaryError } = await supabase
      .from('dietary_preferences')
      .upsert({
        user_id: userId,
        has_allergies: preferences.hasAllergies || false,
        allergies: preferences.allergies || [],
        dietary_restrictions: preferences.dietaryRestrictions || [],
        training_time: preferences.trainingTime || null
      });

    if (dietaryError) {
      console.error('Erro ao salvar preferências:', dietaryError);
      throw dietaryError;
    }

    console.log('Preferências dietéticas salvas com sucesso');

    // Salvar plano alimentar
    const { error: saveError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        plan_data: mealPlan,
        calories: calories,
        dietary_preferences: {
          hasAllergies: preferences.hasAllergies || false,
          allergies: preferences.allergies || [],
          dietaryRestrictions: preferences.dietaryRestrictions || [],
          training_time: preferences.trainingTime || null
        }
      });

    if (saveError) {
      console.error('Erro ao salvar cardápio:', saveError);
      throw saveError;
    }

    console.log('Plano alimentar salvo com sucesso');
  } catch (error) {
    console.error('Erro ao salvar dados do plano:', error);
    throw error;
  }
};
