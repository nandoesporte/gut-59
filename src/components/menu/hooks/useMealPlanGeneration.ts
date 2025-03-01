
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
    
    // Melhorar a solicitação enviada à edge function para garantir 
    // que o agente nutri+ possa gerar um plano mais personalizado
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
      selectedFoods: selectedFoodsDetails.slice(0, 15), // Aumentando para 15 alimentos para melhor personalização
      dietaryPreferences: {
        hasAllergies: preferences.hasAllergies || false,
        allergies: (preferences.allergies || []).slice(0, 3), // Limitar alergias
        dietaryRestrictions: (preferences.dietaryRestrictions || []).slice(0, 3), // Limitar restrições
        trainingTime: preferences.trainingTime
      },
      options: {
        agentVersion: "nutri+",  // Sinalizar versão específica do agente
        includeRecipes: true,    // Solicitar receitas detalhadas
        followNutritionalGuidelines: true, // Seguir diretrizes nutricionais
        optimizeForMacros: true, // Otimizar para macronutrientes
        enhanceNutritionalVariety: true, // Melhorar a variedade nutricional
        useSimplifiedTerms: false // Usar terminologia nutricional completa
      }
    };
    
    console.log('[MEAL PLAN] Enviando payload aprimorado:', JSON.stringify(enhancedPayload, null, 2));
    
    // Definir timeout para capturar falhas por timeout (30 segundos - aumentado para dar mais tempo ao processamento)
    const edgeFunctionTimeout = 30000;
    
    // Implementar timeout manual com Promise.race
    let resultData: EdgeFunctionResponse | null = null;
    try {
      // Criar uma promessa que rejeita após o timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout na chamada à Edge Function")), edgeFunctionTimeout);
      });
      
      // Corrida entre o timeout e a chamada à Edge Function
      const result = await Promise.race([
        supabase.functions.invoke('generate-meal-plan', { body: enhancedPayload }),
        timeoutPromise
      ]);
      
      // Verificar se temos resultado e se ele contém um plano válido
      if (result && 'data' in result && result.data && typeof result.data === 'object' && 'mealPlan' in result.data) {
        console.log('[MEAL PLAN] Chamada à Edge Function bem-sucedida!');
        resultData = result.data as EdgeFunctionResponse;
      } else {
        console.error('[MEAL PLAN] Resposta da Edge Function sem dados válidos:', result);
        throw new Error("Resposta da Edge Function inválida");
      }
    } catch (edgeFunctionError) {
      console.error('[MEAL PLAN] Erro na chamada à Edge Function:', edgeFunctionError);
      
      if (edgeFunctionError instanceof Error) {
        console.error('[MEAL PLAN] Detalhes do erro:', edgeFunctionError.message);
        if (edgeFunctionError.stack) {
          console.error('[MEAL PLAN] Stack:', edgeFunctionError.stack);
        }
      }
      
      // Tentar uma segunda tentativa com payload simplificado
      console.log('[MEAL PLAN] Tentando novamente com payload simplificado...');
      
      // Tentar uma segunda chamada com payload ainda mais simplificado
      try {
        const simplifiedPayload = {
          userData: enhancedPayload.userData,
          selectedFoods: selectedFoodsDetails.slice(0, 5), // Reduzir para apenas 5 alimentos
          dietaryPreferences: enhancedPayload.dietaryPreferences,
          options: {
            agentVersion: "nutri+",
            useSimplifiedTerms: true // Simplificar para melhorar desempenho
          }
        };
        
        const fallbackResult = await supabase.functions.invoke('generate-meal-plan', { 
          body: simplifiedPayload 
        });
        
        if (fallbackResult && fallbackResult.data && fallbackResult.data.mealPlan) {
          console.log('[MEAL PLAN] Segunda tentativa bem-sucedida!');
          resultData = fallbackResult.data as EdgeFunctionResponse;
        } else {
          console.error('[MEAL PLAN] Segunda tentativa falhou:', fallbackResult);
          throw new Error("Não foi possível gerar o plano alimentar");
        }
      } catch (fallbackError) {
        console.error('[MEAL PLAN] Erro na segunda tentativa:', fallbackError);
        
        // Usar plano padrão quando edge function falha
        console.log('[MEAL PLAN] Usando plano padrão devido a falha na Edge Function');
        return createDefaultMealPlan(userData, selectedFoodsDetails);
      }
    }

    // Verificar se o plano tem a estrutura completa esperada
    if (!resultData || !resultData.mealPlan || !resultData.mealPlan.weeklyPlan) {
      console.error('[MEAL PLAN] Estrutura do plano incompleta:', JSON.stringify(resultData, null, 2));
      toast.dismiss(toastId);
      
      // Usar plano padrão como fallback
      console.log('[MEAL PLAN] Usando plano padrão como fallback para estrutura incompleta');
      return createDefaultMealPlan(userData, selectedFoodsDetails);
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
        return createDefaultMealPlan(userData, selectedFoodsDetails);
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
      });
      
      // Garantir totais diários
      if (!dayPlan.dailyTotals) {
        console.log(`[MEAL PLAN] Adicionando totais diários para ${day}`);
        dayPlan.dailyTotals = calculateDailyTotals(dayPlan.meals);
      }
    });

    // Adicionar a transação de recompensa
    try {
      await addTransaction({
        amount: REWARDS.MEAL_PLAN,
        type: 'meal_plan',
        description: 'Geração de plano alimentar personalizado'
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
    return createDefaultMealPlan(userData, selectedFoods);
  }
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
const createDefaultMealPlan = (userData: MealPlanGenerationProps['userData'], selectedFoods: any[]) => {
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
  
  // Lista de alimentos básicos para montar refeições padrão
  // Preferir os alimentos selecionados pelo usuário quando disponíveis
  const userFoodNames = selectedFoods.map(food => food.name.toLowerCase());
  
  const basicFoods = {
    carbs: [
      "Arroz integral", "Pão integral", "Batata doce", "Aveia", "Quinoa", 
      "Tapioca", "Macarrão integral", "Mandioca"
    ].filter(food => {
      // Favorece alimentos que o usuário selecionou
      const normalizedFood = food.toLowerCase();
      return userFoodNames.some(userFood => userFood.includes(normalizedFood) || normalizedFood.includes(userFood));
    })[0] || "Arroz integral",
    
    proteins: [
      "Peito de frango", "Ovos", "Carne magra", "Peixe", "Tofu", 
      "Whey protein", "Feijão", "Lentilha"
    ].filter(food => {
      const normalizedFood = food.toLowerCase();
      return userFoodNames.some(userFood => userFood.includes(normalizedFood) || normalizedFood.includes(userFood));
    })[0] || "Peito de frango",
    
    fats: [
      "Azeite de oliva", "Abacate", "Castanhas", "Sementes de chia", "Nozes", 
      "Amêndoas", "Semente de linhaça", "Óleo de coco"
    ].filter(food => {
      const normalizedFood = food.toLowerCase();
      return userFoodNames.some(userFood => userFood.includes(normalizedFood) || normalizedFood.includes(userFood));
    })[0] || "Azeite de oliva",
    
    fruits: [
      "Banana", "Maçã", "Laranja", "Uva", "Abacaxi", 
      "Morango", "Melancia", "Kiwi"
    ].filter(food => {
      const normalizedFood = food.toLowerCase();
      return userFoodNames.some(userFood => userFood.includes(normalizedFood) || normalizedFood.includes(userFood));
    })[0] || "Banana",
    
    vegetables: [
      "Brócolis", "Couve", "Espinafre", "Alface", "Cenoura", 
      "Tomate", "Pepino", "Abobrinha"
    ].filter(food => {
      const normalizedFood = food.toLowerCase();
      return userFoodNames.some(userFood => userFood.includes(normalizedFood) || normalizedFood.includes(userFood));
    })[0] || "Brócolis",
    
    dairy: [
      "Leite desnatado", "Iogurte natural", "Queijo cottage", "Queijo branco", "Ricota"
    ].filter(food => {
      const normalizedFood = food.toLowerCase();
      return userFoodNames.some(userFood => userFood.includes(normalizedFood) || normalizedFood.includes(userFood));
    })[0] || "Iogurte natural"
  };
  
  // Criar cada dia da semana
  Object.entries(dayNames).forEach(([day, dayName]) => {
    weeklyPlan[day] = {
      dayName,
      meals: {
        breakfast: {
          foods: [
            { name: basicFoods.carbs, portion: 50, unit: "g", details: "Fonte de carboidratos" },
            { name: "Ovos", portion: 100, unit: "g", details: "Fonte de proteína" },
            { name: basicFoods.fruits, portion: 100, unit: "g", details: "Fonte de fibras e vitaminas" }
          ],
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
          foods: [
            { name: basicFoods.fruits, portion: 150, unit: "g", details: "Fonte de carboidratos e fibras" },
            { name: basicFoods.dairy, portion: 100, unit: "g", details: "Fonte de proteínas" }
          ],
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
          foods: [
            { name: basicFoods.carbs, portion: 100, unit: "g", details: "Fonte de carboidratos" },
            { name: "Feijão", portion: 80, unit: "g", details: "Fonte de proteínas e fibras" },
            { name: basicFoods.proteins, portion: 120, unit: "g", details: "Fonte de proteínas" },
            { name: basicFoods.vegetables, portion: 150, unit: "g", details: "Fonte de vitaminas e minerais" }
          ],
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
          foods: [
            { name: basicFoods.fats, portion: 30, unit: "g", details: "Fonte de gorduras boas" },
            { name: basicFoods.fruits, portion: 100, unit: "g", details: "Fonte de carboidratos" }
          ],
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
          foods: [
            { name: "Batata doce", portion: 100, unit: "g", details: "Fonte de carboidratos complexos" },
            { name: "Peixe", portion: 100, unit: "g", details: "Fonte de proteínas e ômega 3" },
            { name: basicFoods.vegetables, portion: 100, unit: "g", details: "Fonte de vitaminas e minerais" }
          ],
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
