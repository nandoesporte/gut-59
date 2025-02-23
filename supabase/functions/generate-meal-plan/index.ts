
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface MacroDistribution {
  protein: number;
  carbs: number;
  fats: number;
}

const calculateMacroDistribution = (
  totalCalories: number,
  goal: string
): MacroDistribution => {
  let proteinPercentage: number;
  let carbsPercentage: number;
  let fatsPercentage: number;

  switch (goal) {
    case 'gain_weight':
      proteinPercentage = 0.25; // 25%
      carbsPercentage = 0.55;   // 55%
      fatsPercentage = 0.20;    // 20%
      break;
    case 'lose_weight':
      proteinPercentage = 0.30; // 30%
      carbsPercentage = 0.40;   // 40%
      fatsPercentage = 0.30;    // 30%
      break;
    default: // maintain
      proteinPercentage = 0.25; // 25%
      carbsPercentage = 0.50;   // 50%
      fatsPercentage = 0.25;    // 25%
  }

  const proteinCalories = totalCalories * proteinPercentage;
  const carbsCalories = totalCalories * carbsPercentage;
  const fatsCalories = totalCalories * fatsPercentage;

  return {
    protein: Math.round(proteinCalories / 4), // 4 calorias por grama
    carbs: Math.round(carbsCalories / 4),     // 4 calorias por grama
    fats: Math.round(fatsCalories / 9)        // 9 calorias por grama
  };
};

const MEAL_DISTRIBUTION = {
  breakfast: 0.25,      // 25% das calorias diárias
  morningSnack: 0.15,   // 15%
  lunch: 0.30,          // 30%
  afternoonSnack: 0.10, // 10%
  dinner: 0.20          // 20%
};

const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json()
    const { dailyCalories, goal, userId } = userData

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calcular distribuição de macros
    const macroTargets = calculateMacroDistribution(dailyCalories, goal);

    // Filtrar alimentos baseado nas restrições
    let availableFoods = [...selectedFoods];
    if (dietaryPreferences.hasAllergies && dietaryPreferences.allergies.length > 0) {
      availableFoods = availableFoods.filter(food => 
        !dietaryPreferences.allergies.some(allergy => 
          food.name.toLowerCase().includes(allergy.toLowerCase())
        )
      );
    }

    // Gerar plano semanal
    const weeklyPlan = {};
    for (const day of WEEKDAYS) {
      const dayPlan = {
        breakfast: generateMeal(availableFoods, MEAL_DISTRIBUTION.breakfast * dailyCalories, 1),
        morningSnack: generateMeal(availableFoods, MEAL_DISTRIBUTION.morningSnack * dailyCalories, 3),
        lunch: generateMeal(availableFoods, MEAL_DISTRIBUTION.lunch * dailyCalories, 2),
        afternoonSnack: generateMeal(availableFoods, MEAL_DISTRIBUTION.afternoonSnack * dailyCalories, 3),
        dinner: generateMeal(availableFoods, MEAL_DISTRIBUTION.dinner * dailyCalories, 2)
      };

      weeklyPlan[day] = dayPlan;
    }

    // Gerar recomendações personalizadas
    const recommendations = generateRecommendations(userData, dietaryPreferences);

    // Calcular nutrição total
    const totalNutrition = calculateTotalNutrition(weeklyPlan.Segunda);

    const response = {
      weeklyPlan,
      totalNutrition,
      recommendations
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function generateMeal(foods: any[], targetCalories: number, foodGroupId: number): any {
  const groupFoods = foods.filter(food => food.food_group_id === foodGroupId);
  if (groupFoods.length === 0) return null;

  let meal = {
    description: "Refeição balanceada com foco em nutrientes essenciais",
    foods: [],
    calories: 0,
    macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
  };

  // Selecionar alimentos aleatoriamente até atingir as calorias alvo
  while (meal.calories < targetCalories && groupFoods.length > 0) {
    const foodIndex = Math.floor(Math.random() * groupFoods.length);
    const selectedFood = groupFoods[foodIndex];
    
    // Calcular porção para atingir aproximadamente as calorias desejadas
    const portion = Math.min(
      100,
      ((targetCalories - meal.calories) / selectedFood.calories) * 100
    );

    if (portion < 20) break; // Evitar porções muito pequenas

    const foodWithPortion = {
      name: selectedFood.name,
      portion: Math.round(portion),
      unit: selectedFood.portionUnit || 'g',
      details: `${selectedFood.protein}g proteína, ${selectedFood.carbs}g carboidratos, ${selectedFood.fats}g gorduras`
    };

    meal.foods.push(foodWithPortion);
    meal.calories += (selectedFood.calories * portion) / 100;
    meal.macros.protein += (selectedFood.protein * portion) / 100;
    meal.macros.carbs += (selectedFood.carbs * portion) / 100;
    meal.macros.fats += (selectedFood.fats * portion) / 100;

    // Remover o alimento usado para evitar repetição na mesma refeição
    groupFoods.splice(foodIndex, 1);
  }

  // Arredondar valores
  meal.calories = Math.round(meal.calories);
  meal.macros.protein = Math.round(meal.macros.protein);
  meal.macros.carbs = Math.round(meal.macros.carbs);
  meal.macros.fats = Math.round(meal.macros.fats);

  return meal;
}

function calculateTotalNutrition(dayPlan: any) {
  const total = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0
  };

  Object.values(dayPlan).forEach((meal: any) => {
    if (meal && meal.calories) {
      total.calories += meal.calories;
      total.protein += meal.macros.protein;
      total.carbs += meal.macros.carbs;
      total.fats += meal.macros.fats;
      total.fiber += meal.macros.fiber || 0;
    }
  });

  return total;
}

function generateRecommendations(userData: any, preferences: any) {
  const { goal, gender, age, activityLevel } = userData;
  const { trainingTime } = preferences;

  let recommendations = {
    general: "Mantenha uma dieta equilibrada e variada.",
    preworkout: "",
    postworkout: "",
    timing: []
  };

  // Recomendações baseadas no objetivo
  switch (goal) {
    case 'lose_weight':
      recommendations.general = "Foque em alimentos com alta densidade nutricional e baixa densidade calórica. Priorize proteínas magras e vegetais.";
      break;
    case 'gain_weight':
      recommendations.general = "Aumente gradualmente a ingestão calórica com alimentos nutritivos. Priorize proteínas e carboidratos complexos.";
      break;
    default:
      recommendations.general = "Mantenha uma alimentação equilibrada com foco em alimentos integrais e naturais.";
  }

  // Recomendações pré e pós-treino
  if (trainingTime) {
    const trainingHour = new Date(`2000-01-01T${trainingTime}`).getHours();
    recommendations.preworkout = `Consuma carboidratos complexos 2-3 horas antes do treino (${trainingHour - 2}:00).`;
    recommendations.postworkout = `Após o treino (${trainingHour + 1}:00), priorize proteínas e carboidratos para recuperação.`;

    // Ajustar horários das refeições com base no horário do treino
    recommendations.timing = [
      `Café da manhã: ${trainingHour - 4 < 6 ? '6:00' : `${trainingHour - 4}:00`}`,
      `Lanche da manhã: ${trainingHour - 2}:00`,
      `Almoço: ${trainingHour + 2 > 14 ? '12:00' : `${trainingHour + 2}:00`}`,
      `Lanche da tarde: 15:30`,
      `Jantar: 19:00`
    ];
  } else {
    recommendations.timing = [
      "Café da manhã: 7:00-8:00",
      "Lanche da manhã: 10:00-10:30",
      "Almoço: 12:00-13:00",
      "Lanche da tarde: 15:00-15:30",
      "Jantar: 19:00-20:00"
    ];
  }

  return recommendations;
}
