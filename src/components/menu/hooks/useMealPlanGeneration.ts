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
  
  const [generationAttempted, setGenerationAttempted] = useState(false);
  
  let loadingTimer: NodeJS.Timeout | null = null;

  /**
   * Ensures lunch and dinner meals have a protein, carbohydrate, and salad
   */
  const ensureBalancedMeals = (mealPlan: MealPlan): MealPlan => {
    if (!mealPlan || !mealPlan.weeklyPlan) return mealPlan;

    // Iterate through each day in the meal plan
    Object.keys(mealPlan.weeklyPlan).forEach(day => {
      const dayPlan = mealPlan.weeklyPlan[day];
      
      // Function to ensure a meal has the required components
      const balanceMeal = (mealType: 'lunch' | 'dinner') => {
        const meal = dayPlan.meals[mealType];
        if (!meal || !meal.foods) return;
        
        // Check for existing categories
        let hasProtein = false;
        let hasCarbs = false;
        let hasSalad = false;
        
        // Track existing foods for reference
        const existingFoods = [...meal.foods];
        
        // Check existing foods for categories
        existingFoods.forEach(food => {
          const foodName = food.name.toLowerCase();
          
          // Check for protein foods
          if (foodName.includes('frango') || foodName.includes('carne') || 
              foodName.includes('peixe') || foodName.includes('ovo') || 
              foodName.includes('tofu') || foodName.includes('feijão') || 
              foodName.includes('lentilha') || foodName.includes('grão-de-bico')) {
            hasProtein = true;
          }
          
          // Check for carbohydrate foods
          if (foodName.includes('arroz') || foodName.includes('macarrão') || 
              foodName.includes('batata') || foodName.includes('mandioca') || 
              foodName.includes('pão') || foodName.includes('milho') || 
              foodName.includes('quinoa') || foodName.includes('aveia')) {
            hasCarbs = true;
          }
          
          // Check for salad/vegetable foods
          if (foodName.includes('salada') || foodName.includes('alface') || 
              foodName.includes('tomate') || foodName.includes('pepino') || 
              foodName.includes('espinafre') || foodName.includes('rúcula') || 
              foodName.includes('cenoura') || foodName.includes('brócolis') ||
              foodName.includes('legume') || foodName.includes('vegetal')) {
            hasSalad = true;
          }
        });
        
        // Add missing components
        if (!hasProtein) {
          meal.foods.push({
            name: mealType === 'lunch' ? "Peito de frango grelhado" : "Omelete",
            portion: 100,
            unit: "g",
            details: "Preparar na grelha com temperos naturais a gosto."
          });
        }
        
        if (!hasCarbs) {
          meal.foods.push({
            name: mealType === 'lunch' ? "Arroz integral" : "Batata doce",
            portion: 100,
            unit: "g",
            details: "Cozinhar até ficar macio, temperar levemente."
          });
        }
        
        if (!hasSalad) {
          meal.foods.push({
            name: mealType === 'lunch' ? "Salada verde com tomate" : "Mix de folhas verdes",
            portion: 100,
            unit: "g",
            details: "Lavar bem as folhas e vegetais, temperar com azeite, limão e ervas."
          });
        }
        
        // Recalculate meal macros if components were added
        if (!hasProtein || !hasCarbs || !hasSalad) {
          // Default nutrition values for added items
          const proteinNutrition = { calories: 165, protein: 31, carbs: 0, fats: 3.6, fiber: 0 };
          const carbsNutrition = { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, fiber: 1.8 };
          const saladNutrition = { calories: 25, protein: 1.5, carbs: 5, fats: 0.2, fiber: 2.5 };
          
          // Add nutrition for added components
          if (!hasProtein) {
            meal.calories += proteinNutrition.calories;
            meal.macros.protein += proteinNutrition.protein;
            meal.macros.carbs += proteinNutrition.carbs;
            meal.macros.fats += proteinNutrition.fats;
            meal.macros.fiber += proteinNutrition.fiber;
          }
          
          if (!hasCarbs) {
            meal.calories += carbsNutrition.calories;
            meal.macros.protein += carbsNutrition.protein;
            meal.macros.carbs += carbsNutrition.carbs;
            meal.macros.fats += carbsNutrition.fats;
            meal.macros.fiber += carbsNutrition.fiber;
          }
          
          if (!hasSalad) {
            meal.calories += saladNutrition.calories;
            meal.macros.protein += saladNutrition.protein;
            meal.macros.carbs += saladNutrition.carbs;
            meal.macros.fats += saladNutrition.fats;
            meal.macros.fiber += saladNutrition.fiber;
          }
          
          // Update daily totals - Fix the TypeScript error by converting booleans to numbers
          const updatedCalories = (!hasProtein ? proteinNutrition.calories : 0) +
                                 (!hasCarbs ? carbsNutrition.calories : 0) +
                                 (!hasSalad ? saladNutrition.calories : 0);
                                 
          const updatedProtein = (!hasProtein ? proteinNutrition.protein : 0) +
                                (!hasCarbs ? carbsNutrition.protein : 0) +
                                (!hasSalad ? saladNutrition.protein : 0);
                                
          const updatedCarbs = (!hasProtein ? proteinNutrition.carbs : 0) +
                              (!hasCarbs ? carbsNutrition.carbs : 0) +
                              (!hasSalad ? saladNutrition.carbs : 0);
                              
          const updatedFats = (!hasProtein ? proteinNutrition.fats : 0) +
                             (!hasCarbs ? carbsNutrition.fats : 0) +
                             (!hasSalad ? saladNutrition.fats : 0);
                             
          const updatedFiber = (!hasProtein ? proteinNutrition.fiber : 0) +
                              (!hasCarbs ? carbsNutrition.fiber : 0) +
                              (!hasSalad ? saladNutrition.fiber : 0);
          
          dayPlan.dailyTotals.calories += updatedCalories;
          dayPlan.dailyTotals.protein += updatedProtein;
          dayPlan.dailyTotals.carbs += updatedCarbs;
          dayPlan.dailyTotals.fats += updatedFats;
          dayPlan.dailyTotals.fiber += updatedFiber;
        }
      };
      
      // Process lunch and dinner meals
      if (dayPlan && dayPlan.meals) {
        if (dayPlan.meals.lunch) {
          balanceMeal('lunch');
        }
        
        if (dayPlan.meals.dinner) {
          balanceMeal('dinner');
        }
      }
    });
    
    // Recalculate weekly averages
    const weeklyPlan = mealPlan.weeklyPlan || {};
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
    
    mealPlan.weeklyTotals = {
      averageCalories: Math.round(caloriesTotal / dayCount),
      averageProtein: Math.round(proteinTotal / dayCount),
      averageCarbs: Math.round(carbsTotal / dayCount),
      averageFats: Math.round(fatsTotal / dayCount),
      averageFiber: Math.round(fiberTotal / dayCount)
    };
    
    return mealPlan;
  };

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
    setGenerationAttempted(true);
    
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
        
        // Apply meal balancing to ensure protein, carbs, and salad in lunch and dinner
        data.mealPlan = ensureBalancedMeals(data.mealPlan);
      }
      
      if (userData.id) {
        try {
          console.log("Tentando salvar plano alimentar no banco de dados");
          
          // Create a serializable plan object for database storage
          const planData = {
            user_id: userData.id,
            plan_data: JSON.parse(JSON.stringify(data.mealPlan)), // Ensure the data is JSON serializable
            calories: userData.dailyCalories,
            dietary_preferences: JSON.stringify(preferences) // Convert DietaryPreferences to JSON string
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
            
            // If the error is related to JSON serialization, try a different approach
            console.log("Tentando salvar novamente com abordagem alternativa");
            
            const { error: retryError } = await supabase
              .from('meal_plans')
              .insert({
                user_id: userData.id,
                plan_data: JSON.parse(JSON.stringify(data.mealPlan)), // Explicitly convert to JSON
                calories: userData.dailyCalories,
                dietary_preferences: JSON.stringify(preferences) // Convert DietaryPreferences to JSON string
              });
              
            if (retryError) {
              console.error("Erro persistente ao tentar salvar o plano alimentar:", retryError);
              toast.error("Erro ao salvar plano alimentar no banco de dados");
            } else {
              console.log("Plano alimentar salvo com sucesso após ajustes");
              
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
    setMealPlan,
    generationAttempted
  };
};
