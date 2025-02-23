
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface Meal {
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
}

interface WeeklyMealPlan {
  [key: string]: {
    breakfast: Meal;
    morningSnack: Meal;
    lunch: Meal;
    afternoonSnack: Meal;
    dinner: Meal;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      userData,
      selectedFoods,
      dietaryPreferences
    } = await req.json()

    console.log('Generating meal plan with data:', {
      userData,
      foodCount: selectedFoods.length,
      preferences: dietaryPreferences
    })

    // Generate a different plan for each day of the week
    const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
    const weeklyPlan: WeeklyMealPlan = {}

    for (const day of weekDays) {
      // Randomize food selections for each day while respecting dietary preferences
      const shuffledFoods = selectedFoods
        .sort(() => Math.random() - 0.5)
        .filter(food => {
          // Apply dietary filters
          if (dietaryPreferences.hasAllergies && 
              food.common_allergens?.some(allergen => 
                dietaryPreferences.allergies.includes(allergen))) {
            return false
          }
          return true
        })

      const dailyPlan = {
        breakfast: generateMeal('breakfast', shuffledFoods, userData.dailyCalories * 0.25),
        morningSnack: generateMeal('morningSnack', shuffledFoods, userData.dailyCalories * 0.15),
        lunch: generateMeal('lunch', shuffledFoods, userData.dailyCalories * 0.3),
        afternoonSnack: generateMeal('afternoonSnack', shuffledFoods, userData.dailyCalories * 0.15),
        dinner: generateMeal('dinner', shuffledFoods, userData.dailyCalories * 0.15)
      }

      weeklyPlan[day] = dailyPlan
    }

    // Calculate total nutrition for the week (average)
    const totalNutrition = calculateWeeklyNutrition(weeklyPlan)

    const mealPlan = {
      weeklyPlan,
      totalNutrition,
      recommendations: generateRecommendations(dietaryPreferences, userData)
    }

    return new Response(
      JSON.stringify(mealPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating meal plan:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateWeeklyNutrition(weeklyPlan: WeeklyMealPlan) {
  const dailyTotals = Object.values(weeklyPlan).map(dailyPlan => {
    const meals = Object.values(dailyPlan)
    return meals.reduce((total, meal) => ({
      calories: total.calories + meal.calories,
      protein: total.protein + meal.macros.protein,
      carbs: total.carbs + meal.macros.carbs,
      fats: total.fats + meal.macros.fats,
      fiber: total.fiber + meal.macros.fiber
    }), {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0
    })
  })

  // Calculate average
  const daysCount = dailyTotals.length
  return {
    calories: Math.round(dailyTotals.reduce((sum, day) => sum + day.calories, 0) / daysCount),
    protein: Math.round(dailyTotals.reduce((sum, day) => sum + day.protein, 0) / daysCount),
    carbs: Math.round(dailyTotals.reduce((sum, day) => sum + day.carbs, 0) / daysCount),
    fats: Math.round(dailyTotals.reduce((sum, day) => sum + day.fats, 0) / daysCount),
    fiber: Math.round(dailyTotals.reduce((sum, day) => sum + day.fiber, 0) / daysCount)
  }
}

// Helper function to generate a single meal
function generateMeal(mealType: string, foods: any[], targetCalories: number): Meal {
  // Simple implementation - in reality you'd want more sophisticated selection
  return {
    calories: targetCalories,
    macros: {
      protein: Math.round(targetCalories * 0.3 / 4), // 30% from protein
      carbs: Math.round(targetCalories * 0.45 / 4),  // 45% from carbs
      fats: Math.round(targetCalories * 0.25 / 9),   // 25% from fats
      fiber: Math.round(targetCalories / 1000 * 14)  // 14g per 1000 calories
    }
  }
}

function generateRecommendations(preferences: any, userData: any) {
  return {
    general: "Mantenha-se hidratado e tente seguir os horários sugeridos.",
    preworkout: "Consuma carboidratos complexos 2-3 horas antes do treino.",
    postworkout: "Priorize proteínas e carboidratos após o treino.",
    timing: [
      "Café da manhã: 7:00-8:00",
      "Lanche da manhã: 10:00-10:30",
      "Almoço: 12:00-13:00",
      "Lanche da tarde: 15:00-15:30",
      "Jantar: 19:00-20:00"
    ]
  }
}
