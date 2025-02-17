
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  weight: number
  height: number
  age: number
  gender: 'male' | 'female'
  activityLevel: string
  userId: string
  dailyCalories: number
}

interface DietaryPreferences {
  hasAllergies: boolean
  allergies: string[]
  dietaryRestrictions: string[]
  trainingTime: string | null
}

interface MealDistribution {
  breakfast: number
  morningSnack: number
  lunch: number
  afternoonSnack: number
  dinner: number
}

// Função para calcular as necessidades calóricas por macronutrientes
function calculateMacroNeeds(totalCalories: number, activityLevel: string) {
  let proteinPercentage = 0.25; // 25% das calorias
  let carbsPercentage = 0.50;   // 50% das calorias
  let fatsPercentage = 0.25;    // 25% das calorias

  // Ajusta macros baseado no nível de atividade
  if (activityLevel === 'veryActive') {
    proteinPercentage = 0.30;
    carbsPercentage = 0.50;
    fatsPercentage = 0.20;
  }

  return {
    protein: Math.round((totalCalories * proteinPercentage) / 4), // 4 calorias por grama
    carbs: Math.round((totalCalories * carbsPercentage) / 4),     // 4 calorias por grama
    fats: Math.round((totalCalories * fatsPercentage) / 9),       // 9 calorias por grama
  };
}

// Função para distribuir calorias entre as refeições
function distributeMealCalories(totalCalories: number, trainingTime: string | null): MealDistribution {
  const defaultDistribution = {
    breakfast: 0.25,
    morningSnack: 0.15,
    lunch: 0.30,
    afternoonSnack: 0.10,
    dinner: 0.20,
  };

  // Ajusta distribuição baseado no horário de treino
  if (trainingTime) {
    const trainHour = parseInt(trainingTime.split(':')[0]);
    
    if (trainHour < 10) { // Treino pela manhã
      return {
        breakfast: 0.20,
        morningSnack: 0.25,
        lunch: 0.25,
        afternoonSnack: 0.15,
        dinner: 0.15,
      };
    } else if (trainHour < 16) { // Treino à tarde
      return {
        breakfast: 0.25,
        morningSnack: 0.15,
        lunch: 0.20,
        afternoonSnack: 0.25,
        dinner: 0.15,
      };
    } else { // Treino à noite
      return {
        breakfast: 0.25,
        morningSnack: 0.15,
        lunch: 0.30,
        afternoonSnack: 0.15,
        dinner: 0.15,
      };
    }
  }

  const distribution = { ...defaultDistribution };
  return {
    breakfast: Math.round(totalCalories * distribution.breakfast),
    morningSnack: Math.round(totalCalories * distribution.morningSnack),
    lunch: Math.round(totalCalories * distribution.lunch),
    afternoonSnack: Math.round(totalCalories * distribution.afternoonSnack),
    dinner: Math.round(totalCalories * distribution.dinner),
  };
}

// Função para selecionar alimentos baseado nas restrições e preferências
async function selectFoodsForMeal(
  supabase: any,
  mealType: string,
  targetCalories: number,
  allergies: string[],
  dietaryRestrictions: string[],
  selectedFoods: string[]
) {
  const { data: availableFoods, error } = await supabase
    .from('protocol_foods')
    .select('*')
    .in('id', selectedFoods)
    .contains('meal_type', [mealType])
    .not('common_allergens', 'cs', `{${allergies.join(',')}}`)
    .order('calories');

  if (error) {
    console.error('Error fetching foods:', error);
    return [];
  }

  const selectedMealFoods = [];
  let currentCalories = 0;
  let currentProtein = 0;
  let currentCarbs = 0;
  let currentFats = 0;

  // Algoritmo de seleção de alimentos
  for (const food of availableFoods) {
    if (currentCalories + food.calories <= targetCalories * 1.1) {
      const portion = calculatePortion(food, targetCalories - currentCalories);
      const nutrients = calculateNutrients(food, portion);
      
      selectedMealFoods.push({
        ...food,
        portion,
        calculatedNutrients: nutrients,
      });

      currentCalories += nutrients.calories;
      currentProtein += nutrients.protein;
      currentCarbs += nutrients.carbs;
      currentFats += nutrients.fats;

      if (currentCalories >= targetCalories * 0.9) {
        break;
      }
    }
  }

  return selectedMealFoods;
}

function calculatePortion(food: any, remainingCalories: number) {
  const baseCaloriesPerPortion = food.calories;
  const suggestedPortion = (remainingCalories / baseCaloriesPerPortion) * food.portion_size;
  
  // Limita a porção entre min_portion e max_portion
  if (food.min_portion && food.max_portion) {
    return Math.min(Math.max(suggestedPortion, food.min_portion), food.max_portion);
  }
  
  return suggestedPortion;
}

function calculateNutrients(food: any, portion: number) {
  const multiplier = portion / food.portion_size;
  
  return {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fats: Math.round(food.fats * multiplier * 10) / 10,
    fiber: Math.round((food.fiber || 0) * multiplier * 10) / 10,
  };
}

function generateRecommendations(
  dietaryPreferences: DietaryPreferences,
  macros: any,
  trainingTime: string | null
) {
  const recommendations = {
    general: "Mantenha uma boa hidratação ao longo do dia, bebendo água regularmente.",
    preworkout: "",
    postworkout: "",
    timing: [] as string[],
    healthCondition: null as string | null,
  };

  if (trainingTime) {
    const trainHour = parseInt(trainingTime.split(':')[0]);
    recommendations.preworkout = "Consuma carboidratos de fácil digestão 30-60 minutos antes do treino.";
    recommendations.postworkout = "Após o treino, priorize proteínas e carboidratos para recuperação.";
    
    recommendations.timing.push(
      `Faça sua refeição pré-treino cerca de 1 hora antes do exercício (${trainHour-1}:00)`,
      `Consuma sua refeição pós-treino em até 30 minutos após o término do exercício (${trainHour+1}:00)`
    );
  }

  if (dietaryPreferences.hasAllergies) {
    recommendations.timing.push(
      "Mantenha-se atento aos rótulos dos alimentos para evitar alergenos"
    );
  }

  return recommendations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // Calcula distribuição de macronutrientes
    const macroNeeds = calculateMacroNeeds(userData.dailyCalories, userData.activityLevel);

    // Distribui calorias entre as refeições
    const mealCalories = distributeMealCalories(userData.dailyCalories, dietaryPreferences.trainingTime);

    // Gera as refeições
    const breakfast = await selectFoodsForMeal(
      supabase,
      'breakfast',
      mealCalories.breakfast,
      dietaryPreferences.allergies,
      dietaryPreferences.dietaryRestrictions,
      selectedFoods
    );

    const morningSnack = await selectFoodsForMeal(
      supabase,
      'morning_snack',
      mealCalories.morningSnack,
      dietaryPreferences.allergies,
      dietaryPreferences.dietaryRestrictions,
      selectedFoods
    );

    const lunch = await selectFoodsForMeal(
      supabase,
      'lunch',
      mealCalories.lunch,
      dietaryPreferences.allergies,
      dietaryPreferences.dietaryRestrictions,
      selectedFoods
    );

    const afternoonSnack = await selectFoodsForMeal(
      supabase,
      'afternoon_snack',
      mealCalories.afternoonSnack,
      dietaryPreferences.allergies,
      dietaryPreferences.dietaryRestrictions,
      selectedFoods
    );

    const dinner = await selectFoodsForMeal(
      supabase,
      'dinner',
      mealCalories.dinner,
      dietaryPreferences.allergies,
      dietaryPreferences.dietaryRestrictions,
      selectedFoods
    );

    // Calcula totais nutricionais
    const calculateMealMacros = (foods: any[]) => {
      return foods.reduce((acc, food) => ({
        protein: acc.protein + (food.calculatedNutrients?.protein || 0),
        carbs: acc.carbs + (food.calculatedNutrients?.carbs || 0),
        fats: acc.fats + (food.calculatedNutrients?.fats || 0),
        fiber: acc.fiber + (food.calculatedNutrients?.fiber || 0),
      }), { protein: 0, carbs: 0, fats: 0, fiber: 0 });
    };

    const mealPlan = {
      dailyPlan: {
        breakfast: {
          foods: breakfast,
          calories: mealCalories.breakfast,
          macros: calculateMealMacros(breakfast),
        },
        morningSnack: {
          foods: morningSnack,
          calories: mealCalories.morningSnack,
          macros: calculateMealMacros(morningSnack),
        },
        lunch: {
          foods: lunch,
          calories: mealCalories.lunch,
          macros: calculateMealMacros(lunch),
        },
        afternoonSnack: {
          foods: afternoonSnack,
          calories: mealCalories.afternoonSnack,
          macros: calculateMealMacros(afternoonSnack),
        },
        dinner: {
          foods: dinner,
          calories: mealCalories.dinner,
          macros: calculateMealMacros(dinner),
        },
      },
      totalNutrition: {
        calories: userData.dailyCalories,
        ...macroNeeds,
      },
      recommendations: generateRecommendations(
        dietaryPreferences,
        macroNeeds,
        dietaryPreferences.trainingTime
      ),
    };

    return new Response(
      JSON.stringify(mealPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
