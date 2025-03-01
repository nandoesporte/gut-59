import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DietaryPreferences, ProtocolFood } from "../types";
import { REWARDS } from '@/constants/rewards';
import type { TransactionType } from "@/types/wallet";
import type { UseMutateFunction } from "@tanstack/react-query";
import { searchFoodNutrition, convertNutritionixToProtocolFood } from "../utils/nutritionix-api";

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
  foodsByMealType?: Record<string, string[]>; // Alimentos categorizados por refeição
  preferences: DietaryPreferences;
  addTransaction: UseMutateFunction<void, Error, {
    amount: number;
    type: TransactionType;
    description?: string;
    recipientId?: string;
    qrCodeId?: string;
  }>;
}

// Interface para a resposta da edge function
interface EdgeFunctionResponse {
  mealPlan: any;
  [key: string]: any;
}

export const generateMealPlan = async ({
  userData,
  selectedFoods,
  foodsByMealType,
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
    console.log('[MEAL PLAN] Alimentos por refeição:', foodsByMealType);
    
    // Tentar enriquecer os dados nutricionais dos alimentos selecionados
    console.log('[MEAL PLAN] Verificando dados nutricionais precisos...');
    let enhancedFoods = [...selectedFoods];
    
    try {
      // Apenas para os primeiros alimentos (para não sobrecarregar a API)
      for (let i = 0; i < Math.min(5, selectedFoods.length); i++) {
        const food = selectedFoods[i];
        const nutritionData = await searchFoodNutrition(food.name);
        
        if (nutritionData && nutritionData.length > 0) {
          const enhancedFood = {
            ...food,
            calories: nutritionData[0].nf_calories ? Math.round(nutritionData[0].nf_calories) : food.calories,
            protein: nutritionData[0].nf_protein ? Math.round(nutritionData[0].nf_protein) : food.protein || 0,
            carbs: nutritionData[0].nf_total_carbohydrate ? Math.round(nutritionData[0].nf_total_carbohydrate) : food.carbs || 0,
            fats: nutritionData[0].nf_total_fat ? Math.round(nutritionData[0].nf_total_fat) : food.fats || 0,
            fiber: nutritionData[0].nf_dietary_fiber ? Math.round(nutritionData[0].nf_dietary_fiber) : food.fiber || 0,
            nutritionix_data: {
              serving_unit: nutritionData[0].serving_unit,
              serving_qty: nutritionData[0].serving_qty,
              serving_weight_grams: nutritionData[0].serving_weight_grams
            }
          };
          
          enhancedFoods[i] = enhancedFood;
          console.log(`[MEAL PLAN] Dados de ${food.name} enriquecidos com Nutritionix`);
        }
      }
    } catch (nutritionError) {
      console.error('[MEAL PLAN] Erro ao buscar dados nutricionais:', nutritionError);
      // Continuar com os dados originais
    }

    const selectedFoodsDetails = enhancedFoods.map(food => ({
      id: food.id,
      name: food.name,
      calories: food.calories,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fats: food.fats || 0,
      fiber: food.fiber || 0,
      portion: food.portion || 100,
      portionUnit: food.portionUnit || 'g',
      food_group_id: food.food_group_id,
      nutritionix_data: food.nutritionix_data
    }));

    console.log(`[MEAL PLAN] Total de alimentos selecionados: ${selectedFoodsDetails.length}`);
    selectedFoodsDetails.forEach((food, index) => {
      if (index < 5) { // Limitando o log para não sobrecarregar
        console.log(`[MEAL PLAN] Alimento ${index + 1}: ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`);
      }
    });

    // Alteração: Usamos Groq como modelo principal para maior confiabilidade
    toastId = toast.loading("Gerando seu plano alimentar personalizado com Groq...");

    console.log('[MEAL PLAN] Iniciando chamada para a Edge Function com modelo Groq');
    
    // Mapear o objetivo para o formato esperado pela API
    const goalMapping = {
      "lose": "lose_weight",
      "gain": "gain_weight",
      "maintain": "maintain"
    };
    
    const mappedGoal = goalMapping[userData.goal as keyof typeof goalMapping] || "maintain";
    console.log(`[MEAL PLAN] Objetivo mapeado: ${userData.goal} -> ${mappedGoal}`);
    
    // Preparar alimentos agrupados por refeição para otimização da IA
    const mealTypeMapping = {
      breakfast: 'breakfast', 
      lunch: 'lunch',
      snack: 'snack',
      dinner: 'dinner'
    };
    
    // Organizar alimentos por refeição para enviar à edge function
    const foodsByMealTypeFormatted: Record<string, any[]> = {};
    
    if (foodsByMealType) {
      // Usamos a categorização que já foi feita
      Object.entries(foodsByMealType).forEach(([mealType, foodIds]) => {
        const mealTypeMapped = mealTypeMapping[mealType as keyof typeof mealTypeMapping] || mealType;
        foodsByMealTypeFormatted[mealTypeMapped] = selectedFoodsDetails.filter(food => 
          foodIds.includes(food.id)
        );
      });
    } else {
      // Categorização automática baseada no food_group_id se não tivermos categorizados
      foodsByMealTypeFormatted.breakfast = selectedFoodsDetails.filter(food => food.food_group_id === 1);
      foodsByMealTypeFormatted.lunch = selectedFoodsDetails.filter(food => food.food_group_id === 2);
      foodsByMealTypeFormatted.snack = selectedFoodsDetails.filter(food => food.food_group_id === 3);
      foodsByMealTypeFormatted.dinner = selectedFoodsDetails.filter(food => food.food_group_id === 4);
    }
    
    console.log('[MEAL PLAN] Alimentos formatados por refeição:', foodsByMealTypeFormatted);
    
    // Melhorar a solicitação enviada à edge function com alimentos organizados por refeição
    const enhancedPayload = {
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
      selectedFoods: selectedFoodsDetails,
      foodsByMealType: foodsByMealTypeFormatted, // Enviando alimentos organizados por refeição
      dietaryPreferences: {
        hasAllergies: preferences.hasAllergies || false,
        allergies: (preferences.allergies || []).slice(0, 3), // Limitar alergias
        dietaryRestrictions: (preferences.dietaryRestrictions || []).slice(0, 3), // Limitar restrições
        trainingTime: preferences.trainingTime
      },
      modelConfig: {
        model: "mixtral-8x7b-32768", // Modelo Mixtral via Groq
        provider: "groq"
      }
    };
    
    console.log('[MEAL PLAN] Enviando payload para Groq:', JSON.stringify(enhancedPayload, null, 2));
    
    // Definir timeout para capturar falhas por timeout
    const edgeFunctionTimeout = 60000; 
    
    // Implementar timeout manual com Promise.race
    let resultData: EdgeFunctionResponse | null = null;
    try {
      // Criar uma promessa que rejeita após o timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout na chamada à Edge Function Groq")), edgeFunctionTimeout);
      });
      
      // Chamar primeiro a edge function com o modelo Groq (mais confiável)
      const result = await Promise.race([
        supabase.functions.invoke('generate-meal-plan-groq', { body: enhancedPayload }),
        timeoutPromise
      ]);
      
      // Verificar se temos resultado e se ele contém um plano válido
      if (result && 'data' in result && result.data && typeof result.data === 'object' && 'mealPlan' in result.data) {
        console.log('[MEAL PLAN] Chamada à Edge Function Groq bem-sucedida!');
        resultData = result.data as EdgeFunctionResponse;
      } else {
        console.error('[MEAL PLAN] Resposta da Edge Function Groq sem dados válidos:', result);
        throw new Error("Resposta da Edge Function Groq inválida");
      }
    } catch (edgeFunctionError) {
      console.error('[MEAL PLAN] Erro na chamada à Edge Function Groq:', edgeFunctionError);
      
      if (edgeFunctionError instanceof Error) {
        console.error('[MEAL PLAN] Detalhes do erro:', edgeFunctionError.message);
        if (edgeFunctionError.stack) {
          console.error('[MEAL PLAN] Stack:', edgeFunctionError.stack);
        }
      }
      
      toast.dismiss(toastId);
      toastId = toast.loading("Usando modelo alternativo para gerar plano alimentar...");
      
      // Tentar usar a edge function Llama existente como fallback (com melhor configuração de timeout)
      console.log('[MEAL PLAN] Tentando usar Llama como fallback após falha no Groq');
      try {
        enhancedPayload.modelConfig = {
          model: "llama3:8b", // Usando Llama 3 8B como fallback
          provider: "llama"
        };
        
        const result = await Promise.race([
          supabase.functions.invoke('generate-meal-plan-llama', { 
            body: enhancedPayload
          }),
          new Promise<never>((_, reject) => setTimeout(() => 
            reject(new Error("Timeout na chamada à Edge Function Llama")), 90000))
        ]);
        
        if (result && 'data' in result && result.data && typeof result.data === 'object' && 'mealPlan' in result.data) {
          console.log('[MEAL PLAN] Chamada de fallback à Edge Function Llama bem-sucedida!');
          resultData = result.data as EdgeFunctionResponse;
        } else {
          throw new Error("Resposta da Edge Function Llama inválida no fallback");
        }
      } catch (fallbackError) {
        console.error('[MEAL PLAN] Erro no fallback com Llama:', fallbackError);
        // Tentar usar o gerador local como último recurso
        console.log('[MEAL PLAN] Usando plano local devido a falhas em ambos modelos');
        return createDefaultMealPlan(userData, selectedFoodsDetails, foodsByMealTypeFormatted);
      }
    }

    // Verificar se o plano tem a estrutura completa esperada
    if (!resultData || !resultData.mealPlan || !resultData.mealPlan.weeklyPlan) {
      console.error('[MEAL PLAN] Estrutura do plano incompleta:', JSON.stringify(resultData, null, 2));
      toast.dismiss(toastId);
      
      // Usar plano padrão como fallback
      console.log('[MEAL PLAN] Usando plano padrão como fallback para estrutura incompleta');
      return createDefaultMealPlan(userData, selectedFoodsDetails, foodsByMealTypeFormatted);
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
        // Se não houver nenhum dia para copiar, usar plano padrão
        console.log('[MEAL PLAN] Nenhum dia válido encontrado. Usando plano padrão');
        return createDefaultMealPlan(userData, selectedFoodsDetails, foodsByMealTypeFormatted);
      }
    }

    // Garantir que as recomendações existam e estejam no formato esperado
    if (!resultData.mealPlan.recommendations) {
      console.log('[MEAL PLAN] Adicionando recomendações padrão ao plano');
      resultData.mealPlan.recommendations = getDefaultRecommendations(userData.goal);
    }
    
    // Conferir estrutura completa do plano para garantir exibição na UI
    Object.keys(resultData.mealPlan.weeklyPlan).forEach(day => {
      const dayPlan = resultData.mealPlan.weeklyPlan[day];
      
      // Garantir que cada dia possui todas as refeições
      if (!dayPlan.meals) {
        dayPlan.meals = {};
      }
      
      // Verificar cada refeição
      const requiredMeals = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'];
      requiredMeals.forEach(mealType => {
        if (!dayPlan.meals[mealType]) {
          console.log(`[MEAL PLAN] Adicionando refeição padrão: ${mealType} para ${day}`);
          dayPlan.meals[mealType] = createDefaultMeal(mealType, userData.dailyCalories);
        }
        
        // Verificar se macros e calorias estão presentes para cada refeição
        if (!dayPlan.meals[mealType].macros || typeof dayPlan.meals[mealType].calories === 'undefined') {
          console.log(`[MEAL PLAN] Adicionando macros/calorias padrão para: ${mealType} em ${day}`);
          const defaultMeal = createDefaultMeal(mealType, userData.dailyCalories);
          dayPlan.meals[mealType].macros = dayPlan.meals[mealType].macros || defaultMeal.macros;
          dayPlan.meals[mealType].calories = dayPlan.meals[mealType].calories || defaultMeal.calories;
        }
      });
      
      // Garantir totais diários
      if (!dayPlan.dailyTotals) {
        console.log(`[MEAL PLAN] Adicionando totais diários para ${day}`);
        dayPlan.dailyTotals = calculateDailyTotals(dayPlan.meals);
      }
    });
    
    // Calcular e verificar médias semanais
    if (!resultData.mealPlan.weeklyTotals) {
      console.log('[MEAL PLAN] Calculando totais semanais');
      resultData.mealPlan.weeklyTotals = calculateWeeklyAverages(resultData.mealPlan.weeklyPlan);
    }

    // Adicionar a transação de recompensa
    try {
      await addTransaction({
        amount: REWARDS.MEAL_PLAN,
        type: 'meal_plan',
        description: 'Geração de plano alimentar personalizado com IA'
      });
      console.log('[MEAL PLAN] Transação de recompensa adicionada');
    } catch (transactionError) {
      console.error('[MEAL PLAN] Erro ao adicionar transação:', transactionError);
      // Continuar mesmo com erro na transação
    }

    // Salvar os dados do plano
    try {
      await saveMealPlanData(userData.id, resultData.mealPlan, userData.dailyCalories, preferences);
      console.log('[MEAL PLAN] Dados do plano e preferências salvos com sucesso');
    } catch (saveError) {
      console.error('[MEAL PLAN] Erro ao salvar plano:', saveError);
      // Continuar mesmo com erro no salvamento
    }

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
    
    toast.error("Não foi possível gerar o plano alimentar personalizado. Usando plano básico.");
    
    // Retornar um plano padrão em caso de falha
    return createDefaultMealPlan(userData, selectedFoods, foodsByMealType ? 
      {
        breakfast: selectedFoods.filter(food => foodsByMealType.breakfast?.includes(food.id) || false),
        lunch: selectedFoods.filter(food => foodsByMealType.lunch?.includes(food.id) || false),
        snack: selectedFoods.filter(food => foodsByMealType.snack?.includes(food.id) || false),
        dinner: selectedFoods.filter(food => foodsByMealType.dinner?.includes(food.id) || false)
      } : undefined);
  }
};

// Função para calcular médias semanais
const calculateWeeklyAverages = (weeklyPlan: any) => {
  const days = Object.keys(weeklyPlan);
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalFiber = 0;
  
  days.forEach(day => {
    const dayPlan = weeklyPlan[day];
    if (dayPlan.dailyTotals) {
      totalCalories += dayPlan.dailyTotals.calories || 0;
      totalProtein += dayPlan.dailyTotals.protein || 0;
      totalCarbs += dayPlan.dailyTotals.carbs || 0;
      totalFats += dayPlan.dailyTotals.fats || 0;
      totalFiber += dayPlan.dailyTotals.fiber || 0;
    }
  });
  
  const dayCount = days.length || 1;
  
  return {
    averageCalories: Math.round(totalCalories / dayCount),
    averageProtein: Math.round(totalProtein / dayCount),
    averageCarbs: Math.round(totalCarbs / dayCount),
    averageFats: Math.round(totalFats / dayCount),
    averageFiber: Math.round(totalFiber / dayCount)
  };
};

// Função para criar uma refeição padrão
const createDefaultMeal = (mealType: string, dailyCalories: number) => {
  const totalCals = dailyCalories || 2000;
  let calories, protein, carbs, fats, fiber;
  let foods = [];
  let description = '';
  
  switch(mealType) {
    case 'breakfast':
      calories = Math.round(totalCals * 0.25);
      protein = Math.round(calories * 0.25 / 4);
      carbs = Math.round(calories * 0.55 / 4);
      fats = Math.round(calories * 0.2 / 9);
      fiber = 5;
      foods = [
        { name: "Pão integral", portion: 50, unit: "g", details: "Fonte de carboidratos complexos" },
        { name: "Ovos", portion: 100, unit: "g", details: "Fonte de proteína de alta qualidade" },
        { name: "Banana", portion: 100, unit: "g", details: "Fonte de potássio e fibras" }
      ];
      description = `Café da manhã balanceado com aproximadamente ${calories} calorias.`;
      break;
      
    case 'morningSnack':
      calories = Math.round(totalCals * 0.1);
      protein = Math.round(calories * 0.2 / 4);
      carbs = Math.round(calories * 0.6 / 4);
      fats = Math.round(calories * 0.2 / 9);
      fiber = 3;
      foods = [
        { name: "Iogurte natural", portion: 150, unit: "g", details: "Fonte de probióticos e proteínas" },
        { name: "Frutas vermelhas", portion: 50, unit: "g", details: "Ricas em antioxidantes" }
      ];
      description = `Lanche leve e nutritivo com aproximadamente ${calories} calorias.`;
      break;
      
    case 'lunch':
      calories = Math.round(totalCals * 0.35);
      protein = Math.round(calories * 0.3 / 4);
      carbs = Math.round(calories * 0.45 / 4);
      fats = Math.round(calories * 0.25 / 9);
      fiber = 8;
      foods = [
        { name: "Arroz integral", portion: 100, unit: "g", details: "Fonte de carboidratos complexos" },
        { name: "Feijão", portion: 80, unit: "g", details: "Fonte de proteínas vegetais e fibras" },
        { name: "Peito de frango grelhado", portion: 120, unit: "g", details: "Proteína magra de alta qualidade" },
        { name: "Salada verde", portion: 100, unit: "g", details: "Rica em vitaminas e minerais" }
      ];
      description = `Almoço completo e balanceado com aproximadamente ${calories} calorias.`;
      break;
      
    case 'afternoonSnack':
      calories = Math.round(totalCals * 0.1);
      protein = Math.round(calories * 0.15 / 4);
      carbs = Math.round(calories * 0.5 / 4);
      fats = Math.round(calories * 0.35 / 9);
      fiber = 3;
      foods = [
        { name: "Castanhas", portion: 30, unit: "g", details: "Fonte de gorduras saudáveis e antioxidantes" },
        { name: "Maçã", portion: 100, unit: "g", details: "Rica em fibras e baixo índice glicêmico" }
      ];
      description = `Lanche da tarde nutritivo com aproximadamente ${calories} calorias.`;
      break;
      
    case 'dinner':
      calories = Math.round(totalCals * 0.2);
      protein = Math.round(calories * 0.35 / 4);
      carbs = Math.round(calories * 0.35 / 4);
      fats = Math.round(calories * 0.3 / 9);
      fiber = 6;
      foods = [
        { name: "Batata doce", portion: 100, unit: "g", details: "Carboidrato complexo de baixo índice glicêmico" },
        { name: "Filé de peixe", portion: 120, unit: "g", details: "Rico em ômega-3 e proteína de alta qualidade" },
        { name: "Legumes no vapor", portion: 100, unit: "g", details: "Ricos em fibras, vitaminas e minerais" }
      ];
      description = `Jantar leve e nutritivo com aproximadamente ${calories} calorias.`;
      break;
      
    default:
      calories = Math.round(totalCals * 0.15);
      protein = Math.round(calories * 0.2 / 4);
      carbs = Math.round(calories * 0.5 / 4);
      fats = Math.round(calories * 0.3 / 9);
      fiber = 4;
      foods = [
        { name: "Frutas", portion: 150, unit: "g", details: "Vitaminas e minerais essenciais" },
        { name: "Grãos integrais", portion: 50, unit: "g", details: "Fonte de energia de liberação lenta" }
      ];
      description = `Refeição balanceada com aproximadamente ${calories} calorias.`;
  }
  
  return {
    foods,
    calories,
    macros: { protein, carbs, fats, fiber },
    description
  };
};

// Função para calcular totais diários
const calculateDailyTotals = (meals: any) => {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  let fiber = 0;
  
  Object.values(meals).forEach((meal: any) => {
    if (meal && meal.calories) {
      calories += meal.calories;
      protein += meal.macros?.protein || 0;
      carbs += meal.macros?.carbs || 0;
      fats += meal.macros?.fats || 0;
      fiber += meal.macros?.fiber || 0;
    }
  });
  
  return {
    calories,
    protein,
    carbs,
    fats,
    fiber
  };
};

// Função para obter recomendações padrão baseadas no objetivo
const getDefaultRecommendations = (goal: string) => {
  const generalRecs = [
    "Mantenha-se hidratado bebendo pelo menos 2 litros de água por dia.",
    "Tente consumir alimentos integrais em vez de processados sempre que possível.",
    "Inclua uma variedade de frutas e vegetais coloridos em sua dieta.",
    "Consuma proteínas de qualidade em todas as refeições principais.",
    "Prefira gorduras saudáveis como azeite de oliva, abacate e castanhas."
  ];
  
  const preworkoutRecs = "Consuma uma refeição rica em carboidratos e moderada em proteínas 1-2 horas antes do treino. Opções como batata doce com frango, pão integral com ovos ou banana com pasta de amendoim são boas escolhas.";
  
  const postworkoutRecs = "Após o treino, consuma uma combinação de proteínas e carboidratos para auxiliar na recuperação muscular. Whey protein com banana, iogurte com frutas ou peito de frango com arroz são excelentes opções.";
  
  const timingRecs = [
    "Tome café da manhã dentro de 1 hora após acordar.",
    "Mantenha um intervalo de 3-4 horas entre as refeições principais.",
    "Evite refeições pesadas nas 2-3 horas antes de dormir."
  ];
  
  // Adicionar recomendações específicas baseadas no objetivo
  if (goal === "lose" || goal === "lose_weight") {
    generalRecs.push("Crie um déficit calórico moderado, priorizando a redução de alimentos processados e açúcares.");
    generalRecs.push("Aumente a ingestão de alimentos ricos em fibras para promover saciedade.");
    timingRecs.push("Considere uma janela de alimentação restrita de 10-12 horas para potencializar a perda de peso.");
  } else if (goal === "gain" || goal === "gain_weight") {
    generalRecs.push("Aumente gradualmente a ingestão calórica, priorizando proteínas de alta qualidade.");
    generalRecs.push("Distribua bem as refeições ao longo do dia, evitando ficar longos períodos sem se alimentar.");
    timingRecs.push("Considere uma refeição adicional antes de dormir rica em proteínas de absorção lenta como caseína.");
  } else {
    generalRecs.push("Mantenha o equilíbrio energético, ajustando a ingestão calórica conforme seu nível de atividade diária.");
    generalRecs.push("Priorize a variedade alimentar para garantir a ingestão adequada de todos os nutrientes.");
  }
  
  return {
    general: generalRecs.join(" "),
    preworkout: preworkoutRecs,
    postworkout: postworkoutRecs,
    timing: timingRecs
  };
};

// Função para criar um plano de refeição padrão de fallback
const createDefaultMealPlan = (
  userData: MealPlanGenerationProps['userData'], 
  selectedFoods: any[],
  foodsByMealType?: Record<string, any[]>
) => {
  console.log('[MEAL PLAN] Criando plano padrão de fallback com', userData.dailyCalories, 'calorias/dia');
  
  const dailyCalories = userData.dailyCalories || 2000;
  
  // Cálculo básico de macronutrientes
  const protein = Math.round(dailyCalories * 0.3 / 4); // 30% proteína (4 cal/g)
  const carbs = Math.round(dailyCalories * 0.45 / 4);  // 45% carboidratos (4 cal/g)
  const fats = Math.round(dailyCalories * 0.25 / 9);   // 25% gorduras (9 cal/g)
  
  // Distribuição por refeição
  const breakfastCals = Math.round(dailyCalories * 0.25);
  const lunchCals = Math.round(dailyCalories * 0.35);
  const dinnerCals = Math.round(dailyCalories * 0.25);
  const snackCals = Math.round(dailyCalories * 0.15);
  
  // Criar um plano semanal padrão
  const weeklyPlan: any = {};
  
  const dayNames = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo"
  };
  
  // Inicializar comida por tipo de refeição
  const foodsForBreakfast = foodsByMealType?.breakfast || 
    selectedFoods.filter(food => food.food_group_id === 1);
  const foodsForLunch = foodsByMealType?.lunch || 
    selectedFoods.filter(food => food.food_group_id === 2);
  const foodsForSnack = foodsByMealType?.snack || 
    selectedFoods.filter(food => food.food_group_id === 3);
  const foodsForDinner = foodsByMealType?.dinner || 
    selectedFoods.filter(food => food.food_group_id === 4);
    
  // Usar alimentos categorizados por refeição quando disponíveis
  console.log('[MEAL PLAN] Usando alimentos categorizados para o plano padrão:', {
    breakfast: foodsForBreakfast.length,
    lunch: foodsForLunch.length, 
    snack: foodsForSnack.length,
    dinner: foodsForDinner.length
  });
  
  // Seleção de alimentos para o plano padrão por refeição
  const getRandomFood = (foods: any[], count: number = 1) => {
    if (!foods || foods.length === 0) return [{ name: "Opção variada", portion: 100, unit: "g", details: "Consulte um nutricionista" }];
    // Embaralhar o array e retornar N itens
    const shuffled = [...foods].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, foods.length));
    // Mapear para o formato esperado
    return selected.map(food => ({
      name: food.name,
      portion: food.portion || 100,
      unit: food.portionUnit || "g",
      details: getFoodDetail(food)
    }));
  };
  
  // Gerar descrição para o alimento
  const getFoodDetail = (food: any) => {
    if (food.food_group_id === 1) return "Fonte de carboidratos para o café da manhã";
    if (food.food_group_id === 2) return "Alimento recomendado para o almoço";
    if (food.food_group_id === 3) return "Opção saudável para lanches";
    if (food.food_group_id === 4) return "Alimento recomendado para o jantar";
    return "Alimento personalizado baseado em suas preferências";
  };
  
  // Criar cada dia da semana usando os alimentos preferidos do usuário
  Object.entries(dayNames).forEach(([day, dayName]) => {
    weeklyPlan[day] = {
      dayName,
      meals: {
        breakfast: {
          foods: getRandomFood(foodsForBreakfast, 3),
          calories: breakfastCals,
          macros: {
            protein: Math.round(protein * 0.25),
            carbs: Math.round(carbs * 0.3),
            fats: Math.round(fats * 0.2),
            fiber: 5
          },
          description: `Café da manhã balanceado com aproximadamente ${breakfastCals} calorias.`
        },
        morningSnack: {
          foods: getRandomFood(foodsForSnack, 2),
          calories: Math.round(snackCals / 2),
          macros: {
            protein: Math.round(protein * 0.1),
            carbs: Math.round(carbs * 0.1),
            fats: Math.round(fats * 0.05),
            fiber: 3
          },
          description: `Lanche da manhã leve com aproximadamente ${Math.round(snackCals/2)} calorias.`
        },
        lunch: {
          foods: getRandomFood(foodsForLunch, 4),
          calories: lunchCals,
          macros: {
            protein: Math.round(protein * 0.4),
            carbs: Math.round(carbs * 0.35),
            fats: Math.round(fats * 0.25),
            fiber: 8
          },
          description: `Almoço nutritivo e balanceado com aproximadamente ${lunchCals} calorias.`
        },
        afternoonSnack: {
          foods: getRandomFood(foodsForSnack, 2),
          calories: Math.round(snackCals / 2),
          macros: {
            protein: Math.round(protein * 0.05),
            carbs: Math.round(carbs * 0.1),
            fats: Math.round(fats * 0.2),
            fiber: 3
          },
          description: `Lanche da tarde com aproximadamente ${Math.round(snackCals/2)} calorias.`
        },
        dinner: {
          foods: getRandomFood(foodsForDinner, 3),
          calories: dinnerCals,
          macros: {
            protein: Math.round(protein * 0.2),
            carbs: Math.round(carbs * 0.15),
            fats: Math.round(fats * 0.3),
            fiber: 6
          },
          description: `Jantar leve e nutritivo com aproximadamente ${dinnerCals} calorias.`
        }
      },
      dailyTotals: {
        calories: dailyCalories,
        protein,
        carbs,
        fats,
        fiber: 25
      }
    };
  });

  // Criar médias semanais
  const weeklyTotals = {
    averageCalories: dailyCalories,
    averageProtein: protein,
    averageCarbs: carbs, 
    averageFats: fats,
    averageFiber: 25
  };

  // Obter recomendações baseadas no objetivo do usuário
  const recommendations = getDefaultRecommendations(userData.goal);

  // Montar o plano alimentar completo
  return {
    userCalories: dailyCalories,
    weeklyPlan,
    weeklyTotals,
    recommendations,
    isDefaultPlan: true
  };
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
