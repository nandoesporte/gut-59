
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import { NutritionalScorer } from './nutritional-scorer.ts'
import { MealOptimizer } from './meal-optimizer.ts'
import { PortionCalculator } from './portion-calculator.ts'
import { MealAnalyzer } from './meal-analyzer.ts'
import { WorkoutAnalyzer } from './workout-analyzer.ts'
import { generateRecommendations } from './recommendations.ts'
import { DietaryPreferences, ProtocolFood, MealPlan } from './types.ts'

serve(async (req) => {
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

    // Buscar alimentos selecionados
    console.log('Fetching selected foods')
    const { data: foodsData, error: foodsError } = await supabaseClient
      .from('protocol_foods')
      .select('*, food_groups(name)')
      .in('id', selectedFoods)

    if (foodsError) {
      throw new Error(`Error fetching foods: ${foodsError.message}`)
    }

    const foods = foodsData as ProtocolFood[]
    console.log(`Found ${foods.length} foods`)

    // Inicializar analisadores e otimizadores
    const nutritionalScorer = new NutritionalScorer()
    const mealOptimizer = new MealOptimizer()
    const portionCalculator = new PortionCalculator()
    const mealAnalyzer = new MealAnalyzer()
    const workoutAnalyzer = new WorkoutAnalyzer()

    // 1. Análise inicial
    console.log('Starting initial analysis')
    const initialAnalysis = await mealAnalyzer.analyze({
      foods,
      dailyCalories: userData.dailyCalories,
      dietaryPreferences: dietaryPreferences as DietaryPreferences,
      healthCondition: userData.healthCondition
    })

    // 2. Otimização do plano
    console.log('Optimizing meal plan')
    const optimizedPlan = await mealOptimizer.optimize({
      foods,
      analysis: initialAnalysis,
      dailyCalories: userData.dailyCalories,
      dietaryPreferences: dietaryPreferences as DietaryPreferences
    })

    // 3. Cálculo de porções
    console.log('Calculating portions')
    const planWithPortions = await portionCalculator.calculate({
      mealPlan: optimizedPlan,
      dailyCalories: userData.dailyCalories
    })

    // 4. Análise de treino (se aplicável)
    console.log('Analyzing workout timing')
    const planWithWorkout = await workoutAnalyzer.analyze({
      mealPlan: planWithPortions,
      trainingTime: dietaryPreferences.trainingTime
    })

    // 5. Avaliação nutricional
    console.log('Scoring nutritional value')
    const nutritionalScore = await nutritionalScorer.score({
      mealPlan: planWithWorkout,
      dietaryPreferences: dietaryPreferences as DietaryPreferences
    })

    // 6. Gerar recomendações
    console.log('Generating recommendations')
    const recommendations = await generateRecommendations({
      mealPlan: planWithWorkout,
      analysis: initialAnalysis,
      nutritionalScore,
      dietaryPreferences: dietaryPreferences as DietaryPreferences,
      healthCondition: userData.healthCondition
    })

    // Montar plano final
    const finalPlan: MealPlan = {
      ...planWithWorkout,
      nutritionalAnalysis: {
        carbsPercentage: nutritionalScore.macroDistribution.carbs,
        proteinPercentage: nutritionalScore.macroDistribution.protein,
        fatsPercentage: nutritionalScore.macroDistribution.fats,
        fiberAdequate: nutritionalScore.fiberAdequate,
        vitaminsComplete: nutritionalScore.vitaminsComplete,
        mineralsComplete: nutritionalScore.mineralsComplete
      },
      recommendations
    }

    console.log('Plan generation completed')
    return new Response(
      JSON.stringify(finalPlan),
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
