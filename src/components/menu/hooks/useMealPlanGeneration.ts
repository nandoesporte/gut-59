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
  
  const generationAttempted = useState(false);
  
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
    
    if (loadingTimer) {
      clearInterval(loadingTimer);
    }
    
    loadingTimer = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    try {
      console.log("Iniciando geração do plano alimentar");
      console.log(`Dados do usuário: ${userData.weight}kg, ${userData.height}cm, ${userData.age} anos, ${userData.gender}`);
      console.log(`Meta: ${userData.goal}, Calorias diárias: ${userData.dailyCalories}kcal`);
      console.log(`Alimentos selecionados: ${selectedFoods.length}`);
      
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

      console.log("Resposta do agente Nutri+:", data);
      
      if (!data?.mealPlan) {
        console.error("Nenhum plano alimentar retornado pelo agente Nutri+");
        console.error("Estrutura da resposta:", JSON.stringify(data).substring(0, 200) + "...");
        setError("Não foi possível gerar o plano alimentar");
        toast.error("Não foi possível gerar o plano alimentar. Por favor, tente novamente.");
        return null;
      }

      console.log("Plano alimentar recebido com sucesso");
      console.log("Estrutura do plano:", Object.keys(data.mealPlan).join(', '));
      console.log("weeklyPlan presente:", !!data.mealPlan.weeklyPlan);
      console.log("weeklyTotals presente:", !!data.mealPlan.weeklyTotals);
      
      if (data.mealPlan) {
        data.mealPlan.userCalories = userData.dailyCalories;
        
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
          
          const dayCount = validDays.length || 1;
          
          let caloriesTotal = 0;
          let proteinTotal = 0;
          let carbsTotal = 0;
          let fatsTotal = 0;
          let fiberTotal = 0;
          
          for (const day of validDays as DayPlan[]) {
            caloriesTotal += Number(day.dailyTotals?.calories || 0);
            proteinTotal += Number(day.dailyTotals?.protein || 0);
            carbsTotal += Number(day.dailyTotals?.carbs || 0);
            fatsTotal += Number(day.dailyTotals?.fats || 0);
            fiberTotal += Number(day.dailyTotals?.fiber || 0);
          }
          
          const averageCalories = Math.round(caloriesTotal / dayCount);
          const averageProtein = Math.round(proteinTotal / dayCount);
          const averageCarbs = Math.round(carbsTotal / dayCount);
          const averageFats = Math.round(fatsTotal / dayCount);
          const averageFiber = Math.round(fiberTotal / dayCount);
          
          data.mealPlan.weeklyTotals = {
            averageCalories,
            averageProtein,
            averageCarbs,
            averageFats,
            averageFiber
          };
        }
      }
      
      if (userData.id) {
        try {
          console.log("Tentando salvar plano alimentar no banco de dados");
          
          const planData = {
            user_id: userData.id,
            plan_data: data.mealPlan,
            calories: userData.dailyCalories,
            dietary_preferences: JSON.stringify(preferences)
          };
          
          if (data.modelUsed) {
            Object.assign(planData, { generated_by: data.modelUsed });
          }
          
          console.log("Dados preparados para inserção na tabela meal_plans:", 
            "user_id:", planData.user_id,
            "plan_data structure:", Object.keys(planData.plan_data),
            "calories:", planData.calories
          );
          
          const { error: saveError, data: savedData } = await supabase
            .from('meal_plans')
            .insert(planData)
            .select();

          if (saveError) {
            console.error("Erro ao salvar plano alimentar:", saveError);
            console.error("Detalhes do erro:", JSON.stringify(saveError, null, 2));
            
            console.log("Tentando salvar com plan_data como string JSON");
            const stringifiedPlanData = {
              ...planData,
              plan_data: JSON.stringify(planData.plan_data)
            };
            
            const { error: retryError } = await supabase
              .from('meal_plans')
              .insert(stringifiedPlanData);
              
            if (retryError) {
              console.error("Erro persistente ao tentar salvar o plano alimentar:", retryError);
              toast.error("Erro ao salvar plano alimentar no banco de dados");
            } else {
              console.log("Plano alimentar salvo com sucesso após converter para string");
              
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
          } else {
            console.log("Plano alimentar salvo com sucesso no banco de dados");
            console.log("Dados salvos:", savedData);
            
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
          console.error("Detalhes da exceção:", dbError instanceof Error ? dbError.message : String(dbError));
          toast.error("Erro ao salvar plano alimentar no banco de dados");
        }
      } else {
        console.warn("Usuário não autenticado. Plano não será salvo no banco de dados.");
        toast.warning("Plano alimentar gerado, mas não foi possível salvar porque o usuário não está autenticado");
      }

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
