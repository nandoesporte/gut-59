
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
    
    // Vamos gerar um plano de refeições de fallback para casos onde a API falha
    const fallbackMealPlan = generateFallbackMealPlan(userData.dailyCalories, selectedFoodsDetails);
    
    try {
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
        console.error('[MEAL PLAN] Código do erro:', generateError?.code);
        console.error('[MEAL PLAN] Mensagem completa:', generateError?.message);
        
        // Usar plano de fallback se a edge function falhar
        console.log('[MEAL PLAN] Usando plano de fallback devido a erro na função Edge');
        
        await addTransaction({
          amount: REWARDS.MEAL_PLAN,
          type: 'meal_plan',
          description: 'Geração de plano alimentar (simplificado)'
        });
        
        await saveMealPlanData(userData.id, fallbackMealPlan, userData.dailyCalories, preferences);
        
        toast.dismiss(toastId);
        toast.success(`Cardápio básico gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);
        
        return fallbackMealPlan;
      }

      // Validação e registro da resposta
      if (!response || !response.mealPlan) {
        console.error('[MEAL PLAN] Resposta sem plano alimentar:', JSON.stringify(response, null, 2));
        
        // Usar plano de fallback
        console.log('[MEAL PLAN] Usando plano de fallback devido a resposta inválida');
        
        await addTransaction({
          amount: REWARDS.MEAL_PLAN,
          type: 'meal_plan',
          description: 'Geração de plano alimentar (simplificado)'
        });
        
        await saveMealPlanData(userData.id, fallbackMealPlan, userData.dailyCalories, preferences);
        
        toast.dismiss(toastId);
        toast.success(`Cardápio básico gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);
        
        return fallbackMealPlan;
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
      await saveMealPlanData(userData.id, response.mealPlan, userData.dailyCalories, preferences);
      console.log('[MEAL PLAN] Dados do plano e preferências salvos com sucesso');

      toast.dismiss(toastId);
      toast.success(`Cardápio personalizado gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);

      return response.mealPlan;
    } catch (edgeFunctionError) {
      // Tratamento de erro para falhas na invocação da função Edge
      console.error('[MEAL PLAN] Erro ao chamar Edge Function:', edgeFunctionError);
      
      // Usar o plano de fallback
      console.log('[MEAL PLAN] Usando plano de fallback devido à exceção');
      
      await addTransaction({
        amount: REWARDS.MEAL_PLAN,
        type: 'meal_plan',
        description: 'Geração de plano alimentar (simplificado)'
      });
      
      await saveMealPlanData(userData.id, fallbackMealPlan, userData.dailyCalories, preferences);
      
      toast.dismiss(toastId);
      toast.success(`Cardápio básico gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);
      
      return fallbackMealPlan;
    }
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

// Função para gerar um plano de refeições fallback
const generateFallbackMealPlan = (dailyCalories: number, foods: any[]) => {
  // Classificar os alimentos por grupo
  const foodGroups: Record<number, any[]> = {};
  
  foods.forEach(food => {
    const groupId = food.food_group_id || 1;
    if (!foodGroups[groupId]) {
      foodGroups[groupId] = [];
    }
    foodGroups[groupId].push(food);
  });
  
  // Criar uma refeição com base nos alimentos disponíveis
  const createMeal = (mealType: string, targetCalories: number) => {
    const mealFoods = [];
    let caloriesUsed = 0;
    const targetProteins = mealType === "lunch" || mealType === "dinner" ? 30 : 15;
    
    // Adicionar proteínas (grupo 2 ou 4)
    const proteinFoods = [...(foodGroups[2] || []), ...(foodGroups[4] || [])];
    if (proteinFoods.length > 0) {
      const protein = proteinFoods[Math.floor(Math.random() * proteinFoods.length)];
      mealFoods.push({
        name: protein.name,
        portion: 100,
        unit: "g",
        details: "Proteína"
      });
      caloriesUsed += protein.calories;
    }
    
    // Adicionar carboidratos (grupo 1)
    const carbFoods = foodGroups[1] || [];
    if (carbFoods.length > 0) {
      const carb = carbFoods[Math.floor(Math.random() * carbFoods.length)];
      mealFoods.push({
        name: carb.name,
        portion: 100,
        unit: "g",
        details: "Carboidrato"
      });
      caloriesUsed += carb.calories;
    }
    
    // Adicionar vegetais (grupo 3)
    const vegFoods = foodGroups[3] || [];
    if (vegFoods.length > 0 && (mealType === "lunch" || mealType === "dinner")) {
      const veg = vegFoods[Math.floor(Math.random() * vegFoods.length)];
      mealFoods.push({
        name: veg.name,
        portion: 100,
        unit: "g",
        details: "Vegetal/Fruta"
      });
      caloriesUsed += veg.calories;
    }
    
    if (mealFoods.length === 0) {
      // Fallback se não há alimentos classificados
      mealFoods.push({
        name: mealType === "breakfast" ? "Pão integral" : 
              mealType === "lunch" || mealType === "dinner" ? "Arroz e frango" : "Fruta",
        portion: 1,
        unit: "porção",
        details: "Alimento base"
      });
      caloriesUsed = targetCalories;
    }
    
    // Criar descrição da refeição
    const description = mealFoods.length > 1 
      ? `${mealFoods[0].name} com ${mealFoods.slice(1).map(f => f.name).join(" e ")}`
      : mealFoods[0].name;
    
    return {
      description,
      foods: mealFoods,
      calories: caloriesUsed,
      macros: {
        protein: targetProteins,
        carbs: caloriesUsed * 0.5 / 4, // Estimativa: 50% das calorias de carboidratos
        fats: caloriesUsed * 0.3 / 9,  // Estimativa: 30% das calorias de gorduras
        fiber: 5 // Valor padrão
      }
    };
  };
  
  // Calcular calorias por refeição
  const breakfastCalories = Math.round(dailyCalories * 0.2);
  const lunchCalories = Math.round(dailyCalories * 0.35);
  const dinnerCalories = Math.round(dailyCalories * 0.25);
  const snackCalories = Math.round(dailyCalories * 0.1);
  
  // Criar um dia de plano de refeições
  const createDayPlan = (dayName: string) => {
    const breakfast = createMeal("breakfast", breakfastCalories);
    const morningSnack = createMeal("morningSnack", snackCalories);
    const lunch = createMeal("lunch", lunchCalories);
    const afternoonSnack = createMeal("afternoonSnack", snackCalories);
    const dinner = createMeal("dinner", dinnerCalories);
    
    const totalCalories = breakfast.calories + morningSnack.calories + 
                         lunch.calories + afternoonSnack.calories + dinner.calories;
    
    return {
      dayName,
      meals: {
        breakfast,
        morningSnack,
        lunch,
        afternoonSnack,
        dinner
      },
      dailyTotals: {
        calories: totalCalories,
        protein: breakfast.macros.protein + morningSnack.macros.protein + 
                lunch.macros.protein + afternoonSnack.macros.protein + dinner.macros.protein,
        carbs: breakfast.macros.carbs + morningSnack.macros.carbs + 
              lunch.macros.carbs + afternoonSnack.macros.carbs + dinner.macros.carbs,
        fats: breakfast.macros.fats + morningSnack.macros.fats + 
             lunch.macros.fats + afternoonSnack.macros.fats + dinner.macros.fats,
        fiber: breakfast.macros.fiber + morningSnack.macros.fiber + 
              lunch.macros.fiber + afternoonSnack.macros.fiber + dinner.macros.fiber,
      }
    };
  };
  
  // Criar o plano para a semana
  const weekdays = ["Segunda-feira", "Terça-feira", "Quarta-feira", 
                    "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  const weekdaysEn = ["monday", "tuesday", "wednesday", 
                      "thursday", "friday", "saturday", "sunday"];
  
  const weeklyPlan: Record<string, any> = {};
  
  weekdaysEn.forEach((day, index) => {
    weeklyPlan[day] = createDayPlan(weekdays[index]);
  });
  
  // Calcular médias semanais
  const weeklyTotals = {
    averageCalories: Math.round(Object.values(weeklyPlan).reduce((sum, day) => sum + day.dailyTotals.calories, 0) / 7),
    averageProtein: Math.round(Object.values(weeklyPlan).reduce((sum, day) => sum + day.dailyTotals.protein, 0) / 7),
    averageCarbs: Math.round(Object.values(weeklyPlan).reduce((sum, day) => sum + day.dailyTotals.carbs, 0) / 7),
    averageFats: Math.round(Object.values(weeklyPlan).reduce((sum, day) => sum + day.dailyTotals.fats, 0) / 7),
    averageFiber: Math.round(Object.values(weeklyPlan).reduce((sum, day) => sum + day.dailyTotals.fiber, 0) / 7)
  };
  
  // Recomendações
  const recommendations = {
    general: "Mantenha-se hidratado bebendo bastante água ao longo do dia.",
    preworkout: "Consuma carboidratos 1-2h antes do treino para energia.",
    postworkout: "Consuma proteínas e carboidratos após o treino para recuperação.",
    timing: ["Faça 5-6 refeições por dia", "Evite refeições pesadas antes de dormir"]
  };
  
  return {
    weeklyPlan,
    weeklyTotals,
    recommendations
  };
};
