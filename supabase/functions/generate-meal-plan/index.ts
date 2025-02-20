
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type MealPeriod = 'breakfast' | 'morningSnack' | 'lunch' | 'afternoonSnack' | 'dinner'

interface MacroDistribution {
  protein: number
  carbs: number
  fats: number
  fiber: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json()
    console.log('Received request data:', { userData, selectedFoods, dietaryPreferences })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch selected foods details
    const { data: foods, error: foodsError } = await supabaseClient
      .from('protocol_foods')
      .select('*')
      .in('id', selectedFoods)

    if (foodsError) {
      throw new Error(`Error fetching foods: ${foodsError.message}`)
    }

    console.log('Fetched foods:', foods)

    // Calculate macro distributions based on goal
    const getMacroDistribution = (goal: string): MacroDistribution => {
      switch (goal) {
        case 'weightLoss':
          return { protein: 0.35, carbs: 0.40, fats: 0.25, fiber: 25 }
        case 'weightGain':
          return { protein: 0.30, carbs: 0.50, fats: 0.20, fiber: 30 }
        case 'maintenance':
        default:
          return { protein: 0.30, carbs: 0.45, fats: 0.25, fiber: 25 }
      }
    }

    const macroTargets = getMacroDistribution(userData.goal)
    const dailyProteinTarget = (userData.dailyCalories * macroTargets.protein) / 4
    const dailyCarbsTarget = (userData.dailyCalories * macroTargets.carbs) / 4
    const dailyFatsTarget = (userData.dailyCalories * macroTargets.fats) / 9

    // Distribute calories across meals
    const mealDistribution = {
      breakfast: 0.25,
      morningSnack: 0.15,
      lunch: 0.30,
      afternoonSnack: 0.10,
      dinner: 0.20
    }

    const generateMeal = (
      availableFoods: any[],
      targetCalories: number,
      mealType: MealPeriod
    ) => {
      let meal = {
        foods: [] as any[],
        calories: 0,
        macros: {
          protein: 0,
          carbs: 0,
          fats: 0,
          fiber: 0
        }
      }

      // Filter foods appropriate for meal type
      const suitableFoods = availableFoods.filter(food => 
        food.meal_type.includes(mealType) || food.meal_type.includes('any')
      )

      // Sort foods by protein content for better distribution
      suitableFoods.sort((a, b) => b.protein - a.protein)

      // Add foods until we reach target calories
      for (const food of suitableFoods) {
        if (meal.calories + food.calories <= targetCalories * 1.1) {
          meal.foods.push(food)
          meal.calories += food.calories
          meal.macros.protein += food.protein || 0
          meal.macros.carbs += food.carbs || 0
          meal.macros.fats += food.fats || 0
          meal.macros.fiber += food.fiber || 0
        }
      }

      return meal
    }

    // Generate daily plan
    const dailyPlan = {
      breakfast: generateMeal(foods, userData.dailyCalories * mealDistribution.breakfast, 'breakfast'),
      morningSnack: generateMeal(foods, userData.dailyCalories * mealDistribution.morningSnack, 'morningSnack'),
      lunch: generateMeal(foods, userData.dailyCalories * mealDistribution.lunch, 'lunch'),
      afternoonSnack: generateMeal(foods, userData.dailyCalories * mealDistribution.afternoonSnack, 'afternoonSnack'),
      dinner: generateMeal(foods, userData.dailyCalories * mealDistribution.dinner, 'dinner')
    }

    // Calculate total nutrition
    const totalNutrition = {
      calories: Object.values(dailyPlan).reduce((sum, meal) => sum + meal.calories, 0),
      protein: Object.values(dailyPlan).reduce((sum, meal) => sum + meal.macros.protein, 0),
      carbs: Object.values(dailyPlan).reduce((sum, meal) => sum + meal.macros.carbs, 0),
      fats: Object.values(dailyPlan).reduce((sum, meal) => sum + meal.macros.fats, 0),
      fiber: Object.values(dailyPlan).reduce((sum, meal) => sum + meal.macros.fiber, 0)
    }

    // Generate training-specific recommendations
    const trainingTime = dietaryPreferences.trainingTime
    const recommendations = {
      preworkout: trainingTime 
        ? "Consumir carboidratos complexos 2-3 horas antes do treino para energia sustentada"
        : "Ajuste suas refeições de acordo com seu horário de treino quando definido",
      postworkout: "Priorize proteínas e carboidratos após o treino para recuperação muscular",
      general: `Mantenha-se hidratado consumindo água regularmente ao longo do dia. Meta diária: ${Math.round(userData.weight * 35)}ml`,
      timing: [
        "Café da manhã: Até 1 hora após acordar",
        "Intervalos entre refeições: 2.5-3.5 horas",
        "Última refeição: 2-3 horas antes de dormir"
      ]
    }

    // Include nutritional analysis
    const nutritionalAnalysis = {
      carbsPercentage: (totalNutrition.carbs * 4) / totalNutrition.calories,
      proteinPercentage: (totalNutrition.protein * 4) / totalNutrition.calories,
      fatsPercentage: (totalNutrition.fats * 9) / totalNutrition.calories,
      fiberAdequate: totalNutrition.fiber >= macroTargets.fiber,
    }

    const mealPlan = {
      dailyPlan,
      totalNutrition,
      recommendations,
      nutritionalAnalysis
    }

    console.log('Generated meal plan:', mealPlan)

    return new Response(
      JSON.stringify(mealPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-meal-plan function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
