
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

    const { data: generatedPlan, error: generateError } = await supabase.functions.invoke(
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

    if (generateError || !generatedPlan?.mealPlan) {
      throw new Error(generateError?.message || 'Falha ao gerar cardápio');
    }

    await addTransaction({
      amount: REWARDS.MEAL_PLAN,
      type: 'meal_plan',
      description: 'Geração de plano alimentar'
    });

    await saveMealPlanData(userData.id, generatedPlan.mealPlan, userData.dailyCalories, preferences);

    toast.dismiss(toastId);
    toast.success(`Cardápio personalizado gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);

    return generatedPlan.mealPlan;
  } catch (error) {
    if (toastId) toast.dismiss(toastId);
    throw error;
  }
};

const saveMealPlanData = async (userId: string, mealPlan: any, calories: number, preferences: DietaryPreferences) => {
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
  }

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
  }
};
