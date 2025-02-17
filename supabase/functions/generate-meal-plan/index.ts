
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import type { ProtocolFood, DietaryPreferences, MealPlan } from '../../../src/components/menu/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestData {
  userData: {
    userId: string;
    weight: number;
    height: number;
    age: number;
    gender: 'male' | 'female';
    activityLevel: string;
    goal: 'lose' | 'maintain' | 'gain';
    healthCondition: string | null;
    dailyCalories: number;
  };
  selectedFoods: string[];
  dietaryPreferences: DietaryPreferences;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting meal plan generation...');
    const { userData, selectedFoods, dietaryPreferences } = await req.json() as RequestData;

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar alimentos selecionados
    const { data: foods, error: foodsError } = await supabase
      .from('protocol_foods')
      .select('*')
      .in('id', selectedFoods);

    if (foodsError) throw foodsError;

    // Gerar plano de refeições
    const mealPlan: MealPlan = {
      dailyPlan: {
        breakfast: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        morningSnack: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        lunch: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        afternoonSnack: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        dinner: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        }
      },
      totalNutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0
      },
      recommendations: {
        preworkout: generatePreWorkoutRecommendation(dietaryPreferences.trainingTime),
        postworkout: generatePostWorkoutRecommendation(userData.goal),
        general: generateGeneralRecommendation(userData),
        timing: generateMealTiming(dietaryPreferences.trainingTime),
        healthCondition: userData.healthCondition as "hipertensao" | "diabetes" | "depressao_ansiedade" | null,
      },
      nutritionalAnalysis: {
        carbsPercentage: 0,
        proteinPercentage: 0,
        fatsPercentage: 0,
        fiberAdequate: false,
        vitaminsComplete: false,
        mineralsComplete: false
      }
    };

    // Distribuir alimentos nas refeições
    distributeFoodsInMeals(mealPlan, foods as ProtocolFood[], userData.dailyCalories);

    // Calcular análise nutricional
    calculateNutritionalAnalysis(mealPlan);

    // Log do plano gerado
    console.log('Generated meal plan:', JSON.stringify(mealPlan, null, 2));

    return new Response(
      JSON.stringify(mealPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      },
    )
  }
})

function generatePreWorkoutRecommendation(trainingTime: string | null): string {
  if (!trainingTime) return "Recomendado consumir carboidratos de fácil absorção 30-60 minutos antes do treino.";
  
  const hour = parseInt(trainingTime.split(':')[0]);
  if (hour < 12) {
    return "Café da manhã reforçado em carboidratos 1 hora antes do treino.";
  } else if (hour < 16) {
    return "Almoço leve 2 horas antes do treino, com snack de carboidrato 30 minutos antes.";
  } else {
    return "Lanche com carboidratos e proteínas 1 hora antes do treino.";
  }
}

function generatePostWorkoutRecommendation(goal: string): string {
  switch (goal) {
    case 'gain':
      return "Consumir proteínas e carboidratos em até 30 minutos após o treino para maximizar ganhos.";
    case 'lose':
      return "Priorizar proteínas magras após o treino, moderando carboidratos.";
    default:
      return "Equilibrar proteínas e carboidratos após o treino para recuperação muscular.";
  }
}

function generateGeneralRecommendation(userData: RequestData['userData']): string {
  const recommendations = [];
  
  if (userData.healthCondition === 'hipertensao') {
    recommendations.push("Controlar consumo de sódio, priorizando alimentos in natura.");
  }
  if (userData.healthCondition === 'diabetes') {
    recommendations.push("Distribuir carboidratos ao longo do dia, priorizando baixo índice glicêmico.");
  }
  if (userData.goal === 'lose') {
    recommendations.push("Criar déficit calórico moderado, mantendo alta ingestão proteica.");
  }
  if (userData.goal === 'gain') {
    recommendations.push("Superávit calórico com foco em proteínas e carboidratos para ganho muscular.");
  }

  return recommendations.join(" ");
}

function generateMealTiming(trainingTime: string | null): string[] {
  const timings = [];
  
  if (trainingTime) {
    const hour = parseInt(trainingTime.split(':')[0]);
    if (hour < 12) {
      timings.push("Café da manhã: 2h antes do treino");
      timings.push("Pré-treino: 30min antes");
      timings.push("Pós-treino: até 30min após");
    } else if (hour < 16) {
      timings.push("Almoço: 2h antes do treino");
      timings.push("Pré-treino: 30min antes");
      timings.push("Pós-treino: até 30min após");
    } else {
      timings.push("Lanche da tarde: 1h antes do treino");
      timings.push("Pós-treino: até 30min após");
      timings.push("Jantar: 1h após pós-treino");
    }
  }

  return timings;
}

function distributeFoodsInMeals(
  mealPlan: MealPlan,
  foods: ProtocolFood[],
  targetCalories: number
) {
  // Distribuição calórica por refeição
  const mealDistribution = {
    breakfast: 0.25,
    morningSnack: 0.15,
    lunch: 0.3,
    afternoonSnack: 0.1,
    dinner: 0.2
  };

  // Distribuir alimentos por refeição
  Object.entries(mealDistribution).forEach(([meal, percentage]) => {
    const mealCalories = targetCalories * percentage;
    const mealFoods = selectFoodsForMeal(foods, mealCalories, meal);
    
    if (meal in mealPlan.dailyPlan) {
      const mealKey = meal as keyof typeof mealPlan.dailyPlan;
      mealPlan.dailyPlan[mealKey].foods = mealFoods;
      calculateMealNutrition(mealPlan.dailyPlan[mealKey]);
    }
  });

  // Calcular totais
  calculateTotalNutrition(mealPlan);
}

function selectFoodsForMeal(
  foods: ProtocolFood[],
  targetCalories: number,
  mealType: string
): ProtocolFood[] {
  const selectedFoods: ProtocolFood[] = [];
  let currentCalories = 0;

  // Filtrar alimentos adequados para o tipo de refeição
  const suitableFoods = foods.filter(food => 
    food.meal_type?.includes('any') || food.meal_type?.includes(mealType)
  );

  // Selecionar alimentos até atingir as calorias alvo
  while (currentCalories < targetCalories && suitableFoods.length > 0) {
    const randomIndex = Math.floor(Math.random() * suitableFoods.length);
    const food = suitableFoods[randomIndex];
    
    if (currentCalories + food.calories <= targetCalories * 1.1) {
      selectedFoods.push(food);
      currentCalories += food.calories;
    }
    
    suitableFoods.splice(randomIndex, 1);
  }

  return selectedFoods;
}

function calculateMealNutrition(meal: MealPlan['dailyPlan']['breakfast']) {
  meal.calories = 0;
  meal.macros = { protein: 0, carbs: 0, fats: 0, fiber: 0 };

  meal.foods.forEach(food => {
    meal.calories += food.calories;
    meal.macros.protein += food.protein;
    meal.macros.carbs += food.carbs;
    meal.macros.fats += food.fats;
    meal.macros.fiber += food.fiber || 0;
  });
}

function calculateTotalNutrition(mealPlan: MealPlan) {
  const total = mealPlan.totalNutrition;
  total.calories = 0;
  total.protein = 0;
  total.carbs = 0;
  total.fats = 0;
  total.fiber = 0;

  Object.values(mealPlan.dailyPlan).forEach(meal => {
    total.calories += meal.calories;
    total.protein += meal.macros.protein;
    total.carbs += meal.macros.carbs;
    total.fats += meal.macros.fats;
    total.fiber += meal.macros.fiber;
  });
}

function calculateNutritionalAnalysis(mealPlan: MealPlan) {
  const total = mealPlan.totalNutrition;
  const totalMacros = total.protein + total.carbs + total.fats;

  mealPlan.nutritionalAnalysis = {
    carbsPercentage: (total.carbs * 4 / (total.calories || 1)) * 100,
    proteinPercentage: (total.protein * 4 / (total.calories || 1)) * 100,
    fatsPercentage: (total.fats * 9 / (total.calories || 1)) * 100,
    fiberAdequate: total.fiber >= 25,
    vitaminsComplete: checkVitaminsComplete(mealPlan),
    mineralsComplete: checkMineralsComplete(mealPlan)
  };
}

function checkVitaminsComplete(mealPlan: MealPlan): boolean {
  // Implementar lógica de verificação de vitaminas
  return true;
}

function checkMineralsComplete(mealPlan: MealPlan): boolean {
  // Implementar lógica de verificação de minerais
  return true;
}
