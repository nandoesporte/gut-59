
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

    // Criar plano de refeições apenas com os alimentos selecionados
    const mealPlan: MealPlan = {
      dailyPlan: {
        breakfast: {
          foods: foods,
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        morningSnack: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        lunch: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        afternoonSnack: {
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        },
        dinner: {
          foods: [],
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
        healthCondition: null
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
