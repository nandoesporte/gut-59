
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Contador de tentativas para evitar loop infinito
let attempts = 0;
const MAX_ATTEMPTS = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userData, selectedFoods } = await req.json()
    const { userId, dailyCalories, goal } = userData

    attempts++; // Incrementa o contador de tentativas
    if (attempts > MAX_ATTEMPTS) {
      attempts = 0; // Reset contador
      throw new Error('Número máximo de tentativas excedido ao gerar plano alimentar');
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    // Buscar preferências dietéticas salvas do usuário
    const { data: dietaryPrefs, error: prefsError } = await supabase
      .from('dietary_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (prefsError && prefsError.code !== 'PGRST116') { // Ignora erro de não encontrado
      throw new Error('Erro ao buscar preferências dietéticas: ' + prefsError.message)
    }

    // Usar preferências salvas ou valores padrão
    const dietaryPreferences = {
      hasAllergies: dietaryPrefs?.has_allergies || false,
      allergies: dietaryPrefs?.allergies || [],
      dietaryRestrictions: dietaryPrefs?.dietary_restrictions || [],
      trainingTime: dietaryPrefs?.training_time || null
    }

    // Calcular distribuição de macros
    const macroTargets = calculateMacroDistribution(dailyCalories, goal);

    // Filtrar alimentos baseado nas restrições salvas
    let availableFoods = [...selectedFoods];
    if (dietaryPreferences.hasAllergies && dietaryPreferences.allergies.length > 0) {
      availableFoods = availableFoods.filter(food => 
        !dietaryPreferences.allergies.some(allergy => 
          food.name.toLowerCase().includes(allergy.toLowerCase())
        )
      );
    }

    // Filtrar alimentos baseado nas restrições dietéticas
    if (dietaryPreferences.dietaryRestrictions.length > 0) {
      availableFoods = availableFoods.filter(food => {
        const restrictions = dietaryPreferences.dietaryRestrictions;
        if (restrictions.includes('vegetarian')) {
          return !food.food_category?.includes('meat');
        }
        if (restrictions.includes('vegan')) {
          return !food.food_category?.some(cat => 
            ['meat', 'dairy', 'eggs'].includes(cat)
          );
        }
        return true;
      });
    }

    // Verificar se há alimentos suficientes após filtragem
    if (availableFoods.length < 5) {
      throw new Error('Não há alimentos suficientes disponíveis após aplicar as restrições dietéticas');
    }

    // Gerar plano semanal considerando horário de treino
    const weeklyPlan = {};
    const trainingTime = dietaryPreferences.trainingTime;
    
    for (const day of ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']) {
      let dayPlan;
      if (trainingTime) {
        const trainingHour = new Date(`2000-01-01T${trainingTime}`).getHours();
        const adjustedDistribution = getAdjustedMealDistribution(trainingHour);
        
        dayPlan = {
          breakfast: generateMeal(availableFoods, adjustedDistribution.breakfast * dailyCalories, 1),
          morningSnack: generateMeal(availableFoods, adjustedDistribution.morningSnack * dailyCalories, 3),
          lunch: generateMeal(availableFoods, adjustedDistribution.lunch * dailyCalories, 2),
          afternoonSnack: generateMeal(availableFoods, adjustedDistribution.afternoonSnack * dailyCalories, 3),
          dinner: generateMeal(availableFoods, adjustedDistribution.dinner * dailyCalories, 2)
        };
      } else {
        const standardDistribution = {
          breakfast: 0.25,
          morningSnack: 0.15,
          lunch: 0.30,
          afternoonSnack: 0.10,
          dinner: 0.20
        };

        dayPlan = {
          breakfast: generateMeal(availableFoods, standardDistribution.breakfast * dailyCalories, 1),
          morningSnack: generateMeal(availableFoods, standardDistribution.morningSnack * dailyCalories, 3),
          lunch: generateMeal(availableFoods, standardDistribution.lunch * dailyCalories, 2),
          afternoonSnack: generateMeal(availableFoods, standardDistribution.afternoonSnack * dailyCalories, 3),
          dinner: generateMeal(availableFoods, standardDistribution.dinner * dailyCalories, 2)
        };
      }

      weeklyPlan[day] = dayPlan;
    }

    // Gerar recomendações personalizadas
    const recommendations = generateRecommendations(userData, dietaryPreferences);

    // Calcular nutrição total
    const totalNutrition = calculateTotalNutrition(weeklyPlan.Segunda);

    const mealPlan = {
      weeklyPlan,
      totalNutrition,
      recommendations,
      dietaryPreferences
    };

    // Analisar o plano gerado
    try {
      const { data: analysis } = await supabase.functions.invoke(
        'analyze-meal-plan',
        {
          body: {
            mealPlan,
            userData,
            dietaryPreferences
          }
        }
      );

      if (!analysis.isApproved) {
        console.log('Plano não aprovado. Motivo:', analysis.analysis);
        // Tenta gerar um novo plano
        if (attempts < MAX_ATTEMPTS) {
          return await serve(req);
        } else {
          attempts = 0; // Reset contador
          throw new Error('Não foi possível gerar um plano adequado após várias tentativas');
        }
      }

      // Plano aprovado - reset contador e inclui análise
      attempts = 0;
      mealPlan.recommendations.aiAnalysis = analysis.analysis;

      return new Response(
        JSON.stringify(mealPlan),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );

    } catch (analysisError) {
      console.error('Erro na análise:', analysisError);
      throw new Error('Erro ao analisar o plano alimentar: ' + analysisError.message);
    }

  } catch (error) {
    console.error('Error:', error);
    attempts = 0; // Reset contador em caso de erro
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function generateMeal(foods: any[], targetCalories: number, foodGroupId: number) {
  const groupFoods = foods.filter(food => food.food_group_id === foodGroupId);
  if (groupFoods.length === 0) return null;

  let meal = {
    description: "Refeição balanceada com foco em nutrientes essenciais",
    foods: [],
    calories: 0,
    macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
  };

  while (meal.calories < targetCalories && groupFoods.length > 0) {
    const foodIndex = Math.floor(Math.random() * groupFoods.length);
    const selectedFood = groupFoods[foodIndex];
    
    const portion = Math.min(
      100,
      ((targetCalories - meal.calories) / selectedFood.calories) * 100
    );

    if (portion < 20) break;

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

    groupFoods.splice(foodIndex, 1);
  }

  meal.calories = Math.round(meal.calories);
  meal.macros.protein = Math.round(meal.macros.protein);
  meal.macros.carbs = Math.round(meal.macros.carbs);
  meal.macros.fats = Math.round(meal.macros.fats);

  return meal;
}

function calculateMacroDistribution(totalCalories: number, goal: string) {
  let proteinPercentage: number;
  let carbsPercentage: number;
  let fatsPercentage: number;

  switch (goal) {
    case 'gain_weight':
      proteinPercentage = 0.25;
      carbsPercentage = 0.55;
      fatsPercentage = 0.20;
      break;
    case 'lose_weight':
      proteinPercentage = 0.30;
      carbsPercentage = 0.40;
      fatsPercentage = 0.30;
      break;
    default:
      proteinPercentage = 0.25;
      carbsPercentage = 0.50;
      fatsPercentage = 0.25;
  }

  return {
    protein: Math.round((totalCalories * proteinPercentage) / 4),
    carbs: Math.round((totalCalories * carbsPercentage) / 4),
    fats: Math.round((totalCalories * fatsPercentage) / 9)
  };
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

function getAdjustedMealDistribution(trainingHour: number) {
  if (trainingHour < 10) {
    return {
      breakfast: 0.20,
      morningSnack: 0.25,
      lunch: 0.30,
      afternoonSnack: 0.10,
      dinner: 0.15
    };
  } else if (trainingHour < 16) {
    return {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.25,
      afternoonSnack: 0.20,
      dinner: 0.15
    };
  } else {
    return {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.30,
      afternoonSnack: 0.15,
      dinner: 0.15
    };
  }
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

  if (trainingTime) {
    const trainingHour = new Date(`2000-01-01T${trainingTime}`).getHours();
    recommendations.preworkout = `Consuma carboidratos complexos 2-3 horas antes do treino (${trainingHour - 2}:00).`;
    recommendations.postworkout = `Após o treino (${trainingHour + 1}:00), priorize proteínas e carboidratos para recuperação.`;

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
