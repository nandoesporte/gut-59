
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
        console.error('[MEAL PLAN] Resposta recebida:', JSON.stringify(firstResult.data));
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
        selectedFoods: selectedFoodsDetails.slice(0, 20), // Reduzindo número de alimentos
        dietaryPreferences: {
          hasAllergies: preferences.hasAllergies || false,
          allergies: (preferences.allergies || []).slice(0, 3), // Limitar alergias
          dietaryRestrictions: (preferences.dietaryRestrictions || []).slice(0, 3), // Limitar restrições
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
          console.log('[MEAL PLAN] Tentando com plano default...');
          
          // Terceira tentativa - usar plano padrão pré-definido
          return createDefaultMealPlan(userData.dailyCalories);
        }
        
        if (!secondResult.data || !secondResult.data.mealPlan) {
          console.error('[MEAL PLAN] Resposta inválida na segunda tentativa:', secondResult.data);
          toast.dismiss(toastId);
          console.log('[MEAL PLAN] Tentando com plano default...');
          
          // Usar plano padrão pré-definido
          return createDefaultMealPlan(userData.dailyCalories);
        }
        
        console.log('[MEAL PLAN] Segunda tentativa bem-sucedida!');
        resultData = secondResult.data;
      } catch (secondAttemptError) {
        console.error('[MEAL PLAN] Erro na segunda tentativa:', secondAttemptError);
        toast.dismiss(toastId);
        console.log('[MEAL PLAN] Tentando com plano default...');
        
        // Usar plano padrão pré-definido
        return createDefaultMealPlan(userData.dailyCalories);
      }
    }

    // Validar que temos dados resultantes
    if (!resultData || !resultData.mealPlan) {
      console.error('[MEAL PLAN] Resposta final inválida:', JSON.stringify(resultData, null, 2));
      toast.dismiss(toastId);
      console.log('[MEAL PLAN] Usando plano default como fallback');
      
      // Usar plano padrão pré-definido
      return createDefaultMealPlan(userData.dailyCalories);
    }

    console.log('[MEAL PLAN] Resposta recebida com sucesso');
    console.log('[MEAL PLAN] Estrutura do plano:', Object.keys(resultData.mealPlan).join(', '));

    // Verificar se o plano tem a estrutura esperada
    if (!resultData.mealPlan.weeklyPlan || !resultData.mealPlan.recommendations) {
      console.error('[MEAL PLAN] Estrutura do plano incompleta:', JSON.stringify(resultData.mealPlan, null, 2));
      console.log('[MEAL PLAN] Usando plano default como fallback');
      
      // Usar plano padrão pré-definido
      return createDefaultMealPlan(userData.dailyCalories);
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
        console.log('[MEAL PLAN] Nenhum dia válido encontrado. Usando plano default');
        return createDefaultMealPlan(userData.dailyCalories);
      }
    }

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
    return createDefaultMealPlan(userData.dailyCalories || 2000);
  }
};

// Função para criar um plano de refeição padrão de fallback
const createDefaultMealPlan = (dailyCalories: number) => {
  console.log('[MEAL PLAN] Criando plano padrão de fallback com', dailyCalories, 'calorias/dia');
  
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
  
  // Criar cada dia da semana
  Object.entries(dayNames).forEach(([day, dayName]) => {
    weeklyPlan[day] = {
      dayName,
      meals: {
        breakfast: {
          foods: [
            { name: "Pão integral", portion: 50, unit: "g", details: "Fonte de carboidratos" },
            { name: "Ovos", portion: 100, unit: "g", details: "Fonte de proteína" },
            { name: "Frutas da estação", portion: 100, unit: "g", details: "Fonte de fibras e vitaminas" }
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
            { name: "Frutas", portion: 150, unit: "g", details: "Fonte de carboidratos e fibras" },
            { name: "Iogurte natural", portion: 100, unit: "g", details: "Fonte de proteínas" }
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
            { name: "Arroz integral", portion: 100, unit: "g", details: "Fonte de carboidratos" },
            { name: "Feijão", portion: 80, unit: "g", details: "Fonte de proteínas e fibras" },
            { name: "Peito de frango grelhado", portion: 120, unit: "g", details: "Fonte de proteínas" },
            { name: "Legumes variados", portion: 150, unit: "g", details: "Fonte de vitaminas e minerais" }
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
            { name: "Castanhas", portion: 30, unit: "g", details: "Fonte de gorduras boas" },
            { name: "Banana", portion: 100, unit: "g", details: "Fonte de carboidratos" }
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
            { name: "Filé de peixe", portion: 100, unit: "g", details: "Fonte de proteínas e ômega 3" },
            { name: "Salada verde", portion: 100, unit: "g", details: "Fonte de vitaminas e minerais" }
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

  // Criar recomendações generalizadas
  const recommendations = [
    "Mantenha-se hidratado bebendo pelo menos 2 litros de água por dia.",
    "Tente consumir alimentos integrais em vez de processados sempre que possível.",
    "Inclua uma variedade de frutas e vegetais coloridos em sua dieta diária para obter diferentes vitaminas e antioxidantes.",
    "Consuma proteínas magras para auxiliar na recuperação muscular e manutenção da massa magra.",
    "Prefira gorduras saudáveis como azeite de oliva, abacate e castanhas."
  ];

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
