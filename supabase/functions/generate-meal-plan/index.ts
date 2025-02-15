import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'content-length, content-type',
  'Content-Type': 'application/json'
};

// Função para calcular necessidade calórica usando Harris-Benedict
function calculateHarrisBenedict(weight: number, height: number, age: number, gender: string, activityFactor: number): number {
  let bmr;
  if (gender === 'male') {
    bmr = 66 + (13.7 * weight) + (5 * height) - (6.8 * age);
  } else {
    bmr = 655 + (9.6 * weight) + (1.8 * height) - (4.7 * age);
  }
  return Math.round(bmr * activityFactor);
}

// Função para calcular necessidade calórica usando Mifflin-St Jeor
function calculateMifflinStJeor(weight: number, height: number, age: number, gender: string, activityFactor: number): number {
  let bmr;
  if (gender === 'male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
  return Math.round(bmr * activityFactor);
}

// Função para calcular a distribuição de macronutrientes baseada no objetivo
function calculateMacroDistribution(calories: number, goal: string) {
  let protein, carbs, fats;

  switch (goal) {
    case 'lose':
      protein = Math.round((calories * 0.35) / 4); // 35% proteína
      carbs = Math.round((calories * 0.40) / 4);   // 40% carboidratos
      fats = Math.round((calories * 0.25) / 9);    // 25% gorduras
      break;
    case 'gain':
      protein = Math.round((calories * 0.30) / 4); // 30% proteína
      carbs = Math.round((calories * 0.50) / 4);   // 50% carboidratos
      fats = Math.round((calories * 0.20) / 9);    // 20% gorduras
      break;
    default: // maintain
      protein = Math.round((calories * 0.30) / 4); // 30% proteína
      carbs = Math.round((calories * 0.45) / 4);   // 45% carboidratos
      fats = Math.round((calories * 0.25) / 9);    // 25% gorduras
  }

  return { protein, carbs, fats };
}

// Função para gerar recomendações de timing nutricional
function generateTimingRecommendations(trainingTime: string | null, goal: string) {
  const recommendations = {
    preworkout: "",
    postworkout: "",
    general: "Mantenha-se hidratado bebendo água ao longo do dia. Evite alimentos processados.",
    timing: []
  };

  if (trainingTime) {
    const hour = parseInt(trainingTime.split(':')[0]);
    
    if (hour < 10) {
      recommendations.preworkout = "Café da manhã leve 30-45 minutos antes do treino, focando em carboidratos de rápida absorção e proteína de fácil digestão.";
      recommendations.postworkout = "Refeição pós-treino completa com proteínas e carboidratos para recuperação muscular. Ideal consumir dentro de 30 minutos após o treino.";
      recommendations.timing.push("Organize as refeições mais pesadas após o treino matinal");
    } else if (hour < 16) {
      recommendations.preworkout = "Lanche pré-treino 1 hora antes, combinando carboidratos e proteínas em proporções moderadas.";
      recommendations.postworkout = "Aproveite o almoço ou lanche da tarde como refeição pós-treino, priorizando proteínas magras e carboidratos complexos.";
      recommendations.timing.push("Mantenha o café da manhã leve e nutritivo");
    } else {
      recommendations.preworkout = "Lanche pré-treino 1-2 horas antes, evitando gorduras e priorizando carboidratos de fácil digestão.";
      recommendations.postworkout = "Jantar balanceado após o treino, com ênfase em proteínas para recuperação noturna.";
      recommendations.timing.push("Distribua bem as refeições ao longo do dia");
    }
  }

  switch (goal) {
    case 'lose':
      recommendations.timing.push("Concentre carboidratos nas refeições próximas ao treino");
      recommendations.timing.push("Mantenha refeições proteicas distribuídas ao longo do dia");
      break;
    case 'gain':
      recommendations.timing.push("Aumente o volume das refeições principais");
      recommendations.timing.push("Adicione shakes proteicos entre as refeições se necessário");
      break;
    default:
      recommendations.timing.push("Mantenha intervalo regular entre as refeições");
      recommendations.timing.push("Equilibre macronutrientes em todas as refeições");
  }

  return recommendations;
}

// Função para analisar compatibilidade com horário de treino
function analyzeWorkoutCompatibility(
  foods: any[],
  trainingTime: string | null,
  isPreWorkout: boolean
): any[] {
  if (!trainingTime) return foods;

  return foods.filter(food => {
    if (isPreWorkout) {
      return food.pre_workout_compatible && 
             (food.preparation_time_minutes <= 30) && 
             (food.glycemic_index ? food.glycemic_index > 55 : true);
    } else {
      return food.post_workout_compatible;
    }
  });
}

// Função para calcular score nutricional
function calculateNutritionalScore(food: any, goal: string): number {
  let score = 0;
  
  // Base nutricional
  if (food.protein) score += (goal === 'gain' ? 3 : 2);
  if (food.fiber) score += 1;
  if (food.vitamins) score += Object.keys(food.vitamins).length * 0.5;
  if (food.minerals) score += Object.keys(food.minerals).length * 0.5;
  
  // Adequação ao objetivo
  switch (goal) {
    case 'lose':
      if (food.fiber > 3) score += 2;
      if (food.glycemic_index && food.glycemic_index < 55) score += 2;
      break;
    case 'gain':
      if (food.calories > 200) score += 1;
      if (food.protein > 20) score += 2;
      break;
    default: // maintain
      if (food.fiber > 2) score += 1;
      score += 1; // Balanceado para manutenção
  }

  return score;
}

// Função para otimizar combinações de alimentos
function optimizeMealCombinations(
  foods: any[],
  targetCalories: number,
  macroTargets: { protein: number; carbs: number; fats: number },
  goal: string
): any[] {
  const combinations: any[] = [];
  const maxFoods = 4;

  // Ordenar alimentos por score nutricional
  const scoredFoods = foods.map(food => ({
    ...food,
    nutritionalScore: calculateNutritionalScore(food, goal)
  })).sort((a, b) => b.nutritionalScore - a.nutritionalScore);

  // Selecionar melhores combinações
  for (let i = 0; i < Math.min(maxFoods, scoredFoods.length); i++) {
    const mainFood = scoredFoods[i];
    const complementaryFoods = scoredFoods
      .filter(f => f.id !== mainFood.id)
      .slice(0, maxFoods - 1);

    combinations.push([mainFood, ...complementaryFoods]);
  }

  // Ajustar porções para atingir targets
  return combinations[0] || []; // Retorna a melhor combinação
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const requestData = await req.json();
    console.log('Received request data:', requestData);

    const { userData, selectedFoods, dietaryPreferences } = requestData;

    if (!userData || !selectedFoods || !dietaryPreferences) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'userData, selectedFoods, and dietaryPreferences are required'
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calcular calorias usando ambas as fórmulas e fazer uma média
    const activityFactors: { [key: string]: number } = {
      sedentary: 1.2,
      lightlyActive: 1.375,
      moderatelyActive: 1.55,
      veryActive: 1.725,
      extremelyActive: 1.9
    };

    const activityFactor = activityFactors[userData.activityLevel] || 1.2;
    
    const harrisBenedictCalories = calculateHarrisBenedict(
      userData.weight,
      userData.height,
      userData.age,
      userData.gender,
      activityFactor
    );

    const mifflinStJeorCalories = calculateMifflinStJeor(
      userData.weight,
      userData.height,
      userData.age,
      userData.gender,
      activityFactor
    );

    // Média das duas fórmulas
    const baseCalories = Math.round((harrisBenedictCalories + mifflinStJeorCalories) / 2);

    // Ajustar calorias conforme objetivo
    const goalFactors: { [key: string]: number } = {
      lose: 0.8,    // Déficit de 20%
      maintain: 1,   // Manutenção
      gain: 1.2     // Superávit de 20%
    };

    const adjustedCalories = Math.round(baseCalories * (goalFactors[userData.goal] || 1));

    // Calcular distribuição de macros
    const macroTargets = calculateMacroDistribution(adjustedCalories, userData.goal);

    // Buscar alimentos selecionados
    const { data: foodsData, error: foodsError } = await supabase
      .from('protocol_foods')
      .select(`
        *,
        vitamins,
        minerals,
        preparation_time_minutes,
        is_quick_meal,
        glycemic_index,
        fiber,
        meal_type,
        serving_size,
        serving_unit,
        pre_workout_compatible,
        post_workout_compatible,
        common_allergens,
        dietary_flags
      `)
      .in('id', selectedFoods);

    if (foodsError) {
      console.error('Error fetching foods:', foodsError);
      return new Response(
        JSON.stringify({
          error: 'Database error',
          details: foodsError.message
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    if (!foodsData || foodsData.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No foods found',
          details: 'No foods found for the selected IDs'
        }),
        { 
          status: 404,
          headers: corsHeaders
        }
      );
    }

    // Remover alimentos com restrições
    const filteredFoods = foodsData.filter(food => {
      if (dietaryPreferences.hasAllergies && 
          dietaryPreferences.allergies.some(allergy => 
            food.name.toLowerCase().includes(allergy.toLowerCase()))) {
        return false;
      }
      if (dietaryPreferences.dietaryRestrictions.some(restriction => 
          food.name.toLowerCase().includes(restriction.toLowerCase()))) {
        return false;
      }
      return true;
    });

    // Organizar alimentos por grupo e otimizar para horário de treino
    const foodsByGroup = filteredFoods.reduce((acc, food) => {
      const group = food.food_group_id;
      if (!acc[group]) acc[group] = [];
      acc[group].push(food);
      return acc;
    }, {} as Record<number, typeof filteredFoods>);

    // Gerar plano de refeições otimizado
    const mealPlan = {
      dailyPlan: {
        breakfast: {
          foods: optimizeMealCombinations(
            analyzeWorkoutCompatibility(foodsByGroup[1] || [], dietaryPreferences.trainingTime, true),
            Math.round(adjustedCalories * 0.25),
            {
              protein: Math.round(macroTargets.protein * 0.25),
              carbs: Math.round(macroTargets.carbs * 0.25),
              fats: Math.round(macroTargets.fats * 0.25)
            },
            userData.goal
          ),
          calories: Math.round(adjustedCalories * 0.25),
          macros: {
            protein: Math.round(macroTargets.protein * 0.25),
            carbs: Math.round(macroTargets.carbs * 0.25),
            fats: Math.round(macroTargets.fats * 0.25)
          }
        },
        lunch: {
          foods: optimizeMealCombinations(
            foodsByGroup[2] || [],
            Math.round(adjustedCalories * 0.35),
            {
              protein: Math.round(macroTargets.protein * 0.35),
              carbs: Math.round(macroTargets.carbs * 0.35),
              fats: Math.round(macroTargets.fats * 0.35)
            },
            userData.goal
          ),
          calories: Math.round(adjustedCalories * 0.35),
          macros: {
            protein: Math.round(macroTargets.protein * 0.35),
            carbs: Math.round(macroTargets.carbs * 0.35),
            fats: Math.round(macroTargets.fats * 0.35)
          }
        },
        snacks: {
          foods: optimizeMealCombinations(
            foodsByGroup[3] || [],
            Math.round(adjustedCalories * 0.15),
            {
              protein: Math.round(macroTargets.protein * 0.15),
              carbs: Math.round(macroTargets.carbs * 0.15),
              fats: Math.round(macroTargets.fats * 0.15)
            },
            userData.goal
          ),
          calories: Math.round(adjustedCalories * 0.15),
          macros: {
            protein: Math.round(macroTargets.protein * 0.15),
            carbs: Math.round(macroTargets.carbs * 0.15),
            fats: Math.round(macroTargets.fats * 0.15)
          }
        },
        dinner: {
          foods: optimizeMealCombinations(
            analyzeWorkoutCompatibility(foodsByGroup[4] || [], dietaryPreferences.trainingTime, false),
            Math.round(adjustedCalories * 0.25),
            {
              protein: Math.round(macroTargets.protein * 0.25),
              carbs: Math.round(macroTargets.carbs * 0.25),
              fats: Math.round(macroTargets.fats * 0.25)
            },
            userData.goal
          ),
          calories: Math.round(adjustedCalories * 0.25),
          macros: {
            protein: Math.round(macroTargets.protein * 0.25),
            carbs: Math.round(macroTargets.carbs * 0.25),
            fats: Math.round(macroTargets.fats * 0.25)
          }
        }
      },
      totalNutrition: {
        calories: adjustedCalories,
        protein: macroTargets.protein,
        carbs: macroTargets.carbs,
        fats: macroTargets.fats
      },
      recommendations: generateTimingRecommendations(dietaryPreferences.trainingTime, userData.goal)
    };

    // Salvar o plano gerado
    const { error: saveError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userData.userId,
        plan_data: mealPlan,
        dietary_preferences: dietaryPreferences,
        calories: adjustedCalories,
        macros: macroTargets,
        training_time: dietaryPreferences.trainingTime
      });

    if (saveError) {
      console.error('Error saving meal plan:', saveError);
    }

    return new Response(
      JSON.stringify(mealPlan),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('General error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error.message
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
