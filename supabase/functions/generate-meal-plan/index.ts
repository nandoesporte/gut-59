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
  goal: 'lose' | 'maintain' | 'gain'
  userId: string
  dailyCalories: number
}

interface DietaryPreferences {
  hasAllergies: boolean
  allergies: string[]
  dietaryRestrictions: string[]
  trainingTime: string | null
}

function adjustCaloriesForGoal(calories: number, goal: string) {
  switch (goal) {
    case 'lose':
      return Math.round(calories * 0.8); // Déficit de 20%
    case 'gain':
      return Math.round(calories * 1.2); // Superávit de 20%
    default:
      return calories;
  }
}

function calculateMacroNeeds(totalCalories: number, goal: string, activityLevel: string) {
  let proteinPercentage: number;
  let carbsPercentage: number;
  let fatsPercentage: number;

  switch (goal) {
    case 'lose':
      proteinPercentage = 0.35; // 35% proteína para preservar massa magra
      carbsPercentage = 0.40;   // 40% carboidratos
      fatsPercentage = 0.25;    // 25% gorduras
      break;
    case 'gain':
      proteinPercentage = 0.30; // 30% proteína para construção muscular
      carbsPercentage = 0.50;   // 50% carboidratos para energia
      fatsPercentage = 0.20;    // 20% gorduras
      break;
    default: // maintain
      proteinPercentage = 0.25; // 25% proteína
      carbsPercentage = 0.50;   // 50% carboidratos
      fatsPercentage = 0.25;    // 25% gorduras
  }

  if (activityLevel === 'veryActive' || activityLevel === 'moderatelyActive') {
    carbsPercentage += 0.05;
    fatsPercentage -= 0.05;
  }

  return {
    protein: Math.round((totalCalories * proteinPercentage) / 4),
    carbs: Math.round((totalCalories * carbsPercentage) / 4),
    fats: Math.round((totalCalories * fatsPercentage) / 9),
  };
}

function distributeMealCalories(totalCalories: number, goal: string, trainingTime: string | null) {
  let distribution = {
    breakfast: 0.25,
    morningSnack: 0.15,
    lunch: 0.30,
    afternoonSnack: 0.10,
    dinner: 0.20,
  };

  if (goal === 'lose') {
    distribution = {
      breakfast: 0.30,
      morningSnack: 0.15,
      lunch: 0.25,
      afternoonSnack: 0.15,
      dinner: 0.15,
    };
  } else if (goal === 'gain') {
    distribution = {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.25,
      afternoonSnack: 0.15,
      dinner: 0.20,
    };
  }

  if (trainingTime) {
    const trainHour = parseInt(trainingTime.split(':')[0]);
    
    if (trainHour < 10) {
      distribution.breakfast = 0.20;
      distribution.morningSnack = 0.25;
    } else if (trainHour < 16) {
      distribution.lunch = 0.20;
      distribution.afternoonSnack = 0.25;
    } else {
      distribution.dinner = 0.25;
      distribution.afternoonSnack = 0.20;
    }
  }

  return {
    breakfast: Math.round(totalCalories * distribution.breakfast),
    morningSnack: Math.round(totalCalories * distribution.morningSnack),
    lunch: Math.round(totalCalories * distribution.lunch),
    afternoonSnack: Math.round(totalCalories * distribution.afternoonSnack),
    dinner: Math.round(totalCalories * distribution.dinner),
  };
}

async function selectFoodsForMeal(
  supabase: any,
  mealType: string,
  targetCalories: number,
  goal: string,
  allergies: string[],
  dietaryRestrictions: string[],
  selectedFoods: string[]
) {
  const query = supabase
    .from('protocol_foods')
    .select('*')
    .in('id', selectedFoods)
    .contains('meal_type', [mealType])
    .not('common_allergens', 'cs', `{${allergies.join(',')}}`);

  if (goal === 'lose') {
    query.lt('calories', 400);
  } else if (goal === 'gain') {
    query.gt('protein_per_100g', 15);
  }

  const { data: availableFoods, error } = await query;

  if (error) {
    console.error('Error fetching foods:', error);
    return [];
  }

  const selectedMealFoods = [];
  let currentCalories = 0;
  let currentProtein = 0;
  let currentCarbs = 0;
  let currentFats = 0;

  const sortedFoods = availableFoods.sort((a: any, b: any) => {
    if (goal === 'lose') {
      return (a.protein_per_100g / a.calories) - (b.protein_per_100g / b.calories);
    } else if (goal === 'gain') {
      return b.protein - a.protein;
    }
    return a.calories - b.calories;
  });

  for (const food of sortedFoods) {
    if (currentCalories + food.calories <= targetCalories * 1.1) {
      const portion = calculatePortion(food, targetCalories - currentCalories, goal);
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

function calculatePortion(food: any, remainingCalories: number, goal: string) {
  let baseMultiplier = 1;
  
  if (goal === 'lose') {
    baseMultiplier = 0.8;
  } else if (goal === 'gain') {
    baseMultiplier = 1.2;
  }

  const suggestedPortion = (remainingCalories / food.calories) * food.portion_size * baseMultiplier;
  
  if (food.min_portion && food.max_portion) {
    return Math.min(Math.max(suggestedPortion, food.min_portion), food.max_portion);
  }
  
  return suggestedPortion;
}

function calculateNutrients(food: any, portion: number) {
  const multiplier = portion / (food.portion_size || 100);
  
  return {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fats: Math.round(food.fats * multiplier * 10) / 10,
    fiber: Math.round((food.fiber || 0) * multiplier * 10) / 10,
  };
}

function generateRecommendations(
  goal: string,
  dietaryPreferences: DietaryPreferences,
  macros: any,
  trainingTime: string | null,
  activityLevel: string
) {
  const recommendations = {
    general: "",
    preworkout: "",
    postworkout: "",
    timing: [] as string[],
  };

  if (activityLevel === 'sedentary' || activityLevel === 'lightlyActive') {
    recommendations.general = 
      "IMPORTANTE: Seu nível atual de atividade física está baixo. Recomendamos fortemente que você: \n" +
      "1. Inicie uma rotina regular de exercícios físicos\n" +
      "2. Comece com atividades leves como caminhada\n" +
      "3. Busque orientação profissional para iniciar atividades físicas\n" +
      "4. Atualize seu plano alimentar após estabelecer uma rotina de exercícios\n\n";
  }

  switch (goal) {
    case 'lose':
      recommendations.general += 
        "Mantenha um déficit calórico controlado e foque em alimentos ricos em proteína para preservar a massa magra. " +
        "Distribua as refeições ao longo do dia para controlar a fome.";
      recommendations.timing.push(
        "Faça refeições a cada 3-4 horas para manter o metabolismo ativo",
        "Evite refeições pesadas próximo ao horário de dormir"
      );
      break;
    case 'gain':
      recommendations.general += 
        "Mantenha um superávit calórico controlado com foco em proteínas de alta qualidade. " +
        "Priorize refeições mais calóricas após o treino.";
      recommendations.timing.push(
        "Aumente gradualmente o tamanho das porções",
        "Consuma proteína em todas as refeições principais"
      );
      break;
    default:
      recommendations.general += 
        "Mantenha uma alimentação equilibrada com foco em alimentos nutritivos. " +
        "Distribua bem os macronutrientes ao longo do dia.";
      recommendations.timing.push(
        "Mantenha horários regulares para as refeições",
        "Equilibre proteínas, carboidratos e gorduras boas"
      );
  }

  if (trainingTime) {
    const trainHour = parseInt(trainingTime.split(':')[0]);
    
    if (goal === 'lose') {
      recommendations.preworkout = 
        "Consuma uma refeição leve com carboidratos complexos 1-2 horas antes do treino.";
      recommendations.postworkout = 
        "Priorize proteínas magras e carboidratos moderados após o treino.";
    } else if (goal === 'gain') {
      recommendations.preworkout = 
        "Faça uma refeição rica em carboidratos e proteínas 1-2 horas antes do treino.";
      recommendations.postworkout = 
        "Consuma proteínas de rápida absorção e carboidratos logo após o treino.";
    } else {
      recommendations.preworkout = 
        "Consuma carboidratos de fácil digestão 30-60 minutos antes do treino.";
      recommendations.postworkout = 
        "Equilibre proteínas e carboidratos após o treino para recuperação.";
    }

    recommendations.timing.push(
      `Faça sua refeição pré-treino cerca de 1-2 horas antes do exercício (${trainHour-2}:00)`,
      `Consuma sua refeição pós-treino em até 30 minutos após o término do exercício (${trainHour+1}:00)`
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

    const adjustedCalories = adjustCaloriesForGoal(userData.dailyCalories, userData.goal);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    const macroNeeds = calculateMacroNeeds(adjustedCalories, userData.goal, userData.activityLevel);

    const mealCalories = distributeMealCalories(
      adjustedCalories,
      userData.goal,
      dietaryPreferences.trainingTime
    );

    const breakfast = await selectFoodsForMeal(
      supabase,
      'breakfast',
      mealCalories.breakfast,
      userData.goal,
      dietaryPreferences.allergies,
      dietaryPreferences.dietaryRestrictions,
      selectedFoods
    );

    const morningSnack = await selectFoodsForMeal(
      supabase,
      'morning_snack',
      mealCalories.morningSnack,
      userData.goal,
      dietaryPreferences.allergies,
      dietaryPreferences.dietaryRestrictions,
      selectedFoods
    );

    const lunch = await selectFoodsForMeal(
      supabase,
      'lunch',
      mealCalories.lunch,
      userData.goal,
      dietaryPreferences.allergies,
      dietaryPreferences.dietaryRestrictions,
      selectedFoods
    );

    const afternoonSnack = await selectFoodsForMeal(
      supabase,
      'afternoon_snack',
      mealCalories.afternoonSnack,
      userData.goal,
      dietaryPreferences.allergies,
      dietaryPreferences.dietaryRestrictions,
      selectedFoods
    );

    const dinner = await selectFoodsForMeal(
      supabase,
      'dinner',
      mealCalories.dinner,
      userData.goal,
      dietaryPreferences.allergies,
      dietaryPreferences.dietaryRestrictions,
      selectedFoods
    );

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
        calories: adjustedCalories,
        ...macroNeeds,
      },
      recommendations: generateRecommendations(
        userData.goal,
        dietaryPreferences,
        macroNeeds,
        dietaryPreferences.trainingTime,
        userData.activityLevel
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
