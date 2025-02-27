
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
  let mealPlanResponse: any = null;

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
    
    // Primeiro, tentamos gerar o plano completo
    try {
      const { data: firstResponse, error: generateError } = await supabase.functions.invoke(
        'generate-meal-plan',
        { body: payload }
      );

      // Verificamos se a resposta foi bem-sucedida
      if (!generateError && firstResponse && firstResponse.mealPlan) {
        console.log('[MEAL PLAN] Primeira tentativa bem-sucedida');
        mealPlanResponse = firstResponse;
      } else {
        // Se houver erro, tentamos uma abordagem simplificada
        console.error('[MEAL PLAN] Erro na primeira tentativa:', generateError);
        if (generateError) {
          console.error('[MEAL PLAN] Código do erro:', generateError.code);
          console.error('[MEAL PLAN] Mensagem completa:', generateError.message);
        }
        if (!firstResponse || !firstResponse.mealPlan) {
          console.error('[MEAL PLAN] Resposta inválida na primeira tentativa');
        }
        
        throw new Error("Falha na primeira tentativa");
      }
    } catch (firstError) {
      console.log('[MEAL PLAN] Capturado erro na primeira tentativa, tentando novamente com payload simplificado');
      toast.dismiss(toastId);
      toastId = toast.loading("Otimizando seu plano alimentar...");
      
      // Simplificar o payload para a segunda tentativa
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
          allergies: (preferences.allergies || []).slice(0, 5),
          dietaryRestrictions: (preferences.dietaryRestrictions || []).slice(0, 5),
          trainingTime: preferences.trainingTime
        }
      };
      
      console.log('[MEAL PLAN] Tentando com payload simplificado:', JSON.stringify(simplifiedPayload, null, 2));
      
      // Segunda tentativa com payload simplificado
      try {
        const { data: retryResponse, error: retryError } = await supabase.functions.invoke(
          'generate-meal-plan',
          { body: simplifiedPayload }
        );
        
        if (retryError || !retryResponse || !retryResponse.mealPlan) {
          console.error('[MEAL PLAN] Erro na segunda tentativa:', retryError || "Resposta inválida");
          toast.dismiss(toastId);
          toast.error("Não foi possível gerar seu plano personalizado. Por favor, tente novamente.");
          throw new Error(retryError?.message || "Falha na geração do plano personalizado");
        }
        
        console.log('[MEAL PLAN] Segunda tentativa bem-sucedida!');
        mealPlanResponse = retryResponse;
      } catch (retryAttemptError) {
        console.error('[MEAL PLAN] Erro na segunda tentativa completa:', retryAttemptError);
        toast.dismiss(toastId);
        
        // Como última tentativa, criamos um plano alimentar simplificado localmente
        try {
          console.log('[MEAL PLAN] Gerando plano simplificado localmente...');
          mealPlanResponse = generateSimplifiedMealPlan(selectedFoodsDetails, userData.dailyCalories);
          toastId = toast.loading("Finalizando plano alimentar...");
        } catch (localGenerationError) {
          console.error('[MEAL PLAN] Falha na geração local:', localGenerationError);
          toast.error("Não foi possível gerar seu plano. Tente novamente mais tarde.");
          throw new Error("Todas as tentativas de geração falharam");
        }
      }
    }

    // Validação da resposta
    if (!mealPlanResponse || !mealPlanResponse.mealPlan) {
      console.error('[MEAL PLAN] Resposta final inválida:', JSON.stringify(mealPlanResponse, null, 2));
      toast.dismiss(toastId);
      toast.error("Resposta inválida do servidor. Por favor, tente novamente.");
      throw new Error("Resposta inválida do servidor");
    }

    console.log('[MEAL PLAN] Resposta recebida com sucesso');
    console.log('[MEAL PLAN] Estrutura do plano:', Object.keys(mealPlanResponse.mealPlan).join(', '));

    // Verificar se o plano tem a estrutura esperada e completar se necessário
    if (!mealPlanResponse.mealPlan.weeklyPlan) {
      console.error('[MEAL PLAN] Plano sem estrutura semanal. Criando estrutura básica...');
      mealPlanResponse.mealPlan.weeklyPlan = createBasicWeeklyPlan(selectedFoodsDetails);
    }
    
    if (!mealPlanResponse.mealPlan.recommendations) {
      console.log('[MEAL PLAN] Adicionando recomendações padrão');
      mealPlanResponse.mealPlan.recommendations = generateDefaultRecommendations(userData.goal);
    }

    // Verificar se todos os dias da semana estão presentes
    const requiredDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const missingDays = requiredDays.filter(day => !mealPlanResponse.mealPlan.weeklyPlan[day]);
    
    if (missingDays.length > 0) {
      console.log(`[MEAL PLAN] Dias ausentes no plano: ${missingDays.join(', ')}`);
      // Tentar completar os dias faltantes copiando de outros dias existentes
      const availableDays = requiredDays.filter(day => mealPlanResponse.mealPlan.weeklyPlan[day]);
      
      if (availableDays.length > 0) {
        const templateDay = mealPlanResponse.mealPlan.weeklyPlan[availableDays[0]];
        
        missingDays.forEach(missingDay => {
          console.log(`[MEAL PLAN] Copiando dia ${availableDays[0]} para ${missingDay}`);
          mealPlanResponse.mealPlan.weeklyPlan[missingDay] = JSON.parse(JSON.stringify(templateDay));
          mealPlanResponse.mealPlan.weeklyPlan[missingDay].dayName = missingDay.charAt(0).toUpperCase() + missingDay.slice(1);
        });
        
        console.log('[MEAL PLAN] Dias faltantes foram complementados');
      } else {
        console.log('[MEAL PLAN] Nenhum dia disponível para copiar, criando estrutura básica...');
        requiredDays.forEach(day => {
          if (!mealPlanResponse.mealPlan.weeklyPlan[day]) {
            mealPlanResponse.mealPlan.weeklyPlan[day] = createBasicDayPlan(day, selectedFoodsDetails);
          }
        });
      }
    }

    // Verificar meal-by-meal e adicionar totais diários se necessário
    requiredDays.forEach(day => {
      const dayPlan = mealPlanResponse.mealPlan.weeklyPlan[day];
      if (!dayPlan.meals) {
        dayPlan.meals = createBasicMeals(selectedFoodsDetails);
      }
      
      if (!dayPlan.dailyTotals) {
        dayPlan.dailyTotals = calculateDailyTotals(dayPlan.meals);
      }
    });

    // Adicionar totais semanais se não existirem
    if (!mealPlanResponse.mealPlan.weeklyTotals) {
      mealPlanResponse.mealPlan.weeklyTotals = calculateWeeklyTotals(mealPlanResponse.mealPlan.weeklyPlan);
    }

    // Adicionar a transação de recompensa
    await addTransaction({
      amount: REWARDS.MEAL_PLAN,
      type: 'meal_plan',
      description: 'Geração de plano alimentar personalizado'
    });

    console.log('[MEAL PLAN] Transação de recompensa adicionada');

    // Salvar os dados do plano
    await saveMealPlanData(userData.id, mealPlanResponse.mealPlan, userData.dailyCalories, preferences);
    console.log('[MEAL PLAN] Dados do plano e preferências salvos com sucesso');

    toast.dismiss(toastId);
    toast.success(`Cardápio personalizado gerado com sucesso! +${REWARDS.MEAL_PLAN} FITs`);

    return mealPlanResponse.mealPlan;
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

// Funções auxiliares para geração de plano simplificado

function generateSimplifiedMealPlan(foods: any[], dailyCalories: number) {
  console.log('[MEAL PLAN] Gerando plano simplificado com', foods.length, 'alimentos');
  
  // Criar estrutura básica do plano
  const weeklyPlan = {
    monday: createBasicDayPlan('monday', foods),
    tuesday: createBasicDayPlan('tuesday', foods),
    wednesday: createBasicDayPlan('wednesday', foods),
    thursday: createBasicDayPlan('thursday', foods),
    friday: createBasicDayPlan('friday', foods),
    saturday: createBasicDayPlan('saturday', foods),
    sunday: createBasicDayPlan('sunday', foods)
  };
  
  // Totais semanais
  const weeklyTotals = calculateWeeklyTotals(weeklyPlan);
  
  // Recomendações básicas
  const recommendations = generateDefaultRecommendations('maintain');
  
  return {
    mealPlan: {
      weeklyPlan,
      weeklyTotals,
      recommendations
    }
  };
}

function createBasicWeeklyPlan(foods: any[]) {
  return {
    monday: createBasicDayPlan('monday', foods),
    tuesday: createBasicDayPlan('tuesday', foods),
    wednesday: createBasicDayPlan('wednesday', foods),
    thursday: createBasicDayPlan('thursday', foods),
    friday: createBasicDayPlan('friday', foods),
    saturday: createBasicDayPlan('saturday', foods),
    sunday: createBasicDayPlan('sunday', foods)
  };
}

function createBasicDayPlan(day: string, foods: any[]) {
  const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
  const meals = createBasicMeals(foods);
  const dailyTotals = calculateDailyTotals(meals);
  
  return {
    dayName: capitalizedDay,
    meals,
    dailyTotals
  };
}

function createBasicMeals(foods: any[]) {
  // Categorizar alimentos
  const proteins = foods.filter(f => f.protein > 10);
  const carbs = foods.filter(f => f.carbs > 10);
  const fats = foods.filter(f => f.fats > 5);
  const fruits = foods.filter(f => f.name.toLowerCase().includes('fruta') || f.food_group_id === 3);
  
  // Se não tivermos alimentos suficientes nas categorias, usamos alimentos aleatórios
  const getRandomFood = (list: any[], fallback: any[]) => {
    const sourceList = list.length > 0 ? list : fallback;
    return sourceList[Math.floor(Math.random() * sourceList.length)];
  };
  
  // Criamos refeições básicas com base nos alimentos disponíveis
  const createMeal = (name: string, numberOfFoods = 3) => {
    const mealFoods = [];
    
    // Tentamos incluir proteína
    if (proteins.length > 0) {
      mealFoods.push(getRandomFood(proteins, foods));
    }
    
    // Tentamos incluir carboidratos
    if (carbs.length > 0) {
      mealFoods.push(getRandomFood(carbs, foods));
    }
    
    // Adicionamos alimentos adicionais se necessário
    while (mealFoods.length < numberOfFoods && foods.length > 0) {
      const randomFood = foods[Math.floor(Math.random() * foods.length)];
      // Verificar se o alimento já está incluído
      if (!mealFoods.some(f => f.id === randomFood.id)) {
        mealFoods.push(randomFood);
      }
    }
    
    // Calcular macros totais da refeição
    const macros = {
      protein: mealFoods.reduce((sum, food) => sum + (food.protein || 0), 0),
      carbs: mealFoods.reduce((sum, food) => sum + (food.carbs || 0), 0),
      fats: mealFoods.reduce((sum, food) => sum + (food.fats || 0), 0),
      fiber: 5 // Valor padrão de fibras
    };
    
    // Calcular calorias
    const calories = (macros.protein * 4) + (macros.carbs * 4) + (macros.fats * 9);
    
    // Gerar nome da refeição baseado nos alimentos
    const description = mealFoods.length > 0 
      ? `${mealFoods[0].name}${mealFoods.length > 1 ? ` com ${mealFoods[1].name}` : ''}${mealFoods.length > 2 ? ` e ${mealFoods[2].name}` : ''}`
      : name;
    
    return {
      foods: mealFoods.map(food => ({
        name: food.name,
        unit: food.portionUnit || "g",
        details: food.protein > 15 ? "Proteína" : (food.carbs > 15 ? "Carboidrato" : "Vegetal/Fruta"),
        portion: 100
      })),
      macros,
      calories,
      description
    };
  };
  
  return {
    breakfast: createMeal("Café da Manhã", 2),
    morningSnack: createMeal("Lanche da Manhã", 2),
    lunch: createMeal("Almoço", 3),
    afternoonSnack: createMeal("Lanche da Tarde", 2),
    dinner: createMeal("Jantar", 3)
  };
}

function calculateDailyTotals(meals: any) {
  // Somar macros e calorias de todas as refeições
  const dailyTotals = {
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    calories: 0
  };
  
  // Verificar cada refeição
  Object.values(meals).forEach((meal: any) => {
    if (meal && meal.macros) {
      dailyTotals.protein += meal.macros.protein || 0;
      dailyTotals.carbs += meal.macros.carbs || 0;
      dailyTotals.fats += meal.macros.fats || 0;
      dailyTotals.fiber += meal.macros.fiber || 0;
      dailyTotals.calories += meal.calories || 0;
    }
  });
  
  return dailyTotals;
}

function calculateWeeklyTotals(weeklyPlan: any) {
  // Inicializar acumuladores
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalFiber = 0;
  let totalCalories = 0;
  const daysCount = Object.keys(weeklyPlan).length || 7;
  
  // Somar totais de cada dia
  Object.values(weeklyPlan).forEach((day: any) => {
    if (day && day.dailyTotals) {
      totalProtein += day.dailyTotals.protein || 0;
      totalCarbs += day.dailyTotals.carbs || 0;
      totalFats += day.dailyTotals.fats || 0;
      totalFiber += day.dailyTotals.fiber || 0;
      totalCalories += day.dailyTotals.calories || 0;
    }
  });
  
  // Calcular médias
  return {
    averageProtein: totalProtein / daysCount,
    averageCarbs: totalCarbs / daysCount,
    averageFats: totalFats / daysCount,
    averageFiber: totalFiber / daysCount,
    averageCalories: totalCalories / daysCount
  };
}

function generateDefaultRecommendations(goal: string) {
  // Recomendações básicas
  const generalTips = [
    "Beba pelo menos 2 litros de água por dia",
    "Priorize alimentos integrais e minimamente processados",
    "Inclua fontes de proteína em todas as refeições",
    "Consuma pelo menos 2 porções de frutas e 3 de vegetais diariamente"
  ];
  
  // Recomendações específicas por objetivo
  let specificTips = [];
  
  if (goal === 'lose' || goal === 'lose_weight') {
    specificTips = [
      "Evite bebidas açucaradas, inclusive sucos de frutas",
      "Reduza o consumo de carboidratos refinados (pães, massas e doces)",
      "Aumente o consumo de proteínas para ajudar na saciedade",
      "Prefira métodos de cocção com menos gordura (cozido, assado, grelhado)"
    ];
  } else if (goal === 'gain' || goal === 'gain_weight') {
    specificTips = [
      "Aumente o tamanho das porções gradualmente",
      "Consuma alimentos calóricos saudáveis como abacate, azeite e oleaginosas",
      "Inclua lanches entre as refeições principais",
      "Considere shakes proteicos caseiros com frutas, leite e aveia"
    ];
  } else {
    specificTips = [
      "Mantenha regularidade nos horários das refeições",
      "Equilibre o consumo de proteínas, carboidratos e gorduras saudáveis",
      "Preste atenção aos sinais de fome e saciedade",
      "Faça refeições variadas para garantir todos os nutrientes"
    ];
  }
  
  return {
    general: generalTips,
    specific: specificTips,
    hydration: "Mantenha-se bem hidratado bebendo água regularmente ao longo do dia",
    supplements: "Consulte um profissional de saúde antes de iniciar suplementação"
  };
}

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
