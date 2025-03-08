
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
    
    // Convert foodsByMealType from ProtocolFood[] to expected format for edge function
    const simplifiedFoodsByMealType: Record<string, string[]> = {};
    Object.entries(foodsByMealType).forEach(([mealType, foods]) => {
      simplifiedFoodsByMealType[mealType] = foods.map(food => food.name);
    });
    
    // Call the Nutri+ agent edge function
    const { data, error } = await supabase.functions.invoke('nutri-plus-agent', {
      body: {
        userData,
        selectedFoods,
        foodsByMealType: simplifiedFoodsByMealType, // Send simplified version
        dietaryPreferences: preferences,
        modelConfig: {
          // Explicitly specify model to use
          model: "llama3-8b-8192",
          temperature: 0.3
        }
      }
    });

    if (error) {
      console.error("❌ Erro ao chamar o agente Nutri+:", error);
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
    
    // Ensure the meal plan uses the user's specified daily calories
    if (data.mealPlan && userData.dailyCalories) {
      data.mealPlan.userCalories = userData.dailyCalories;
      
      // If weeklyTotals is missing or has NaN values, recalculate it here
      if (!data.mealPlan.weeklyTotals || 
          isNaN(data.mealPlan.weeklyTotals.averageCalories) || 
          isNaN(data.mealPlan.weeklyTotals.averageProtein)) {
        
        console.log("⚠️ Recalculando médias semanais devido a valores ausentes ou NaN");
        
        // Convert weeklyPlan to array of day plans, with validation
        const weeklyPlan = data.mealPlan.weeklyPlan || {};
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
        
        data.mealPlan.weeklyTotals = {
          averageCalories: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.calories, 0) / dayCount),
          averageProtein: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.protein, 0) / dayCount),
          averageCarbs: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.carbs, 0) / dayCount),
          averageFats: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.fats, 0) / dayCount),
          averageFiber: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.fiber, 0) / dayCount)
        };
        
        console.log("🔄 Novos valores de médias semanais:", data.mealPlan.weeklyTotals);
      }
    }
    
    // Save the meal plan to the database if user is authenticated
    if (userData.id) {
      try {
        // Check if we have a user ID before attempting to save
        console.log("💾 Tentando salvar plano alimentar para o usuário:", userData.id);
        
        const { error: saveError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userData.id,
            plan_data: data.mealPlan,
            calories: userData.dailyCalories,
            generated_by: data.modelUsed || "nutri-plus-agent-llama3",
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

    // Return the meal plan exactly as generated by the AI
    return data.mealPlan;
  } catch (error) {
    console.error("❌ Erro inesperado em generateMealPlan:", error);
    toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
    return null;
  }
};
