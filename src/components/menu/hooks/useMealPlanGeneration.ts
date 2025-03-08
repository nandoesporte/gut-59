
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
    console.log("📡 Chamando função llama-completion para gerar plano alimentar em português");
    
    // Convert foodsByMealType from ProtocolFood[] to expected format for edge function
    const simplifiedFoodsByMealType: Record<string, string[]> = {};
    Object.entries(foodsByMealType).forEach(([mealType, foods]) => {
      simplifiedFoodsByMealType[mealType] = foods.map(food => food.name);
    });
    
    // Create a translated meal type mapping
    const mealTypeTranslations = {
      breakfast: "café da manhã",
      morningSnack: "lanche da manhã",
      lunch: "almoço",
      afternoonSnack: "lanche da tarde",
      dinner: "jantar"
    };

    // Translate meal types for the prompt
    const translatedFoodsByMealType: Record<string, string[]> = {};
    Object.entries(simplifiedFoodsByMealType).forEach(([mealType, foods]) => {
      const translatedMealType = mealTypeTranslations[mealType as keyof typeof mealTypeTranslations] || mealType;
      translatedFoodsByMealType[translatedMealType] = foods;
    });
    
    // Prepare a meal plan prompt in Portuguese
    const prompt = `
    Crie um plano alimentar semanal personalizado para as seguintes características:
    
    Peso: ${userData.weight}kg
    Altura: ${userData.height}cm
    Idade: ${userData.age} anos
    Gênero: ${userData.gender === 'male' ? 'Masculino' : 'Feminino'}
    Nível de Atividade: ${userData.activityLevel}
    Objetivo: ${userData.goal || 'Manutenção'}
    Calorias Diárias: ${userData.dailyCalories}kcal
    
    Preferências alimentares: ${JSON.stringify(preferences)}
    
    Alimentos disponíveis por tipo de refeição: ${JSON.stringify(translatedFoodsByMealType)}
    
    O plano deve seguir estes critérios:
    1. Distribuir as calorias diárias adequadamente entre as refeições.
    2. Incluir café da manhã, lanche da manhã, almoço, lanche da tarde e jantar.
    3. Usar apenas os alimentos listados.
    4. Criar um plano variado para 7 dias da semana.
    5. Incluir macronutrientes para cada refeição (proteínas, carboidratos, gorduras e fibras) em formato numérico.
    
    Responda apenas com o objeto JSON do plano alimentar, sem texto adicional, contendo:
    - weeklyPlan: com os dias da semana e suas refeições
    - weeklyTotals: com médias semanais de calorias e macronutrientes
    - recommendations: com recomendações nutricionais
    
    Formate os nomes dos dias em português (Segunda-feira, Terça-feira, etc).
    `;

    // Call the llama-completion edge function
    const { data, error } = await supabase.functions.invoke('llama-completion', {
      body: {
        prompt,
        temperature: 0.5 // More deterministic responses
      }
    });

    if (error) {
      console.error("❌ Erro ao chamar o agente Nutri+:", error);
      toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
      return null;
    }

    if (!data?.completion) {
      console.error("❌ Nenhum plano alimentar retornado pelo agente Nutri+");
      console.error("Resposta completa:", data);
      toast.error("Não foi possível gerar o plano alimentar. Por favor, tente novamente.");
      return null;
    }

    console.log("✅ Plano alimentar recebido com sucesso do agente Nutri+");
    
    // Parse the completion to get the JSON
    let mealPlanData;
    try {
      // Extract JSON from the response
      const jsonString = data.completion;
      
      // Try to parse the JSON directly
      try {
        mealPlanData = JSON.parse(jsonString);
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from a markdown code block
        const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          mealPlanData = JSON.parse(jsonMatch[1].trim());
        } else {
          // If still no match, look for { } pattern
          const braceMatch = jsonString.match(/\{[\s\S]*\}/);
          if (braceMatch) {
            mealPlanData = JSON.parse(braceMatch[0]);
          } else {
            throw new Error("Não foi possível extrair JSON válido da resposta");
          }
        }
      }
      
      // Check if we have a direct mealPlan object or if it's nested under a mealPlan property
      if (mealPlanData.mealPlan) {
        mealPlanData = mealPlanData.mealPlan;
      }
      
      // Ensure the meal plan uses the user's specified daily calories
      if (mealPlanData && userData.dailyCalories) {
        mealPlanData.userCalories = userData.dailyCalories;
        
        // Ensure weeklyTotals exists and has valid values
        if (!mealPlanData.weeklyTotals || 
            isNaN(mealPlanData.weeklyTotals.averageCalories) || 
            isNaN(mealPlanData.weeklyTotals.averageProtein)) {
          
          console.log("⚠️ Recalculando médias semanais devido a valores ausentes ou NaN");
          
          // Convert weeklyPlan to array of day plans with validation
          const weeklyPlan = mealPlanData.weeklyPlan || {};
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
          
          mealPlanData.weeklyTotals = {
            averageCalories: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.calories, 0) / dayCount),
            averageProtein: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.protein, 0) / dayCount),
            averageCarbs: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.carbs, 0) / dayCount),
            averageFats: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.fats, 0) / dayCount),
            averageFiber: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.fiber, 0) / dayCount)
          };
        }
      }
      
      // Add generatedBy property to track which service generated the plan
      mealPlanData.generatedBy = "llama-completion-pt-BR";
      
      console.log("📋 Dados do plano processados:", JSON.stringify(mealPlanData).substring(0, 200) + "...");
    } catch (jsonError) {
      console.error("❌ Erro ao processar JSON do plano alimentar:", jsonError);
      console.error("Resposta completa:", data.completion);
      toast.error("Erro ao processar o plano alimentar. Por favor, tente novamente.");
      return null;
    }
    
    // Save the meal plan to the database if user is authenticated
    if (userData.id) {
      try {
        // Check if we have a user ID before attempting to save
        console.log("💾 Tentando salvar plano alimentar para o usuário:", userData.id);
        
        // Create a clean version of the meal plan for database storage
        // Using JSON.stringify and then JSON.parse to ensure we have a plain JavaScript object
        // This removes any special prototypes or non-serializable properties
        const mealPlanForStorage = JSON.parse(JSON.stringify(mealPlanData));
        
        // We need to explicitly cast the meal plan to any to bypass TypeScript checking
        // because Supabase expects a specific Json type that doesn't match our MealPlan type
        const { error: saveError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userData.id,
            plan_data: mealPlanForStorage as any, // Cast to any to bypass TypeScript checking
            calories: userData.dailyCalories,
            generated_by: "llama-completion-pt-BR",
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

    // Return the meal plan 
    return mealPlanData as MealPlan;
  } catch (error) {
    console.error("❌ Erro inesperado em generateMealPlan:", error);
    toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
    return null;
  }
};
