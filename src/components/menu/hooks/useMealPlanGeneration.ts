
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
    console.log('[MEAL PLAN] Iniciando processo de geração do plano personalizado');
    console.log('[MEAL PLAN] Dados do usuário:', {
      weight: userData.weight,
      height: userData.height,
      age: userData.age,
      gender: userData.gender,
      goal: userData.goal,
      dailyCalories: userData.dailyCalories
    });
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
    selectedFoodsDetails.forEach((food, index) => {
      console.log(`[MEAL PLAN] Alimento ${index + 1}: ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`);
    });

    toastId = toast.loading("Gerando seu plano alimentar personalizado...");

    console.log('[MEAL PLAN] Iniciando chamada para a Edge Function');
    
    // Mapear o objetivo para o formato esperado pela API
    const goalMapping = {
      "lose": "lose_weight",
      "gain": "gain_weight",
      "maintain": "maintain"
    };
    
    const mappedGoal = goalMapping[userData.goal as keyof typeof goalMapping] || "maintain";
    console.log(`[MEAL PLAN] Objetivo mapeado: ${userData.goal} -> ${mappedGoal}`);
    
    const payload = {
      userData: {
        weight: userData.weight,
        height: userData.height,
        age: userData.age,
        gender: userData.gender,
        activityLevel: userData.activityLevel,
        goal: mappedGoal,
        userId: userData.id,
        dailyCalories: userData.dailyCalories
      },
      selectedFoods: selectedFoodsDetails,
      dietaryPreferences: preferences
    };
    
    console.log('[MEAL PLAN] Enviando payload:', JSON.stringify(payload, null, 2));
    
    // Usando um objeto temporário para armazenar o resultado final
    let resultData = null;
    
    // Primeira tentativa - usar .then para evitar problemas com constantes
    try {
      console.log('[MEAL PLAN] Iniciando primeira tentativa');
      const firstResult = await supabase.functions.invoke('generate-meal-plan', { 
        body: payload 
      });
      
      if (firstResult.error) {
        console.error('[MEAL PLAN] Erro na Edge Function:', firstResult.error);
        console.error('[MEAL PLAN] Código do erro:', firstResult.error?.code);
        console.error('[MEAL PLAN] Mensagem completa:', firstResult.error?.message);
        throw new Error(firstResult.error.message || "Falha na chamada à Edge Function");
      }
      
      if (firstResult.data && firstResult.data.mealPlan) {
        console.log('[MEAL PLAN] Primeira tentativa bem-sucedida!');
        resultData = firstResult.data;
      } else {
        console.error('[MEAL PLAN] Resposta da primeira tentativa sem dados válidos');
        throw new Error("Resposta da primeira tentativa inválida");
      }
    } catch (firstAttemptError) {
      console.error('[MEAL PLAN] Erro capturado na primeira tentativa:', firstAttemptError);
      toast.dismiss(toastId);
      toast.error("Falha na geração do plano. Tentando novamente...");
      
      // Tentar novamente com ajustes no payload
      console.log('[MEAL PLAN] Tentando novamente com ajustes...');
      
      // Simplificar o payload para reduzir chances de erro
      const simplifiedPayload = {
        userData: {
          weight: Math.round(userData.weight),
          height: Math.round(userData.height),
          age: userData.age,
          gender: userData.gender === "male" ? "male" : "female",
          activityLevel: userData.activityLevel || "moderate",
          goal: mappedGoal,
          userId: userData.id,
          dailyCalories: Math.round(userData.dailyCalories)
        },
        selectedFoods: selectedFoodsDetails.slice(0, 30), // Limitar número de alimentos
        dietaryPreferences: {
          hasAllergies: preferences.hasAllergies || false,
          allergies: (preferences.allergies || []).slice(0, 5), // Limitar alergias
          dietaryRestrictions: (preferences.dietaryRestrictions || []).slice(0, 5), // Limitar restrições
          trainingTime: preferences.trainingTime
        }
      };
      
      console.log('[MEAL PLAN] Tentando com payload simplificado:', JSON.stringify(simplifiedPayload, null, 2));
      
      toastId = toast.loading("Otimizando seu plano alimentar...");
      
      // Segunda tentativa com payload simplificado
      try {
        console.log('[MEAL PLAN] Iniciando segunda tentativa');
        const secondResult = await supabase.functions.invoke('generate-meal-plan', { 
          body: simplifiedPayload 
        });
        
        if (secondResult.error) {
          console.error('[MEAL PLAN] Erro na segunda tentativa:', secondResult.error);
          toast.dismiss(toastId);
          toast.error("Não foi possível gerar seu plano personalizado. Por favor, tente novamente.");
          throw new Error(secondResult.error.message || "Falha na segunda tentativa");
        }
        
        if (!secondResult.data || !secondResult.data.mealPlan) {
          console.error('[MEAL PLAN] Resposta inválida na segunda tentativa:', secondResult.data);
          toast.dismiss(toastId);
          toast.error("Resposta inválida do servidor. Por favor, tente novamente.");
          throw new Error("Resposta inválida na segunda tentativa");
        }
        
        console.log('[MEAL PLAN] Segunda tentativa bem-sucedida!');
        resultData = secondResult.data;
      } catch (secondAttemptError) {
        console.error('[MEAL PLAN] Erro na segunda tentativa:', secondAttemptError);
        toast.dismiss(toastId);
        toast.error("Não foi possível gerar seu plano personalizado. Por favor, tente novamente.");
        throw secondAttemptError;
      }
    }

    // Validar que temos dados resultantes
    if (!resultData || !resultData.mealPlan) {
      console.error('[MEAL PLAN] Resposta final inválida:', JSON.stringify(resultData, null, 2));
      toast.dismiss(toastId);
      toast.error("Resposta inválida do servidor. Por favor, tente novamente.");
      throw new Error("Resposta final inválida");
    }

    console.log('[MEAL PLAN] Resposta recebida com sucesso');
    console.log('[MEAL PLAN] Estrutura do plano:', Object.keys(resultData.mealPlan).join(', '));

    // Verificar se o plano tem a estrutura esperada
    if (!resultData.mealPlan.weeklyPlan || !resultData.mealPlan.recommendations) {
      console.error('[MEAL PLAN] Estrutura do plano incompleta:', JSON.stringify(resultData.mealPlan, null, 2));
      toast.dismiss(toastId);
      toast.error("Plano gerado com estrutura incompleta. Por favor, tente novamente.");
      throw new Error("Estrutura do plano incompleta");
    }

    // Verificar se todos os dias da semana estão presentes
    const requiredDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const missingDays = requiredDays.filter(day => !resultData.mealPlan.weeklyPlan[day]);
    
    if (missingDays.length > 0) {
      console.error(`[MEAL PLAN] Dias ausentes no plano: ${missingDays.join(', ')}`);
      // Tentar completar os dias faltantes copiando de outros dias existentes
      const availableDays = requiredDays.filter(day => resultData.mealPlan.weeklyPlan[day]);
      
      if (availableDays.length > 0) {
        const templateDay = resultData.mealPlan.weeklyPlan[availableDays[0]];
        
        missingDays.forEach(missingDay => {
          console.log(`[MEAL PLAN] Copiando dia ${availableDays[0]} para ${missingDay}`);
          resultData.mealPlan.weeklyPlan[missingDay] = JSON.parse(JSON.stringify(templateDay));
          resultData.mealPlan.weeklyPlan[missingDay].dayName = missingDay.charAt(0).toUpperCase() + missingDay.slice(1);
        });
        
        console.log('[MEAL PLAN] Dias faltantes foram complementados');
      } else {
        toast.dismiss(toastId);
        toast.error("Plano incompleto gerado. Por favor, tente novamente.");
        throw new Error("Nenhum dia válido encontrado no plano");
      }
    }

    // Adicionar a transação de recompensa
    await addTransaction({
      amount: REWARDS.MEAL_PLAN,
      type: 'meal_plan',
      description: 'Geração de plano alimentar personalizado'
    });

    console.log('[MEAL PLAN] Transação de recompensa adicionada');

    // Salvar os dados do plano
    await saveMealPlanData(userData.id, resultData.mealPlan, userData.dailyCalories, preferences);
    console.log('[MEAL PLAN] Dados do plano e preferências salvos com sucesso');

    toast.dismiss(toastId);
    toast.success(`Cardápio personalizado gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);

    return resultData.mealPlan;
  } catch (error) {
    if (toastId) toast.dismiss(toastId);
    
    // Log de erro detalhado
    console.error('[MEAL PLAN] Erro crítico na geração do plano personalizado:');
    if (error instanceof Error) {
      console.error('[MEAL PLAN] Nome do erro:', error.name);
      console.error('[MEAL PLAN] Mensagem:', error.message);
      console.error('[MEAL PLAN] Stack trace:', error.stack);
    } else {
      console.error('[MEAL PLAN] Erro não padronizado:', JSON.stringify(error, null, 2));
    }
    
    toast.error("Não foi possível gerar o plano alimentar personalizado. Por favor, tente novamente mais tarde.");
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
