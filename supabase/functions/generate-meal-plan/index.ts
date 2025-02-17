
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function adjustPortionToCalories(food: any, targetCalories: number): any {
  const caloriesPerUnit = food.calories / food.portion_size;
  const adjustedPortion = targetCalories / caloriesPerUnit;
  return {
    ...food,
    portion_size: Math.round(adjustedPortion * 2) / 2, // Arredonda para 0.5 mais próximo
    calories: Math.round(adjustedPortion * caloriesPerUnit)
  };
}

function getMeasurementUnit(food: any) {
  const name = food.name.toLowerCase();
  
  // Mapeamento de alimentos para unidades de medida
  if (name.includes('pão') || name.includes('torrada')) return 'fatia';
  if (name.includes('azeite') || name.includes('manteiga') || name.includes('cream cheese')) return 'colher';
  if (name.includes('arroz') || name.includes('feijão') || name.includes('quinoa')) return 'xicara';
  if (name.includes('banana') || name.includes('maçã') || name.includes('laranja')) return 'unidade';
  if (name.includes('abacate')) return 'meio';
  
  return 'g'; // Unidade padrão
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    const { 
      dailyCalories,
      goal,
      activityLevel,
      healthCondition
    } = userData;

    console.log('Gerando cardápio com os seguintes parâmetros:', {
      dailyCalories,
      goal,
      activityLevel,
      healthCondition,
      dietaryPreferences
    });

    // Distribuição calórica por refeição baseada no objetivo e nível de atividade
    let mealDistribution = {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.3,
      afternoonSnack: 0.15,
      dinner: 0.15
    };

    // Ajusta distribuição baseada no objetivo
    if (goal === 'lose') {
      mealDistribution.breakfast = 0.3; // Café da manhã maior para aumentar metabolismo
      mealDistribution.dinner = 0.1; // Jantar menor para redução calórica
    } else if (goal === 'gain') {
      mealDistribution.lunch = 0.35; // Almoço maior para ganho de massa
      mealDistribution.afternoonSnack = 0.2; // Lanche maior para mais calorias
    }

    // Ajusta distribuição baseada no nível de atividade
    if (activityLevel === 'intense') {
      mealDistribution.afternoonSnack = 0.2; // Mais calorias pré-treino
    }

    // Calcula calorias por refeição
    const mealCalories = {
      breakfast: Math.round(dailyCalories * mealDistribution.breakfast),
      morningSnack: Math.round(dailyCalories * mealDistribution.morningSnack),
      lunch: Math.round(dailyCalories * mealDistribution.lunch),
      afternoonSnack: Math.round(dailyCalories * mealDistribution.afternoonSnack),
      dinner: Math.round(dailyCalories * mealDistribution.dinner)
    };

    // Filtra alimentos baseado nas restrições
    let availableFoods = selectedFoods.filter(food => {
      // Remove alimentos com alergias
      if (dietaryPreferences.hasAllergies && 
          dietaryPreferences.allergies.some(allergy => 
            food.common_allergens?.includes(allergy))) {
        return false;
      }

      // Remove alimentos incompatíveis com condições de saúde
      if (healthCondition === 'diabetes' && food.glycemic_index > 70) {
        return false;
      }

      return true;
    });

    // Gera o plano alimentar
    const dailyPlan = {
      breakfast: {
        foods: [], // Será preenchido com os alimentos
        calories: mealCalories.breakfast,
        macros: {
          protein: 0,
          carbs: 0,
          fats: 0,
          fiber: 0
        }
      },
      // ... similar para outras refeições
    };

    // Preenche cada refeição
    for (const meal of Object.keys(dailyPlan)) {
      const targetCalories = mealCalories[meal];
      let remainingCalories = targetCalories;
      const mealFoods = [];

      while (remainingCalories > 0 && availableFoods.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableFoods.length);
        const selectedFood = availableFoods[randomIndex];
        
        // Ajusta a porção para atingir as calorias desejadas
        const adjustedFood = adjustPortionToCalories(selectedFood, 
          Math.min(remainingCalories, selectedFood.calories));

        // Define a unidade de medida apropriada
        adjustedFood.portion_unit = getMeasurementUnit(adjustedFood);

        // Adiciona método de preparo baseado no objetivo
        if (goal === 'lose') {
          adjustedFood.preparation_method = 'grelhado' || 'cozido no vapor';
        } else if (goal === 'gain') {
          adjustedFood.preparation_method = 'refogado com azeite';
        }

        mealFoods.push(adjustedFood);
        remainingCalories -= adjustedFood.calories;
        
        // Remove o alimento para evitar repetição na mesma refeição
        availableFoods.splice(randomIndex, 1);
      }

      dailyPlan[meal].foods = mealFoods;
      // Calcula macros totais da refeição
      dailyPlan[meal].macros = mealFoods.reduce((acc, food) => ({
        protein: acc.protein + (food.protein || 0),
        carbs: acc.carbs + (food.carbs || 0),
        fats: acc.fats + (food.fats || 0),
        fiber: acc.fiber + (food.fiber || 0)
      }), { protein: 0, carbs: 0, fats: 0, fiber: 0 });
    }

    // Calcula nutrição total diária
    const totalNutrition = Object.values(dailyPlan).reduce((total, meal) => ({
      calories: total.calories + meal.calories,
      protein: total.protein + meal.macros.protein,
      carbs: total.carbs + meal.macros.carbs,
      fats: total.fats + meal.macros.fats,
      fiber: total.fiber + meal.macros.fiber
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

    // Gera recomendações personalizadas
    const recommendations = {
      general: `Cardápio personalizado para seu objetivo de ${goal === 'lose' ? 'perda de peso' : 
               goal === 'gain' ? 'ganho de massa' : 'manutenção'}, considerando seu nível de atividade ${activityLevel}.`,
      timing: [
        "Café da manhã: 7h",
        "Lanche da manhã: 10h",
        "Almoço: 12h",
        "Lanche da tarde: 15h",
        "Jantar: 19h"
      ],
      preworkout: dietaryPreferences.trainingTime ? 
        `Faça sua refeição pré-treino 1-2 horas antes do seu treino às ${dietaryPreferences.trainingTime}.` : 
        "Faça suas refeições 1-2 horas antes dos treinos.",
      postworkout: "Consuma sua refeição pós-treino em até 45 minutos após o exercício.",
      healthCondition: healthCondition ? 
        `Cardápio adaptado para sua condição de ${healthCondition}, priorizando alimentos adequados.` : 
        undefined
    };

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
      JSON.stringify({ error: 'Erro ao gerar cardápio personalizado' }),
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
