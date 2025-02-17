
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Adiciona validações e valores padrão para evitar erros
function validateFood(food: any) {
  return {
    ...food,
    calories: Number(food.calories) || 0,
    protein: Number(food.protein) || 0,
    carbs: Number(food.carbs) || 0,
    fats: Number(food.fats) || 0,
    fiber: Number(food.fiber) || 0,
    portion_size: Number(food.portion_size) || 100,
    glycemic_index: Number(food.glycemic_index) || 0,
    common_allergens: Array.isArray(food.common_allergens) ? food.common_allergens : []
  };
}

function adjustPortionToCalories(food: any, targetCalories: number): any {
  const validatedFood = validateFood(food);
  const currentCalories = validatedFood.calories;
  
  if (currentCalories <= 0) return validatedFood;
  
  const ratio = targetCalories / currentCalories;
  const adjustedPortion = Math.round((validatedFood.portion_size * ratio) * 2) / 2;

  return {
    ...validatedFood,
    portion_size: adjustedPortion,
    calories: Math.round(currentCalories * ratio),
    protein: Math.round(validatedFood.protein * ratio * 10) / 10,
    carbs: Math.round(validatedFood.carbs * ratio * 10) / 10,
    fats: Math.round(validatedFood.fats * ratio * 10) / 10,
    fiber: Math.round(validatedFood.fiber * ratio * 10) / 10
  };
}

function getMeasurementUnit(food: any) {
  const name = (food.name || '').toLowerCase();
  const defaultMeasurements = {
    'pão': 'fatia',
    'torrada': 'fatia',
    'azeite': 'colher',
    'manteiga': 'colher',
    'cream cheese': 'colher',
    'arroz': 'xicara',
    'feijão': 'xicara',
    'quinoa': 'xicara',
    'banana': 'unidade',
    'maçã': 'unidade',
    'laranja': 'unidade',
    'abacate': 'meio'
  };

  for (const [key, unit] of Object.entries(defaultMeasurements)) {
    if (name.includes(key)) return unit;
  }
  
  return 'g';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    
    if (!userData || !selectedFoods || !Array.isArray(selectedFoods)) {
      throw new Error('Dados inválidos fornecidos');
    }

    const { 
      dailyCalories = 2000,
      goal = 'maintain',
      activityLevel = 'moderate',
      healthCondition = null
    } = userData;

    console.log('Dados recebidos:', {
      dailyCalories,
      selectedFoods: selectedFoods.length,
      dietaryPreferences
    });

    // Distribuição calórica padrão
    const mealDistribution = {
      breakfast: goal === 'lose' ? 0.3 : 0.25,
      morningSnack: 0.15,
      lunch: goal === 'gain' ? 0.35 : 0.3,
      afternoonSnack: activityLevel === 'intense' ? 0.2 : 0.15,
      dinner: goal === 'lose' ? 0.1 : 0.15
    };

    // Inicializa o plano diário com estrutura completa
    const dailyPlan = {
      breakfast: { foods: [], calories: 0, macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 } },
      morningSnack: { foods: [], calories: 0, macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 } },
      lunch: { foods: [], calories: 0, macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 } },
      afternoonSnack: { foods: [], calories: 0, macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 } },
      dinner: { foods: [], calories: 0, macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 } }
    };

    // Filtra e valida os alimentos disponíveis
    const availableFoods = selectedFoods
      .map(validateFood)
      .filter(food => {
        if (dietaryPreferences?.hasAllergies && 
            dietaryPreferences.allergies?.some(allergy => 
              food.common_allergens?.includes(allergy))) {
          return false;
        }
        if (healthCondition === 'diabetes' && food.glycemic_index > 70) {
          return false;
        }
        return true;
      });

    // Distribui os alimentos entre as refeições
    for (const [meal, distribution] of Object.entries(mealDistribution)) {
      const targetCalories = Math.round(dailyCalories * distribution);
      let remainingCalories = targetCalories;
      const mealFoods = [];

      while (remainingCalories > 50 && availableFoods.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableFoods.length);
        const selectedFood = availableFoods[randomIndex];
        
        const adjustedFood = adjustPortionToCalories(
          selectedFood, 
          Math.min(remainingCalories, selectedFood.calories || 100)
        );

        adjustedFood.portion_unit = getMeasurementUnit(adjustedFood);
        
        if (goal === 'lose') {
          adjustedFood.preparation_method = 'cozido no vapor';
        } else if (goal === 'gain') {
          adjustedFood.preparation_method = 'refogado com azeite';
        }

        mealFoods.push(adjustedFood);
        remainingCalories -= adjustedFood.calories;
        availableFoods.splice(randomIndex, 1);
      }

      dailyPlan[meal].foods = mealFoods;
      dailyPlan[meal].calories = targetCalories;
      
      // Calcula os macros da refeição
      dailyPlan[meal].macros = mealFoods.reduce((acc, food) => ({
        protein: Math.round((acc.protein + (food.protein || 0)) * 10) / 10,
        carbs: Math.round((acc.carbs + (food.carbs || 0)) * 10) / 10,
        fats: Math.round((acc.fats + (food.fats || 0)) * 10) / 10,
        fiber: Math.round((acc.fiber + (food.fiber || 0)) * 10) / 10
      }), { protein: 0, carbs: 0, fats: 0, fiber: 0 });
    }

    // Calcula nutrição total
    const totalNutrition = Object.values(dailyPlan).reduce((total, meal) => ({
      calories: total.calories + meal.calories,
      protein: Math.round((total.protein + meal.macros.protein) * 10) / 10,
      carbs: Math.round((total.carbs + meal.macros.carbs) * 10) / 10,
      fats: Math.round((total.fats + meal.macros.fats) * 10) / 10,
      fiber: Math.round((total.fiber + meal.macros.fiber) * 10) / 10
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

    // Gera recomendações
    const recommendations = {
      general: `Cardápio personalizado para seu objetivo de ${
        goal === 'lose' ? 'perda de peso' : 
        goal === 'gain' ? 'ganho de massa' : 
        'manutenção'}, considerando seu nível de atividade ${activityLevel}.`,
      timing: [
        "Café da manhã: 7h",
        "Lanche da manhã: 10h",
        "Almoço: 12h",
        "Lanche da tarde: 15h",
        "Jantar: 19h"
      ],
      preworkout: dietaryPreferences?.trainingTime ? 
        `Faça sua refeição pré-treino 1-2 horas antes do seu treino às ${dietaryPreferences.trainingTime}.` : 
        "Faça suas refeições 1-2 horas antes dos treinos.",
      postworkout: "Consuma sua refeição pós-treino em até 45 minutos após o exercício.",
      healthCondition: healthCondition ? 
        `Cardápio adaptado para sua condição de ${healthCondition}, priorizando alimentos adequados.` : 
        undefined
    };

    console.log('Cardápio gerado com sucesso');

    return new Response(
      JSON.stringify({
        dailyPlan,
        totalNutrition,
        recommendations
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Erro ao gerar cardápio:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao gerar cardápio personalizado',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
