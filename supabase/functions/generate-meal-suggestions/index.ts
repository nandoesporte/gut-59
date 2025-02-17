
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  food_group_id: number;
  portion_size?: number;
  portion_unit?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { selectedFoods, dailyCalories } = await req.json();

    console.log('Dados recebidos:', { 
      selectedFoodsCount: selectedFoods.length,
      dailyCalories 
    });

    if (!selectedFoods || !Array.isArray(selectedFoods)) {
      throw new Error('Lista de alimentos inválida');
    }

    // Distribuição calórica por refeição
    const mealDistribution = {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.30,
      afternoonSnack: 0.15,
      dinner: 0.15
    };

    // Calcula calorias por refeição
    const mealCalories = {
      breakfast: Math.round(dailyCalories * mealDistribution.breakfast),
      morningSnack: Math.round(dailyCalories * mealDistribution.morningSnack),
      lunch: Math.round(dailyCalories * mealDistribution.lunch),
      afternoonSnack: Math.round(dailyCalories * mealDistribution.afternoonSnack),
      dinner: Math.round(dailyCalories * mealDistribution.dinner)
    };

    // Função para ajustar porção e calorias
    const adjustPortion = (food: Food, targetCalories: number): Food => {
      const ratio = targetCalories / (food.calories || 1);
      const baseSize = food.portion_size || 100;
      
      return {
        ...food,
        portion_size: Math.round(baseSize * ratio * 2) / 2,
        calories: Math.round(food.calories * ratio),
        protein: Math.round(food.protein * ratio * 10) / 10,
        carbs: Math.round(food.carbs * ratio * 10) / 10,
        fats: Math.round(food.fats * ratio * 10) / 10,
        fiber: Math.round(food.fiber * ratio * 10) / 10
      };
    };

    // Função para distribuir alimentos em uma refeição
    const createMeal = (availableFoods: Food[], targetCalories: number) => {
      const meal = {
        foods: [] as Food[],
        calories: 0,
        macros: {
          protein: 0,
          carbs: 0,
          fats: 0,
          fiber: 0
        }
      };

      let remainingCalories = targetCalories;
      const foodsForMeal = [...availableFoods];

      while (remainingCalories > 50 && foodsForMeal.length > 0) {
        const index = Math.floor(Math.random() * foodsForMeal.length);
        const food = foodsForMeal[index];
        
        // Ajusta a porção para não ultrapassar as calorias restantes
        const adjustedFood = adjustPortion(food, Math.min(remainingCalories, food.calories));
        
        meal.foods.push(adjustedFood);
        meal.calories += adjustedFood.calories;
        meal.macros.protein += adjustedFood.protein;
        meal.macros.carbs += adjustedFood.carbs;
        meal.macros.fats += adjustedFood.fats;
        meal.macros.fiber += adjustedFood.fiber;
        
        remainingCalories -= adjustedFood.calories;
        foodsForMeal.splice(index, 1);
      }

      return meal;
    };

    // Gera o plano alimentar
    const dailyPlan = {
      breakfast: createMeal(selectedFoods, mealCalories.breakfast),
      morningSnack: createMeal(selectedFoods, mealCalories.morningSnack),
      lunch: createMeal(selectedFoods, mealCalories.lunch),
      afternoonSnack: createMeal(selectedFoods, mealCalories.afternoonSnack),
      dinner: createMeal(selectedFoods, mealCalories.dinner)
    };

    // Calcula totais nutricionais
    const totalNutrition = Object.values(dailyPlan).reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: Math.round((acc.protein + meal.macros.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + meal.macros.carbs) * 10) / 10,
      fats: Math.round((acc.fats + meal.macros.fats) * 10) / 10,
      fiber: Math.round((acc.fiber + meal.macros.fiber) * 10) / 10
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

    // Recomendações básicas
    const recommendations = {
      general: "Mantenha um intervalo de 2-3 horas entre as refeições.",
      timing: [
        "Café da manhã: Logo ao acordar",
        "Lanche da manhã: 2-3 horas após café",
        "Almoço: 12-13h",
        "Lanche da tarde: 15-16h",
        "Jantar: 19-20h"
      ]
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
    console.error('Erro na geração do cardápio:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao gerar cardápio', 
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
