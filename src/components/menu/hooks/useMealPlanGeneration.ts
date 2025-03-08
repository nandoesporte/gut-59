import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan, ProtocolFood, DayPlan } from "../types";

interface GenerateMealPlanParams {
  userData: {
    id?: string;
    weight: number;
    height: number;
    age: number;
    gender: string;
    activityLevel: string;
    goal?: string;
    dailyCalories: number;
  };
  selectedFoods: ProtocolFood[];
  foodsByMealType: Record<string, ProtocolFood[]>; 
  preferences: DietaryPreferences;
  addTransaction?: (params: any) => Promise<void>;
}

export const generateMealPlan = async ({
  userData,
  selectedFoods,
  foodsByMealType,
  preferences,
  addTransaction
}: GenerateMealPlanParams): Promise<MealPlan | null> => {
  console.log("🚀 Iniciando geração do plano alimentar com o agente Nutri+");
  console.log(`👤 Dados do usuário: ${userData.weight}kg, ${userData.height}cm, ${userData.age} anos, ${userData.gender}`);
  console.log(`🥅 Meta: ${userData.goal}, Calorias diárias: ${userData.dailyCalories}kcal`);
  console.log(`🍎 Alimentos selecionados: ${selectedFoods.length}`);
  console.log(`🥗 Preferências alimentares:`, preferences);
  
  try {
    console.log("📡 Chamando função edge do Supabase - nutri-plus-agent (Llama3-8b)");
    
    const simplifiedFoodsByMealType: Record<string, string[]> = {};
    Object.entries(foodsByMealType).forEach(([mealType, foods]) => {
      simplifiedFoodsByMealType[mealType] = foods.map(food => food.name);
    });
    
    toast.loading("Gerando plano alimentar personalizado...", {
      id: "meal-plan-generation",
      duration: 20000
    });
    
    const timeoutPromise = new Promise<{data: null, error: Error}>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: A geração do plano alimentar está demorando mais que o esperado.')), 30000);
    });
    
    const requestBody = {
      userData,
      selectedFoods: selectedFoods.map(food => ({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        fiber: food.fiber || 0
      })),
      foodsByMealType: simplifiedFoodsByMealType,
      dietaryPreferences: preferences,
      modelConfig: {
        model: "llama3-8b-8192",
        temperature: 0.3,
        num_predict: 4000,
        top_p: 0.95,
        response_format: { type: "json_object" }
      }
    };
    
    const edgeFunctionPromise = supabase.functions.invoke('nutri-plus-agent', {
      body: requestBody
    });
    
    const { data, error } = await Promise.race([timeoutPromise, edgeFunctionPromise]);

    toast.dismiss("meal-plan-generation");

    if (error) {
      console.error("❌ Erro ao chamar o agente Nutri+:", error);
      
      if (error.message && (
          error.message.includes("json_validate_failed") || 
          error.message.includes("Failed to generate JSON") ||
          error.message.includes("The completion is incomplete") ||
          error.message.includes("400")
      )) {
        console.log("⚠️ Erro de validação JSON detectado. Tentando gerar com função alternativa...");
        toast.loading("Tentando método alternativo de geração...", {
          id: "meal-plan-fallback",
          duration: 15000
        });
        
        try {
          const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('generate-meal-plan-groq', {
            body: {
              userInput: {
                userData,
                selectedFoods: selectedFoods.map(f => f.name),
                preferences
              },
              user_id: userData.id
            }
          });
          
          toast.dismiss("meal-plan-fallback");
          
          if (fallbackError) {
            throw fallbackError;
          }
          
          if (!fallbackData?.mealPlan) {
            throw new Error("Não foi possível gerar o plano alimentar com o método alternativo.");
          }
          
          console.log("✅ Plano alimentar gerado com sucesso pelo método alternativo");
          toast.success("Plano alimentar gerado com sucesso!");
          
          const mealPlan = ensureMealPlanStructure(fallbackData.mealPlan, userData.dailyCalories);
          
          if (userData.id && addTransaction) {
            await addTransaction({
              amount: 10,
              type: 'expense',
              description: 'Geração de plano alimentar',
              category: 'meal_plan'
            });
            console.log("💰 Transação adicionada para geração do plano alimentar");
          }
          
          return mealPlan;
        } catch (fallbackErr) {
          console.error("❌ Erro no método alternativo:", fallbackErr);
          toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
          return null;
        }
      }
      
      toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
      return null;
    }

    if (!data?.mealPlan) {
      console.error("❌ Nenhum plano alimentar retornado pelo agente Nutri+");
      console.error("Resposta completa:", data);
      toast.error("Não foi possível gerar o plano alimentar. Por favor, tente novamente.");
      return null;
    }

    console.log("✅ Plano alimentar recebido com sucesso do agente Nutri+");
    console.log("📋 Dados do plano:", JSON.stringify(data.mealPlan).substring(0, 200) + "...");
    console.log("🧠 Modelo utilizado:", data.modelUsed || "llama3-8b-8192");
    
    const processedMealPlan = ensureMealPlanStructure(data.mealPlan, userData.dailyCalories);
    
    if (userData.id) {
      try {
        console.log("💾 Tentando salvar plano alimentar para o usuário:", userData.id);
        
        const mealPlanForStorage = JSON.parse(JSON.stringify(processedMealPlan));
        
        const { error: saveError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userData.id,
            plan_data: mealPlanForStorage as any,
            calories: userData.dailyCalories,
            generated_by: data.modelUsed || "nutri-plus-agent-llama3",
            preferences: preferences
          });

        if (saveError) {
          console.error("❌ Erro ao salvar plano alimentar:", saveError);
          toast.error("Erro ao salvar o plano no histórico: " + saveError.message);
        } else {
          console.log("💾 Plano alimentar salvo no banco de dados com sucesso");
          toast.success("Plano alimentar salvo no histórico");
          
          if (addTransaction) {
            await addTransaction({
              amount: 10,
              type: 'expense',
              description: 'Geração de plano alimentar',
              category: 'meal_plan'
            });
            console.log("💰 Transação adicionada para geração do plano alimentar");
          }
        }
      } catch (dbError) {
        console.error("❌ Erro ao salvar plano alimentar no banco de dados:", dbError);
        toast.error("Erro ao salvar plano no histórico. Verifique a conexão e tente novamente.");
      }
    } else {
      console.warn("⚠️ Usuário não está autenticado, plano não será salvo no histórico");
      toast.warning("Faça login para salvar o plano no histórico");
    }

    toast.success("Plano alimentar gerado com sucesso!");
    
    return processedMealPlan;
  } catch (error) {
    console.error("❌ Erro inesperado em generateMealPlan:", error);
    toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
    return null;
  }
};

function ensureMealPlanStructure(mealPlan: any, userCalories: number): MealPlan {
  if (!mealPlan.weeklyPlan) {
    console.warn("⚠️ Plano alimentar sem weeklyPlan - criando estrutura básica");
    mealPlan.weeklyPlan = {};
  }
  
  const requiredDays = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  const dayNames = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  
  requiredDays.forEach((day, index) => {
    if (!mealPlan.weeklyPlan[day]) {
      console.warn(`⚠️ Dia ausente no plano: ${day} - criando dia`);
      mealPlan.weeklyPlan[day] = createDefaultDayPlan(dayNames[index], userCalories);
    } else {
      ensureDayStructureComplete(mealPlan.weeklyPlan[day], dayNames[index], userCalories);
    }
  });
  
  if (!mealPlan.weeklyTotals || 
      isNaN(Number(mealPlan.weeklyTotals.averageCalories)) || 
      isNaN(Number(mealPlan.weeklyTotals.averageProtein)) ||
      isNaN(Number(mealPlan.weeklyTotals.averageCarbs)) ||
      isNaN(Number(mealPlan.weeklyTotals.averageFats)) ||
      isNaN(Number(mealPlan.weeklyTotals.averageFiber))) {
    
    console.warn("⚠️ Recalculando médias semanais devido a valores inválidos");
    
    const weeklyPlan = mealPlan.weeklyPlan || {};
    const days = Object.values(weeklyPlan);
    const dayCount = Math.max(days.length || 1, 1);
    
    // Helper function to ensure we're always working with numeric values
    const getNumericValue = (value: any): number => {
      if (typeof value === 'number' && !isNaN(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0; // Default to 0 for null, undefined, or other non-numeric values
    };
    
    mealPlan.weeklyTotals = {
      averageCalories: Math.round(days.reduce((sum: number, day: any) => {
        const dayTotal = day?.dailyTotals || {};
        return sum + getNumericValue(dayTotal.calories);
      }, 0) / dayCount),
      
      averageProtein: Math.round(days.reduce((sum: number, day: any) => {
        const dayTotal = day?.dailyTotals || {};
        return sum + getNumericValue(dayTotal.protein);
      }, 0) / dayCount),
      
      averageCarbs: Math.round(days.reduce((sum: number, day: any) => {
        const dayTotal = day?.dailyTotals || {};
        return sum + getNumericValue(dayTotal.carbs);
      }, 0) / dayCount),
      
      averageFats: Math.round(days.reduce((sum: number, day: any) => {
        const dayTotal = day?.dailyTotals || {};
        return sum + getNumericValue(dayTotal.fats);
      }, 0) / dayCount),
      
      averageFiber: Math.round(days.reduce((sum: number, day: any) => {
        const dayTotal = day?.dailyTotals || {};
        return sum + getNumericValue(dayTotal.fiber);
      }, 0) / dayCount)
    };
  }
  
  if (!mealPlan.recommendations) {
    console.warn("⚠️ Sem recomendações no plano - adicionando valores padrão");
    mealPlan.recommendations = {
      general: "Mantenha uma alimentação balanceada e variada. Beba pelo menos 2 litros de água por dia.",
      preworkout: "Consuma carboidratos 30-60 minutos antes do treino para energia.",
      postworkout: "Consuma proteínas e carboidratos dentro de 30 minutos após o treino para recuperação muscular.",
      timing: [
        "Distribua as refeições a cada 3-4 horas durante o dia.",
        "Evite refeições pesadas antes de dormir."
      ]
    };
  }
  
  processNumericValues(mealPlan);
  
  mealPlan.userCalories = userCalories;
  
  return mealPlan as MealPlan;
}

function createDefaultDayPlan(dayName: string, totalCalories: number): DayPlan {
  const caloriesPerMeal = Math.round(totalCalories / 5);
  const protein = Math.round((totalCalories * 0.3) / 4);
  const carbs = Math.round((totalCalories * 0.5) / 4);
  const fats = Math.round((totalCalories * 0.2) / 9);
  
  const proteinPerMeal = Math.round(protein / 5);
  const carbsPerMeal = Math.round(carbs / 5);
  const fatsPerMeal = Math.round(fats / 5);
  
  const createMeal = (description: string) => ({
    description,
    foods: [
      {
        name: "Alimento",
        portion: 100,
        unit: "g",
        details: "Preparar conforme instruções"
      }
    ],
    calories: caloriesPerMeal,
    macros: {
      protein: proteinPerMeal,
      carbs: carbsPerMeal,
      fats: fatsPerMeal,
      fiber: 5
    }
  });
  
  return {
    dayName,
    meals: {
      cafeDaManha: createMeal("Café da manhã"),
      lancheDaManha: createMeal("Lanche da manhã"),
      almoco: createMeal("Almoço"),
      lancheDaTarde: createMeal("Lanche da tarde"),
      jantar: createMeal("Jantar")
    },
    dailyTotals: {
      calories: totalCalories,
      protein,
      carbs,
      fats,
      fiber: 25
    }
  };
}

function ensureDayStructureComplete(day: any, dayName: string, userCalories: number) {
  if (!day.dayName) {
    day.dayName = dayName;
  }
  
  if (!day.meals) {
    day.meals = {};
  }
  
  const mealTypes = ['cafeDaManha', 'lancheDaManha', 'almoco', 'lancheDaTarde', 'jantar'];
  const mealNames = ["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar"];
  
  mealTypes.forEach((meal, index) => {
    if (!day.meals[meal]) {
      console.warn(`⚠️ Refeição ausente: ${meal} - criando refeição padrão`);
      const caloriesPerMeal = Math.round(userCalories / 5);
      
      day.meals[meal] = {
        description: mealNames[index],
        foods: [{
          name: "Alimento",
          portion: 100,
          unit: "g",
          details: "Preparar conforme instruções"
        }],
        calories: caloriesPerMeal,
        macros: {
          protein: Math.round((caloriesPerMeal * 0.3) / 4),
          carbs: Math.round((caloriesPerMeal * 0.5) / 4),
          fats: Math.round((caloriesPerMeal * 0.2) / 9),
          fiber: 5
        }
      };
    } else {
      const currentMeal = day.meals[meal];
      
      if (!currentMeal.description) {
        currentMeal.description = mealNames[index];
      }
      
      if (!currentMeal.foods || !Array.isArray(currentMeal.foods) || currentMeal.foods.length === 0) {
        currentMeal.foods = [{
          name: "Alimento",
          portion: 100,
          unit: "g",
          details: "Preparar conforme instruções"
        }];
      }
      
      if (!currentMeal.calories || isNaN(currentMeal.calories)) {
        currentMeal.calories = Math.round(userCalories / 5);
      }
      
      if (!currentMeal.macros) {
        const caloriesPerMeal = currentMeal.calories;
        currentMeal.macros = {
          protein: Math.round((caloriesPerMeal * 0.3) / 4),
          carbs: Math.round((caloriesPerMeal * 0.5) / 4),
          fats: Math.round((caloriesPerMeal * 0.2) / 9),
          fiber: 5
        };
      } else {
        if (isNaN(currentMeal.macros.protein)) currentMeal.macros.protein = 15;
        if (isNaN(currentMeal.macros.carbs)) currentMeal.macros.carbs = 30;
        if (isNaN(currentMeal.macros.fats)) currentMeal.macros.fats = 10;
        if (isNaN(currentMeal.macros.fiber)) currentMeal.macros.fiber = 5;
      }
    }
  });
  
  if (!day.dailyTotals) {
    console.warn(`⚠️ dailyTotals ausente - calculando totais para ${dayName}`);
    
    const meals = day.meals;
    day.dailyTotals = {
      calories: Object.values(meals).reduce((sum: number, meal: any) => sum + (meal?.calories || 0), 0),
      protein: Object.values(meals).reduce((sum: number, meal: any) => sum + (meal?.macros?.protein || 0), 0),
      carbs: Object.values(meals).reduce((sum: number, meal: any) => sum + (meal?.macros?.carbs || 0), 0),
      fats: Object.values(meals).reduce((sum: number, meal: any) => sum + (meal?.macros?.fats || 0), 0),
      fiber: Object.values(meals).reduce((sum: number, meal: any) => sum + (meal?.macros?.fiber || 0), 0)
    };
  } else {
    if (isNaN(day.dailyTotals.calories)) day.dailyTotals.calories = userCalories;
    if (isNaN(day.dailyTotals.protein)) day.dailyTotals.protein = Math.round((userCalories * 0.3) / 4);
    if (isNaN(day.dailyTotals.carbs)) day.dailyTotals.carbs = Math.round((userCalories * 0.5) / 4);
    if (isNaN(day.dailyTotals.fats)) day.dailyTotals.fats = Math.round((userCalories * 0.2) / 9);
    if (isNaN(day.dailyTotals.fiber)) day.dailyTotals.fiber = 25;
  }
}

function processNumericValues(obj: any): void {
  if (!obj || typeof obj !== 'object') return;
  
  if (Array.isArray(obj)) {
    obj.forEach(item => processNumericValues(item));
    return;
  }
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (typeof value === 'number') {
      obj[key] = Math.round(value);
    } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      obj[key] = Math.round(parseFloat(value));
    } else if (typeof value === 'object' && value !== null) {
      processNumericValues(value);
    }
  });
}
