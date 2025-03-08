import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DietaryPreferences, MealPlan, ProtocolFood, TransactionParams, DayPlan } from "../types";
import { TransactionType } from "@/types/wallet";

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
  addTransaction?: (params: TransactionParams) => Promise<void>;
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
    
    const mealPlan = data.mealPlan as MealPlan;
    
    if (mealPlan && userData.dailyCalories) {
      mealPlan.userCalories = userData.dailyCalories;
      
      if (!mealPlan.weeklyTotals || 
          isNaN(mealPlan.weeklyTotals.averageCalories) || 
          isNaN(mealPlan.weeklyTotals.averageProtein)) {
        
        console.log("⚠️ Recalculando médias semanais devido a valores ausentes ou NaN");
        
        const weeklyPlan = mealPlan.weeklyPlan || {};
        const days = Object.values(weeklyPlan);
        
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
        
        const validDays = days.filter(isDayPlanWithValidTotals);
        const dayCount = validDays.length || 1;
        
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
    
    if (userData.id) {
      try {
        console.log("💾 Tentando salvar plano alimentar para o usuário:", userData.id);
        
        const { error: saveError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userData.id,
            plan_data: JSON.stringify(mealPlan),
            calories: userData.dailyCalories,
            generated_by: data.modelUsed || "nutri-plus-agent-llama3",
            dietary_preferences: JSON.stringify(preferences)
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
              type: 'meal_plan_generation',
              description: 'Geração de plano alimentar'
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

    return mealPlan;
  } catch (error) {
    console.error("❌ Erro inesperado em generateMealPlan:", error);
    toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
    return null;
  }
};
