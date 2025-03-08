
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
  foodsByMealType: Record<string, string[]>;
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
    
    // Try first with the primary nutri-plus-agent
    try {
      const { data, error } = await supabase.functions.invoke('nutri-plus-agent', {
        body: {
          userData,
          selectedFoods,
          foodsByMealType,
          dietaryPreferences: preferences,
          modelConfig: {
            model: "llama3-8b-8192",
            temperature: 0.3
          }
        }
      });

      if (!error && data?.mealPlan) {
        console.log("✅ Plano alimentar recebido com sucesso do agente Nutri+");
        console.log("📋 Dados do plano:", JSON.stringify(data.mealPlan).substring(0, 200) + "...");
        console.log("🧠 Modelo utilizado:", data.modelUsed || "llama3-8b-8192");
        
        // Process the meal plan data
        const mealPlan = processMealPlanData(data.mealPlan, userData);
        
        // Save the meal plan to the database if user is authenticated
        await saveMealPlanToDatabase(mealPlan, userData, preferences, data.modelUsed, addTransaction);
        
        return mealPlan;
      }
      
      // If we got an error or no meal plan, throw to try the fallback
      if (error) {
        console.warn("⚠️ Erro ao chamar o agente Nutri+, tentando método alternativo:", error);
        throw new Error("Fallback to secondary method");
      }
    } catch (primaryError) {
      console.warn("⚠️ Usando método alternativo (generate-meal-plan-groq) devido a erro:", primaryError);
      
      // Fall back to the generate-meal-plan-groq endpoint
      const { data, error } = await supabase.functions.invoke('generate-meal-plan-groq', {
        body: {
          userInput: {
            userData,
            selectedFoods,
            dietaryPreferences: preferences
          },
          user_id: userData.id
        }
      });

      if (error) {
        console.error("❌ Erro ao chamar o endpoint alternativo:", error);
        toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
        return null;
      }

      if (!data?.mealPlan) {
        console.error("❌ Nenhum plano alimentar retornado pelo método alternativo");
        console.error("Resposta completa:", data);
        toast.error("Não foi possível gerar o plano alimentar. Por favor, tente novamente.");
        return null;
      }
      
      console.log("✅ Plano alimentar recebido com sucesso do método alternativo");
      console.log("📋 Dados do plano:", JSON.stringify(data.mealPlan).substring(0, 200) + "...");
      
      // Convert the groq format to our internal format
      const convertedMealPlan = convertGroqFormatToInternal(data.mealPlan, userData);
      
      // Save the converted meal plan to the database
      await saveMealPlanToDatabase(convertedMealPlan, userData, preferences, "groq-llama3-70b", addTransaction);
      
      return convertedMealPlan;
    }
    
    console.error("❌ Nenhum plano alimentar gerado por nenhum método");
    return null;
  } catch (error) {
    console.error("❌ Erro inesperado em generateMealPlan:", error);
    toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
    return null;
  }
};

// Helper function to process and standardize meal plan data
const processMealPlanData = (mealPlan: MealPlan, userData: any): MealPlan => {
  console.log("🔄 Processando dados do plano alimentar");
  
  // Ensure the meal plan uses the user's specified daily calories
  if (mealPlan && userData.dailyCalories) {
    mealPlan.userCalories = userData.dailyCalories;
    
    // If weeklyTotals is missing or has NaN values, recalculate it
    if (!mealPlan.weeklyTotals || 
        isNaN(mealPlan.weeklyTotals.averageCalories) || 
        isNaN(mealPlan.weeklyTotals.averageProtein)) {
      
      console.log("⚠️ Recalculando médias semanais devido a valores ausentes ou NaN");
      
      // Convert weeklyPlan to array of day plans, with validation
      const weeklyPlan = mealPlan.weeklyPlan || {};
      const days = Object.values(weeklyPlan);
      
      // Define a proper type guard function to ensure day has properly typed dailyTotals
      const isDayPlanWithValidTotals = (day: unknown): day is DayPlan => {
        return (
          !!day && 
          typeof day === 'object' &&
          'dailyTotals' in day &&
          !!day.dailyTotals &&
          typeof day.dailyTotals === 'object' &&
          'calories' in day.dailyTotals && typeof day.dailyTotals.calories === 'number' &&
          'protein' in day.dailyTotals && typeof day.dailyTotals.protein === 'number' &&
          'carbs' in day.dailyTotals && typeof day.dailyTotals.carbs === 'number' &&
          'fats' in day.dailyTotals && typeof day.dailyTotals.fats === 'number' &&
          'fiber' in day.dailyTotals && typeof day.dailyTotals.fiber === 'number'
        );
      };
      
      // Filter days to only include valid days with proper dailyTotals
      const validDays = days.filter(isDayPlanWithValidTotals);
      const dayCount = validDays.length || 1; // Prevent division by zero
      
      mealPlan.weeklyTotals = {
        averageCalories: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.calories, 0) / dayCount),
        averageProtein: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.protein, 0) / dayCount),
        averageCarbs: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.carbs, 0) / dayCount),
        averageFats: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.fats, 0) / dayCount),
        averageFiber: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.fiber, 0) / dayCount)
      };
      
      console.log("🔄 Novos valores de médias semanais:", mealPlan.weeklyTotals);
    }
  }
  
  // Ensure the meal plan has all required properties
  if (!mealPlan.generatedBy) {
    mealPlan.generatedBy = "nutri-plus-agent";
  }
  
  return mealPlan;
};

// Function to save meal plan to database
const saveMealPlanToDatabase = async (
  mealPlan: MealPlan, 
  userData: any, 
  preferences: DietaryPreferences, 
  modelUsed: string = "nutri-plus-agent-llama3",
  addTransaction?: (params: any) => Promise<void>
) => {
  // Only save if we have a user ID
  if (userData.id) {
    try {
      console.log("💾 Tentando salvar plano alimentar para o usuário:", userData.id);
      
      // Fix: Convert MealPlan to JSON before inserting
      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.id,
          plan_data: JSON.parse(JSON.stringify(mealPlan)), // Convert to JSON compatible format
          calories: userData.dailyCalories,
          generated_by: modelUsed || "nutri-plus-agent-llama3",
          preferences: preferences // Save the user preferences with the meal plan
        });

      if (saveError) {
        console.error("❌ Erro ao salvar plano alimentar:", saveError);
        toast.error("Erro ao salvar o plano no histórico: " + saveError.message);
      } else {
        console.log("💾 Plano alimentar salvo no banco de dados com sucesso");
        toast.success("Plano alimentar salvo no histórico");
        
        // Add transaction if wallet function is available
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
};

// Function to convert Groq format to our internal format
const convertGroqFormatToInternal = (groqMealPlan: any, userData: any): MealPlan => {
  console.log("🔄 Convertendo formato Groq para formato interno");
  
  // Create a weekly plan structure
  const weeklyPlan: any = {
    monday: createDayPlan("Monday", groqMealPlan.meal_plan.meals),
    tuesday: createDayPlan("Tuesday", groqMealPlan.meal_plan.meals),
    wednesday: createDayPlan("Wednesday", groqMealPlan.meal_plan.meals),
    thursday: createDayPlan("Thursday", groqMealPlan.meal_plan.meals),
    friday: createDayPlan("Friday", groqMealPlan.meal_plan.meals),
    saturday: createDayPlan("Saturday", groqMealPlan.meal_plan.meals),
    sunday: createDayPlan("Sunday", groqMealPlan.meal_plan.meals)
  };
  
  // Calculate weekly totals
  const dailyCalories = groqMealPlan.meal_plan.daily_calories;
  const proteinPct = groqMealPlan.meal_plan.macro_distribution?.protein_percentage || 25;
  const carbsPct = groqMealPlan.meal_plan.macro_distribution?.carbs_percentage || 50;
  const fatsPct = groqMealPlan.meal_plan.macro_distribution?.fat_percentage || 25;
  
  // Calculate macros in grams based on percentages
  const proteinGrams = Math.round((dailyCalories * (proteinPct / 100)) / 4); // 4 calories per gram of protein
  const carbsGrams = Math.round((dailyCalories * (carbsPct / 100)) / 4); // 4 calories per gram of carbs
  const fatsGrams = Math.round((dailyCalories * (fatsPct / 100)) / 9); // 9 calories per gram of fat
  
  const weeklyTotals = {
    averageCalories: dailyCalories,
    averageProtein: proteinGrams,
    averageCarbs: carbsGrams,
    averageFats: fatsGrams,
    averageFiber: Math.round(carbsGrams * 0.2) // Estimate fiber as 20% of carbs
  };
  
  // Create recommendations
  const recommendations = {
    general: groqMealPlan.recommendations?.[0] || "Mantenha uma alimentação balanceada e variada.",
    preworkout: groqMealPlan.recommendations?.[1] || "Consuma carboidratos e proteínas antes do treino.",
    postworkout: groqMealPlan.recommendations?.[2] || "Reponha proteínas e carboidratos após o treino.",
    timing: groqMealPlan.recommendations?.slice(3) || [
      "Faça refeições a cada 3-4 horas.",
      "Beba água ao longo do dia.",
      "Evite refeições pesadas antes de dormir.",
      "Consuma proteínas em todas as refeições.",
      "Priorize alimentos integrais."
    ]
  };
  
  return {
    weeklyPlan,
    weeklyTotals,
    recommendations,
    userCalories: userData.dailyCalories,
    generatedBy: "groq-llama3-70b"
  };
};

// Helper function to create a day plan from Groq's meals array
const createDayPlan = (dayName: string, meals: any[]): DayPlan => {
  // Group meals by type
  const mealsByType: Record<string, any[]> = {
    breakfast: [],
    morningSnack: [],
    lunch: [],
    afternoonSnack: [],
    dinner: []
  };
  
  // Map meal types from Groq format to our internal format
  const typeMapping: Record<string, string> = {
    'breakfast': 'breakfast',
    'morning snack': 'morningSnack',
    'lunch': 'lunch',
    'afternoon snack': 'afternoonSnack',
    'dinner': 'dinner',
    'snack': 'afternoonSnack'
  };
  
  // Categorize meals by type
  if (Array.isArray(meals)) {
    meals.forEach(meal => {
      if (meal && meal.type) {
        const type = typeMapping[meal.type.toLowerCase()] || 'morningSnack';
        if (!mealsByType[type]) {
          mealsByType[type] = [];
        }
        mealsByType[type].push(meal);
      }
    });
  } else {
    console.warn("⚠️ Meals is not an array:", meals);
  }
  
  // Create meal objects for each type
  const createMeal = (mealType: string, groqMeals: any[]): any => {
    if (!groqMeals || groqMeals.length === 0) {
      // Default empty meal
      return {
        description: `${mealType} meal`,
        foods: [],
        calories: 0,
        macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
      };
    }
    
    const meal = groqMeals[0]; // Take the first meal of this type
    
    return {
      description: meal.name || `${mealType} meal`,
      foods: Array.isArray(meal.foods) ? meal.foods.map((food: any) => ({
        name: food.name || "Unknown food",
        portion: parseFloat(food.portion) || 100,
        unit: food.unit || "g",
        details: `${food.portion || "100"} ${food.unit || "g"} de ${food.name || "Unknown food"}`
      })) : [],
      calories: meal.total_calories || 0,
      macros: {
        protein: meal.total_protein || 0,
        carbs: meal.total_carbs || 0,
        fats: meal.total_fat || 0,
        fiber: Math.round((meal.total_carbs || 0) * 0.2) // Estimate fiber as 20% of carbs
      }
    };
  };
  
  // Create the day plan object
  const dayPlan: DayPlan = {
    dayName,
    meals: {
      breakfast: createMeal('Breakfast', mealsByType.breakfast),
      morningSnack: createMeal('Morning Snack', mealsByType.morningSnack),
      lunch: createMeal('Lunch', mealsByType.lunch),
      afternoonSnack: createMeal('Afternoon Snack', mealsByType.afternoonSnack),
      dinner: createMeal('Dinner', mealsByType.dinner)
    },
    dailyTotals: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0
    }
  };
  
  // Calculate daily totals
  Object.values(dayPlan.meals).forEach(meal => {
    dayPlan.dailyTotals.calories += meal.calories;
    dayPlan.dailyTotals.protein += meal.macros.protein;
    dayPlan.dailyTotals.carbs += meal.macros.carbs;
    dayPlan.dailyTotals.fats += meal.macros.fats;
    dayPlan.dailyTotals.fiber += meal.macros.fiber;
  });
  
  return dayPlan;
};
