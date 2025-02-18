
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MealGuideline {
  mealType: string;
  targetCalories: number;
  requiredCategories: string[];
  minItems: number;
}

const mealGuidelines: MealGuideline[] = [
  {
    mealType: 'breakfast',
    targetCalories: 300,
    requiredCategories: ['grains', 'protein', 'fruit'],
    minItems: 3
  },
  {
    mealType: 'morningSnack',
    targetCalories: 150,
    requiredCategories: ['protein', 'fruit'],
    minItems: 2
  },
  {
    mealType: 'lunch',
    targetCalories: 400,
    requiredCategories: ['protein', 'grains', 'vegetables'],
    minItems: 4
  },
  {
    mealType: 'afternoonSnack',
    targetCalories: 150,
    requiredCategories: ['protein', 'fruit'],
    minItems: 2
  },
  {
    mealType: 'dinner',
    targetCalories: 300,
    requiredCategories: ['protein', 'vegetables', 'grains'],
    minItems: 3
  }
];

function generatePortionSize(food: any, targetCalories: number): number {
  if (!food.calories_per_100g) return 100;
  return Math.round((targetCalories / food.calories_per_100g) * 100);
}

function formatPortion(size: number, unit: string = 'g'): string {
  if (unit === 'g' && size >= 1000) {
    return `${(size/1000).toFixed(1)} kg`;
  }
  return `${size} ${unit}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar alimentos selecionados
    const { data: foodsData, error: foodsError } = await supabase
      .from('protocol_foods')
      .select('*')
      .in('id', selectedFoods);

    if (foodsError) throw foodsError;

    const foods = foodsData || [];
    console.log('Alimentos disponíveis:', foods.length);

    // Categorizar alimentos por tipo de refeição
    const foodsByCategory = foods.reduce((acc: any, food: any) => {
      const categories = food.nutritional_category || [];
      categories.forEach((category: string) => {
        if (!acc[category]) acc[category] = [];
        acc[category].push(food);
      });
      return acc;
    }, {});

    // Gerar plano de refeições
    const dailyPlan = mealGuidelines.reduce((plan: any, guideline) => {
      const mealFoods = [];
      let mealCalories = 0;
      const targetCalories = (userData.dailyCalories * (guideline.targetCalories / 1300));

      // Garantir que temos alimentos de cada categoria requerida
      for (const category of guideline.requiredCategories) {
        const availableFoods = foodsByCategory[category] || [];
        if (availableFoods.length > 0) {
          const food = availableFoods[Math.floor(Math.random() * availableFoods.length)];
          const portionSize = generatePortionSize(food, targetCalories / guideline.minItems);
          const calories = Math.round((food.calories / 100) * portionSize);
          
          mealFoods.push({
            ...food,
            portion: formatPortion(portionSize, food.portion_unit || 'g'),
            calories: calories
          });
          mealCalories += calories;
        }
      }

      // Calcular macronutrientes totais da refeição
      const macros = mealFoods.reduce((acc: any, food: any) => {
        const multiplier = parseFloat(food.portion) / 100;
        return {
          protein: acc.protein + (food.protein || 0) * multiplier,
          carbs: acc.carbs + (food.carbs || 0) * multiplier,
          fats: acc.fats + (food.fats || 0) * multiplier,
          fiber: acc.fiber + (food.fiber || 0) * multiplier
        };
      }, { protein: 0, carbs: 0, fats: 0, fiber: 0 });

      // Arredondar macronutrientes
      Object.keys(macros).forEach(key => {
        macros[key] = Math.round(macros[key] * 10) / 10;
      });

      return {
        ...plan,
        [guideline.mealType]: {
          foods: mealFoods,
          calories: mealCalories,
          macros
        }
      };
    }, {});

    // Calcular totais do dia
    const totalNutrition = Object.values(dailyPlan).reduce((total: any, meal: any) => ({
      calories: total.calories + meal.calories,
      protein: total.protein + meal.macros.protein,
      carbs: total.carbs + meal.macros.carbs,
      fats: total.fats + meal.macros.fats,
      fiber: total.fiber + meal.macros.fiber
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

    // Gerar recomendações
    const recommendations = {
      preworkout: "Consuma sua refeição pré-treino 2 horas antes do exercício",
      postworkout: "Após o treino, priorize proteínas de rápida absorção e carboidratos",
      general: "Mantenha-se hidratado bebendo água ao longo do dia",
      timing: [
        "Faça refeições a cada 3-4 horas",
        "Evite refeições pesadas próximo ao horário de dormir"
      ]
    };

    const response = {
      dailyPlan,
      totalNutrition,
      recommendations
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao gerar plano:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
