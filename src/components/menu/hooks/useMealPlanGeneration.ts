
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
    console.log('[MEAL PLAN] Iniciando processo de geração');
    console.log('[MEAL PLAN] Preferências:', JSON.stringify(preferences, null, 2));
    
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

    console.log(`[MEAL PLAN] Total de alimentos selecionados: ${selectedFoodsDetails.length}`);

    toastId = toast.loading("Gerando seu plano alimentar personalizado...");

    console.log('[MEAL PLAN] Enviando requisição para a Edge Function');
    
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

    // Registro detalhado em caso de erro na Edge Function
    if (generateError) {
      console.error('[MEAL PLAN] Erro na Edge Function:', generateError);
      console.error('[MEAL PLAN] Código do erro:', generateError.code);
      console.error('[MEAL PLAN] Mensagem completa:', generateError.message);
      console.error('[MEAL PLAN] Detalhes adicionais:', JSON.stringify(generateError, null, 2));
      throw new Error(generateError?.message || 'Falha ao gerar cardápio');
    }

    // Validação e registro da resposta
    if (!response) {
      console.error('[MEAL PLAN] Resposta nula da Edge Function');
      throw new Error('Não foi possível obter resposta do servidor');
    }
    
    if (!response.mealPlan) {
      console.error('[MEAL PLAN] Resposta sem plano alimentar:', JSON.stringify(response, null, 2));
      throw new Error('Plano alimentar não encontrado na resposta');
    }

    console.log('[MEAL PLAN] Resposta recebida com sucesso');
    console.log('[MEAL PLAN] Estrutura do plano:', Object.keys(response.mealPlan).join(', '));

    await addTransaction({
      amount: REWARDS.MEAL_PLAN,
      type: 'meal_plan',
      description: 'Geração de plano alimentar'
    });

    console.log('[MEAL PLAN] Transação de recompensa adicionada');

    // Salvar os dados do plano
    try {
      await saveMealPlanData(userData.id, response.mealPlan, userData.dailyCalories, preferences);
      console.log('[MEAL PLAN] Dados do plano e preferências salvos com sucesso');
    } catch (saveError) {
      console.error('[MEAL PLAN] Erro ao salvar dados do plano:', saveError);
      // Captura e exibe detalhes do erro, mas não interrompe o fluxo
      if (saveError instanceof Error) {
        console.error('[MEAL PLAN] Mensagem de erro:', saveError.message);
        console.error('[MEAL PLAN] Stack trace:', saveError.stack);
      } else {
        console.error('[MEAL PLAN] Erro desconhecido:', saveError);
      }
      // Não vamos interromper o fluxo se falhar ao salvar, apenas logar o erro
    }

    toast.dismiss(toastId);
    toast.success(`Cardápio personalizado gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);

    return response.mealPlan;
  } catch (error) {
    if (toastId) toast.dismiss(toastId);
    
    // Log de erro detalhado
    console.error('[MEAL PLAN] Erro crítico na geração do plano:');
    if (error instanceof Error) {
      console.error('[MEAL PLAN] Nome do erro:', error.name);
      console.error('[MEAL PLAN] Mensagem:', error.message);
      console.error('[MEAL PLAN] Stack trace:', error.stack);
    } else {
      console.error('[MEAL PLAN] Erro não padronizado:', JSON.stringify(error, null, 2));
    }
    
    toast.error("Não foi possível gerar o plano alimentar. Por favor, tente novamente.");
    throw error;
  }
};

const saveMealPlanData = async (userId: string, mealPlan: any, calories: number, preferences: DietaryPreferences) => {
  try {
    console.log('[MEAL PLAN/DB] Iniciando salvamento das preferências dietéticas');
    
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
      console.error('[MEAL PLAN/DB] Erro ao salvar preferências:', dietaryError);
      console.error('[MEAL PLAN/DB] Código:', dietaryError.code);
      console.error('[MEAL PLAN/DB] Detalhes:', dietaryError.details);
      console.error('[MEAL PLAN/DB] Mensagem:', dietaryError.message);
      throw dietaryError;
    }

    console.log('[MEAL PLAN/DB] Preferências dietéticas salvas com sucesso');

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
      console.error('[MEAL PLAN/DB] Erro ao salvar cardápio:', saveError);
      console.error('[MEAL PLAN/DB] Código:', saveError.code);
      console.error('[MEAL PLAN/DB] Detalhes:', saveError.details);
      console.error('[MEAL PLAN/DB] Mensagem:', saveError.message);
      throw saveError;
    }

    console.log('[MEAL PLAN/DB] Plano alimentar salvo com sucesso');
  } catch (error) {
    console.error('[MEAL PLAN/DB] Erro ao salvar dados do plano:');
    if (error instanceof Error) {
      console.error('[MEAL PLAN/DB] Nome do erro:', error.name);
      console.error('[MEAL PLAN/DB] Mensagem:', error.message);
      console.error('[MEAL PLAN/DB] Stack trace:', error.stack);
    } else {
      console.error('[MEAL PLAN/DB] Erro não padronizado:', JSON.stringify(error, null, 2));
    }
    throw error;
  }
};
