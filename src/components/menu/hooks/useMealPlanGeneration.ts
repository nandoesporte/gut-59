import { supabase } from "@/integrations/supabase/client";
import { DietaryPreferences, MealPlan, ProtocolFood } from "../types";
import { toast } from "sonner";
import { TransactionInput } from "@/hooks/wallet/types";

export interface UserData {
  id: string;
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  dailyCalories: number;
}

interface TransactionParams {
  amount: number;
  description: string;
  transactionType: "purchase" | "reward" | "admin";
}

export interface MealPlanGenerationParams {
  userData: UserData;
  selectedFoods: ProtocolFood[];
  foodsByMealType?: { [key: string]: ProtocolFood[] };
  preferences: DietaryPreferences;
  addTransaction?: (params: TransactionParams) => Promise<void>;
}

const standardizeMealPlanFormat = (rawData: any): MealPlan => {
  console.log("Standardizing meal plan format from raw data:", typeof rawData);
  
  if (rawData && rawData.weeklyPlan && typeof rawData.weeklyPlan === 'object') {
    console.log("Data already has weeklyPlan structure");
    return rawData as MealPlan;
  }
  
  if (rawData?.mealPlan?.weeklyPlan) {
    console.log("Data has mealPlan.weeklyPlan structure");
    return rawData.mealPlan as MealPlan;
  }
  
  if (rawData?.meal_plan?.weeklyPlan) {
    console.log("Data has meal_plan.weeklyPlan structure");
    return {
      weeklyPlan: rawData.meal_plan.weeklyPlan,
      weeklyTotals: rawData.meal_plan.weeklyTotals,
      recommendations: rawData.meal_plan.recommendations || { 
        general: "", 
        preworkout: "", 
        postworkout: "", 
        timing: [] 
      }
    };
  }
  
  if (rawData?.meal_plan?.daily_meals || rawData?.meal_plan?.meals) {
    console.log("Converting from Groq format to internal format");
    try {
      const weeklyPlan = {
        monday: createDayPlan("Segunda-feira", rawData.meal_plan),
        tuesday: createDayPlan("Terça-feira", rawData.meal_plan),
        wednesday: createDayPlan("Quarta-feira", rawData.meal_plan),
        thursday: createDayPlan("Quinta-feira", rawData.meal_plan),
        friday: createDayPlan("Sexta-feira", rawData.meal_plan),
        saturday: createDayPlan("Sábado", rawData.meal_plan),
        sunday: createDayPlan("Domingo", rawData.meal_plan)
      };
      
      return {
        weeklyPlan,
        weeklyTotals: rawData.meal_plan.macro_distribution ? {
          averageCalories: Number(rawData.meal_plan.daily_calories || 0),
          averageProtein: Number(rawData.meal_plan.macro_distribution.protein_percentage || 0),
          averageCarbs: Number(rawData.meal_plan.macro_distribution.carbs_percentage || 0),
          averageFats: Number(rawData.meal_plan.macro_distribution.fat_percentage || 0),
          averageFiber: 0
        } : {
          averageCalories: 0,
          averageProtein: 0,
          averageCarbs: 0,
          averageFats: 0,
          averageFiber: 0
        },
        recommendations: rawData.recommendations ? {
          general: "",
          preworkout: "",
          postworkout: "",
          timing: Array.isArray(rawData.recommendations) ? rawData.recommendations : []
        } : {
          general: "",
          preworkout: "",
          postworkout: "",
          timing: []
        }
      };
    } catch (error) {
      console.error("Error converting from Groq format:", error);
      return createMinimalValidMealPlan();
    }
  }
  
  console.error("Unknown meal plan format:", rawData);
  return createMinimalValidMealPlan();
};

const createDayPlan = (dayName: string, mealPlanData: any) => {
  const createMeal = (mealData: any) => {
    if (!mealData) return {
      description: "Refeição não especificada",
      foods: [],
      calories: 0,
      macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
    };
    
    return {
      description: mealData.name || "Refeição",
      foods: Array.isArray(mealData.foods) ? mealData.foods.map((food: any) => ({
        name: food.name || "Alimento não especificado",
        portion: Number(food.portion || 0),
        unit: food.unit || "g",
        details: food.details || ""
      })) : [],
      calories: Number(mealData.total_calories || 0),
      macros: {
        protein: Number(mealData.total_protein || 0),
        carbs: Number(mealData.total_carbs || 0),
        fats: Number(mealData.total_fat || 0),
        fiber: Number(mealData.total_fiber || 0)
      }
    };
  };
  
  let meals = null;
  
  if (mealPlanData.daily_meals) {
    const daily = mealPlanData.daily_meals.find((day: any) => 
      day.day?.toLowerCase() === dayName.toLowerCase());
    
    if (daily && daily.meals) {
      meals = {
        breakfast: createMeal(daily.meals.find((m: any) => m.type === "breakfast")),
        morningSnack: createMeal(daily.meals.find((m: any) => m.type === "morning_snack")),
        lunch: createMeal(daily.meals.find((m: any) => m.type === "lunch")),
        afternoonSnack: createMeal(daily.meals.find((m: any) => m.type === "afternoon_snack")),
        dinner: createMeal(daily.meals.find((m: any) => m.type === "dinner"))
      };
    }
  } else if (mealPlanData.meals) {
    meals = {
      breakfast: createMeal(mealPlanData.meals.find((m: any) => m.type === "breakfast")),
      morningSnack: createMeal(mealPlanData.meals.find((m: any) => m.type === "morning_snack")),
      lunch: createMeal(mealPlanData.meals.find((m: any) => m.type === "lunch")),
      afternoonSnack: createMeal(mealPlanData.meals.find((m: any) => m.type === "afternoon_snack")),
      dinner: createMeal(mealPlanData.meals.find((m: any) => m.type === "dinner"))
    };
  }
  
  if (!meals) {
    meals = {
      breakfast: createMeal(null),
      morningSnack: createMeal(null),
      lunch: createMeal(null),
      afternoonSnack: createMeal(null),
      dinner: createMeal(null)
    };
  }
  
  const dailyTotals = {
    calories: Object.values(meals).reduce((sum, meal) => sum + (meal.calories || 0), 0),
    protein: Object.values(meals).reduce((sum, meal) => sum + (meal.macros.protein || 0), 0),
    carbs: Object.values(meals).reduce((sum, meal) => sum + (meal.macros.carbs || 0), 0),
    fats: Object.values(meals).reduce((sum, meal) => sum + (meal.macros.fats || 0), 0),
    fiber: Object.values(meals).reduce((sum, meal) => sum + (meal.macros.fiber || 0), 0)
  };
  
  return { dayName, meals, dailyTotals };
};

const createMinimalValidMealPlan = (): MealPlan => {
  const emptyMeal = {
    description: "Refeição não disponível",
    foods: [],
    calories: 0,
    macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
  };
  
  const emptyDayPlan = {
    dayName: "",
    meals: {
      breakfast: emptyMeal,
      morningSnack: emptyMeal,
      lunch: emptyMeal,
      afternoonSnack: emptyMeal,
      dinner: emptyMeal
    },
    dailyTotals: { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  };
  
  return {
    weeklyPlan: {
      monday: { ...emptyDayPlan, dayName: "Segunda-feira" },
      tuesday: { ...emptyDayPlan, dayName: "Terça-feira" },
      wednesday: { ...emptyDayPlan, dayName: "Quarta-feira" },
      thursday: { ...emptyDayPlan, dayName: "Quinta-feira" },
      friday: { ...emptyDayPlan, dayName: "Sexta-feira" },
      saturday: { ...emptyDayPlan, dayName: "Sábado" },
      sunday: { ...emptyDayPlan, dayName: "Domingo" }
    },
    weeklyTotals: {
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFats: 0,
      averageFiber: 0
    },
    recommendations: {
      general: "Não foi possível gerar recomendações",
      preworkout: "",
      postworkout: "",
      timing: []
    },
    generatedBy: "fallback"
  };
};

export const generateMealPlan = async (params: MealPlanGenerationParams): Promise<MealPlan | null> => {
  const { userData, selectedFoods, preferences } = params;
  
  try {
    console.log("Generating meal plan with Groq...");
    
    const userInput = {
      userData: {
        ...userData,
        dailyCalories: userData.dailyCalories || 2000
      },
      selectedFoods: selectedFoods.map(food => ({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        fiber: food.fiber || 0
      })),
      dietaryPreferences: preferences
    };
    
    console.log("Sending data to Groq API:", JSON.stringify(userInput).substring(0, 300) + "...");
    
    const response = await supabase.functions.invoke('generate-meal-plan-groq', {
      body: { userInput, user_id: userData.id }
    });
    
    console.log("Response from generate-meal-plan-groq:", response);
    
    if (response.error) {
      console.error("Error from Groq API:", response.error);
      throw new Error(`Erro ao gerar plano alimentar: ${response.error.message || "Erro desconhecido"}`);
    }
    
    if (!response.data) {
      throw new Error("Resposta vazia do servidor");
    }
    
    if (params.addTransaction) {
      try {
        await params.addTransaction({
          amount: -10,
          description: "Geração de plano alimentar",
          transactionType: "purchase"
        });
        console.log("Transaction added for meal plan generation");
      } catch (txError) {
        console.error("Failed to add transaction:", txError);
      }
    }
    
    console.log("Response data format:", response.data);
    
    const standardizedPlan = standardizeMealPlanFormat(response.data.mealPlan || response.data);
    standardizedPlan.userCalories = userData.dailyCalories;
    standardizedPlan.generatedBy = "groq";
    
    console.log("Standardized meal plan has weeklyPlan:", !!standardizedPlan.weeklyPlan);
    
    try {
      const planJson = JSON.parse(JSON.stringify(standardizedPlan));
      
      if (!response.data.id) {
        const preferencesJson = JSON.stringify(preferences);
        
        const { error } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userData.id,
            plan_data: planJson,
            calories: userData.dailyCalories,
            dietary_preferences: preferencesJson
          });
          
        if (error) {
          console.error("Error storing meal plan in database:", error);
        } else {
          console.log("Meal plan saved to database");
        }
      }
    } catch (dbError) {
      console.error("Error saving meal plan to database:", dbError);
    }
    
    return standardizedPlan;
  } catch (error) {
    console.error("Error generating meal plan:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao gerar plano alimentar");
    return null;
  }
};
