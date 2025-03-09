
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DietaryPreferences, MealPlan, ProtocolFood, DayPlan } from "../types";
import { REWARDS } from "@/constants/rewards";
import { useWallet } from "@/hooks/useWallet";

export const useMealPlanGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTime, setLoadingTime] = useState(0);
  const { addTransaction } = useWallet();
  
  // Track generation attempts to handle retries
  const generationAttempted = useState(false);
  
  // Timer to track loading time
  let loadingTimer: NodeJS.Timeout | null = null;

  const generatePlan = async (
    userData: {
      id?: string;
      weight: number;
      height: number;
      age: number;
      gender: string;
      activityLevel: string;
      goal?: string;
      dailyCalories: number;
    },
    selectedFoods: ProtocolFood[],
    foodsByMealType: Record<string, string[]>,
    preferences: DietaryPreferences
  ) => {
    setLoading(true);
    setError(null);
    setLoadingTime(0);
    
    // Clear any existing timer
    if (loadingTimer) {
      clearInterval(loadingTimer);
    }
    
    // Start timer to track loading time
    loadingTimer = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    try {
      console.log("Iniciando geração do plano alimentar");
      console.log(`Dados do usuário: ${userData.weight}kg, ${userData.height}cm, ${userData.age} anos, ${userData.gender}`);
      console.log(`Meta: ${userData.goal}, Calorias diárias: ${userData.dailyCalories}kcal`);
      console.log(`Alimentos selecionados: ${selectedFoods.length}`);
      
      // Call the edge function to generate the meal plan
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
        console.error("Erro ao chamar o agente Nutri+:", error);
        setError(`Erro ao gerar plano alimentar: ${error.message}`);
        toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
        return null;
      }

      if (!data?.mealPlan) {
        console.error("Nenhum plano alimentar retornado pelo agente Nutri+");
        setError("Não foi possível gerar o plano alimentar");
        toast.error("Não foi possível gerar o plano alimentar. Por favor, tente novamente.");
        return null;
      }

      console.log("Plano alimentar recebido com sucesso");
      
      // Ensure the meal plan uses the user's specified daily calories
      if (data.mealPlan) {
        data.mealPlan.userCalories = userData.dailyCalories;
        
        // Process weeklyTotals if missing or has NaN values
        if (!data.mealPlan.weeklyTotals || 
            isNaN(Number(data.mealPlan.weeklyTotals.averageCalories)) || 
            isNaN(Number(data.mealPlan.weeklyTotals.averageProtein))) {
          
          console.log("Recalculando médias semanais");
          
          const weeklyPlan = data.mealPlan.weeklyPlan || {};
          const days = Object.values(weeklyPlan);
          const validDays = days.filter((day: any) => 
            day && day.dailyTotals && 
            !isNaN(Number(day.dailyTotals.calories)) && 
            !isNaN(Number(day.dailyTotals.protein))
          );
          
          // Safely calculate the number of days, defaulting to 1 if there are no valid days
          const dayCount = validDays.length || 1;
          
          // Calculate each total nutrition value explicitly
          let caloriesTotal = 0;
          let proteinTotal = 0;
          let carbsTotal = 0;
          let fatsTotal = 0;
          let fiberTotal = 0;
          
          // Iterate through days and sum up the nutrition values
          // Explicitly type the day variable as DayPlan to fix the TypeScript error
          for (const day of validDays as DayPlan[]) {
            caloriesTotal += Number(day.dailyTotals?.calories || 0);
            proteinTotal += Number(day.dailyTotals?.protein || 0);
            carbsTotal += Number(day.dailyTotals?.carbs || 0);
            fatsTotal += Number(day.dailyTotals?.fats || 0);
            fiberTotal += Number(day.dailyTotals?.fiber || 0);
          }
          
          // Calculate averages
          const averageCalories = Math.round(caloriesTotal / dayCount);
          const averageProtein = Math.round(proteinTotal / dayCount);
          const averageCarbs = Math.round(carbsTotal / dayCount);
          const averageFats = Math.round(fatsTotal / dayCount);
          const averageFiber = Math.round(fiberTotal / dayCount);
          
          // Assign calculated values to the meal plan
          data.mealPlan.weeklyTotals = {
            averageCalories,
            averageProtein,
            averageCarbs,
            averageFats,
            averageFiber
          };
        }
      }
      
      // Save the meal plan to the database if user is authenticated
      if (userData.id) {
        try {
          const { error: saveError } = await supabase
            .from('meal_plans')
            .insert({
              user_id: userData.id,
              plan_data: data.mealPlan,
              calories: userData.dailyCalories,
              generated_by: data.modelUsed || "nutri-plus-agent-llama3",
              dietary_preferences: JSON.stringify(preferences) // Convert preferences to JSON string
            });

          if (saveError) {
            console.error("Erro ao salvar plano alimentar:", saveError);
            toast.error("Erro ao salvar plano alimentar no banco de dados");
          } else {
            console.log("Plano alimentar salvo no banco de dados");
            
            // Add transaction if wallet function is available
            if (addTransaction) {
              await addTransaction({
                amount: REWARDS.MEAL_PLAN || 10,
                type: 'meal_plan',
                description: 'Geração de plano alimentar'
              });
              console.log("Transação adicionada para geração do plano alimentar");
            }
            
            toast.success("Plano alimentar gerado e salvo com sucesso!");
          }
        } catch (dbError) {
          console.error("Erro ao salvar plano alimentar no banco de dados:", dbError);
          toast.error("Erro ao salvar plano alimentar no banco de dados");
        }
      } else {
        toast.warning("Plano alimentar gerado, mas não foi possível salvar porque o usuário não está autenticado");
      }

      // Set the generated meal plan
      setMealPlan(data.mealPlan);
      return data.mealPlan;
    } catch (error: any) {
      console.error("Erro inesperado em generateMealPlan:", error);
      setError(`Erro ao gerar plano alimentar: ${error.message}`);
      toast.error("Erro ao gerar plano alimentar. Por favor, tente novamente.");
      return null;
    } finally {
      setLoading(false);
      if (loadingTimer) {
        clearInterval(loadingTimer);
        loadingTimer = null;
      }
    }
  };

  return {
    loading,
    mealPlan,
    error,
    generatePlan,
    loadingTime,
    setMealPlan
  };
};
