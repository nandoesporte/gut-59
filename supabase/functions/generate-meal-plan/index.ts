
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import { DietaryPreferences, ProtocolFood, MealPlan } from './types.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json()
    console.log('Received request:', { userData, selectedFoods, dietaryPreferences })

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar alimentos selecionados com a relação correta
    console.log('Fetching selected foods')
    const { data: foodsData, error: foodsError } = await supabaseClient
      .from('protocol_foods')
      .select('*, food_groups!fk_food_group(name)')
      .in('id', selectedFoods)

    if (foodsError) {
      throw new Error(`Error fetching foods: ${foodsError.message}`)
    }

    if (!foodsData) {
      throw new Error('No foods data returned')
    }

    const foods = foodsData as ProtocolFood[]
    console.log(`Found ${foods.length} foods`)

    // Gerar plano de refeições básico para teste
    const mealPlan: MealPlan = {
      dailyPlan: {
        breakfast: {
          foods: foods.filter(f => f.food_group_id === 1),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        morningSnack: {
          foods: foods.filter(f => f.food_group_id === 3).slice(0, 2),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        lunch: {
          foods: foods.filter(f => f.food_group_id === 2),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        afternoonSnack: {
          foods: foods.filter(f => f.food_group_id === 3).slice(2),
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        dinner: {
          foods: foods.filter(f => f.food_group_id === 4),
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
        preworkout: "Consuma uma refeição rica em carboidratos 2-3 horas antes do treino",
        postworkout: "Após o treino, priorize proteínas e carboidratos para recuperação",
        general: "Mantenha-se hidratado ao longo do dia",
        timing: ["Café da manhã: 7h", "Lanche: 10h", "Almoço: 13h", "Lanche: 16h", "Jantar: 19h"],
        healthCondition: userData.healthCondition
      }
    }

    // Calcular calorias e macros para cada refeição
    Object.keys(mealPlan.dailyPlan).forEach(mealKey => {
      const meal = mealPlan.dailyPlan[mealKey]
      meal.calories = meal.foods.reduce((sum, food) => sum + food.calories, 0)
      meal.macros = meal.foods.reduce((macros, food) => ({
        protein: macros.protein + (food.protein || 0),
        carbs: macros.carbs + (food.carbs || 0),
        fats: macros.fats + (food.fats || 0),
        fiber: macros.fiber + (food.fiber || 0)
      }), { protein: 0, carbs: 0, fats: 0, fiber: 0 })
    })

    // Calcular nutrição total
    mealPlan.totalNutrition = Object.values(mealPlan.dailyPlan).reduce((total, meal) => ({
      calories: total.calories + meal.calories,
      protein: total.protein + meal.macros.protein,
      carbs: total.carbs + meal.macros.carbs,
      fats: total.fats + meal.macros.fats,
      fiber: total.fiber + meal.macros.fiber
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 })

    return new Response(
      JSON.stringify(mealPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
