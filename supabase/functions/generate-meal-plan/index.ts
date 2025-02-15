
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
      .select('*')
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

    // Organizar alimentos por grupo
    const foodsByGroup = filteredFoods.reduce((acc, food) => {
      const group = food.food_group_id;
      if (!acc[group]) acc[group] = [];
      acc[group].push(food);
      return acc;
    }, {} as Record<number, typeof filteredFoods>);

    // Distribuir calorias por refeição
    const mealDistribution = {
      breakfast: 0.25,    // 25% das calorias
      lunch: 0.35,        // 35% das calorias
      snacks: 0.15,       // 15% das calorias
      dinner: 0.25        // 25% das calorias
    };

    // Criar plano de refeições
    const mealPlan = {
      dailyPlan: {
        breakfast: {
          foods: (foodsByGroup[1] || [])
            .sort(() => Math.random() - 0.5)
            .slice(0, 3),
          calories: Math.round(adjustedCalories * mealDistribution.breakfast),
          macros: { 
            protein: Math.round(macroTargets.protein * mealDistribution.breakfast),
            carbs: Math.round(macroTargets.carbs * mealDistribution.breakfast),
            fats: Math.round(macroTargets.fats * mealDistribution.breakfast)
          }
        },
        lunch: {
          foods: (foodsByGroup[2] || [])
            .sort(() => Math.random() - 0.5)
            .slice(0, 4),
          calories: Math.round(adjustedCalories * mealDistribution.lunch),
          macros: {
            protein: Math.round(macroTargets.protein * mealDistribution.lunch),
            carbs: Math.round(macroTargets.carbs * mealDistribution.lunch),
            fats: Math.round(macroTargets.fats * mealDistribution.lunch)
          }
        },
        snacks: {
          foods: (foodsByGroup[3] || [])
            .sort(() => Math.random() - 0.5)
            .slice(0, 3),
          calories: Math.round(adjustedCalories * mealDistribution.snacks),
          macros: {
            protein: Math.round(macroTargets.protein * mealDistribution.snacks),
            carbs: Math.round(macroTargets.carbs * mealDistribution.snacks),
            fats: Math.round(macroTargets.fats * mealDistribution.snacks)
          }
        },
        dinner: {
          foods: (foodsByGroup[4] || [])
            .sort(() => Math.random() - 0.5)
            .slice(0, 4),
          calories: Math.round(adjustedCalories * mealDistribution.dinner),
          macros: {
            protein: Math.round(macroTargets.protein * mealDistribution.dinner),
            carbs: Math.round(macroTargets.carbs * mealDistribution.dinner),
            fats: Math.round(macroTargets.fats * mealDistribution.dinner)
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

    // Adicionar informações extras para cada refeição
    Object.values(mealPlan.dailyPlan).forEach(meal => {
      const mealTotalProtein = meal.foods.reduce((sum, food) => sum + (food.protein || 0), 0);
      const mealTotalCarbs = meal.foods.reduce((sum, food) => sum + (food.carbs || 0), 0);
      const mealTotalFats = meal.foods.reduce((sum, food) => sum + (food.fats || 0), 0);

      // Ajustar porções para atingir os macros alvo
      if (mealTotalProtein > 0) {
        const proteinAdjustment = meal.macros.protein / mealTotalProtein;
        meal.foods.forEach(food => {
          if (food.protein) food.protein *= proteinAdjustment;
        });
      }

      if (mealTotalCarbs > 0) {
        const carbsAdjustment = meal.macros.carbs / mealTotalCarbs;
        meal.foods.forEach(food => {
          if (food.carbs) food.carbs *= carbsAdjustment;
        });
      }

      if (mealTotalFats > 0) {
        const fatsAdjustment = meal.macros.fats / mealTotalFats;
        meal.foods.forEach(food => {
          if (food.fats) food.fats *= fatsAdjustment;
        });
      }

      // Arredondar valores
      meal.foods.forEach(food => {
        if (food.protein) food.protein = Math.round(food.protein);
        if (food.carbs) food.carbs = Math.round(food.carbs);
        if (food.fats) food.fats = Math.round(food.fats);
        if (food.calories) food.calories = Math.round(food.calories);
      });
    });

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
