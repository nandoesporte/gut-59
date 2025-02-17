
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import { DietaryPreferences, ProtocolFood, MealPlan } from './types.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json()
    console.log('Received request:', { userData, selectedFoods, dietaryPreferences })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar alimentos selecionados
    const { data: foodsData, error: foodsError } = await supabaseClient
      .from('protocol_foods')
      .select('*, food_groups!fk_food_group(name)')
      .in('id', selectedFoods)

    if (foodsError) {
      throw new Error(`Error fetching foods: ${foodsError.message}`)
    }

    const foods = foodsData as ProtocolFood[]
    
    // Remover duplicatas e embaralhar alimentos
    const shuffledFoods = Array.from(new Map(foods.map(food => [food.id, food])).values())
      .sort(() => Math.random() - 0.5);

    // Dividir alimentos em 5 refeições
    const mealsSize = Math.ceil(shuffledFoods.length / 5);
    const mealFoods = {
      breakfast: shuffledFoods.slice(0, mealsSize),
      morningSnack: shuffledFoods.slice(mealsSize, mealsSize * 2),
      lunch: shuffledFoods.slice(mealsSize * 2, mealsSize * 3),
      afternoonSnack: shuffledFoods.slice(mealsSize * 3, mealsSize * 4),
      dinner: shuffledFoods.slice(mealsSize * 4)
    };

    // Criar plano de refeições
    const mealPlan: MealPlan = {
      dailyPlan: {
        breakfast: {
          foods: mealFoods.breakfast,
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        morningSnack: {
          foods: mealFoods.morningSnack,
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        lunch: {
          foods: mealFoods.lunch,
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        afternoonSnack: {
          foods: mealFoods.afternoonSnack,
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        dinner: {
          foods: mealFoods.dinner,
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        }
      },
      totalNutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0
      },
      recommendations: {
        preworkout: "",
        postworkout: "",
        general: "",
        timing: [],
        healthCondition: userData.healthCondition
      }
    };

    return new Response(
      JSON.stringify(mealPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
