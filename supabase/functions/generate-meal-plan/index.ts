
// Main handler for the generate-meal-plan Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { validateAndNormalizeRequest } from './validator.ts';
import type { MealPlanRequest } from './types.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Response helper
const responseWithCors = (body: any, status: number = 200) => {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
};

// Error response helper with better logging
const errorResponse = (message: string, status: number = 400, details?: any) => {
  console.error(`[ERROR] ${message}`, details ? JSON.stringify(details) : '');
  return responseWithCors({ error: message }, status);
};

const handler = async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[HANDLER] Processing meal plan generation request');
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[HANDLER] Missing Supabase credentials');
      return errorResponse('Server configuration error', 500);
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    let requestData: any;
    try {
      requestData = await req.json();
      console.log('[HANDLER] Request received, JSON parsed successfully');
    } catch (e) {
      console.error('[HANDLER] Failed to parse request JSON:', e);
      return errorResponse('Invalid JSON in request body');
    }

    // Validate and normalize request data
    let validatedRequest: MealPlanRequest;
    try {
      console.log('[HANDLER] Starting request validation');
      validatedRequest = validateAndNormalizeRequest(requestData);
      console.log('[HANDLER] Request validated successfully');
    } catch (e) {
      console.error('[HANDLER] Validation error:', e);
      return errorResponse('Validation error: ' + (e instanceof Error ? e.message : String(e)));
    }

    // Log key request details for debugging
    console.log('[HANDLER] User data:', {
      id: validatedRequest.userData.id,
      goal: validatedRequest.userData.goal,
      calories: validatedRequest.userData.dailyCalories
    });
    
    console.log('[HANDLER] Selected foods count:', validatedRequest.selectedFoods.length);
    
    for (const mealType in validatedRequest.foodsByMealType) {
      console.log(`[HANDLER] ${mealType} foods count:`, 
        validatedRequest.foodsByMealType[mealType]?.length || 0);
    }

    // TODO: Generate the actual meal plan
    // This is a simplified mock response for testing the validation
    const mealPlan = generateMockMealPlan(validatedRequest);
    
    console.log('[HANDLER] Meal plan generation completed successfully');
    return responseWithCors({ mealPlan });

  } catch (error) {
    console.error('[HANDLER] Unexpected error:', error);
    return errorResponse('Internal server error: ' + (error instanceof Error ? error.message : String(error)), 500);
  }
};

// Simple mock generator for testing
function generateMockMealPlan(request: MealPlanRequest) {
  console.log('[MOCK] Generating mock meal plan');
  
  const dailyCalories = request.userData.dailyCalories;
  const goal = request.userData.goal;
  
  // Basic meal structure with calories distributed
  const breakfast = { 
    calories: Math.round(dailyCalories * 0.25),
    foods: request.foodsByMealType.breakfast.slice(0, 3).map(food => ({
      name: food.name,
      portion: food.portion || 100,
      unit: food.portionUnit || 'g',
      details: 'Café da manhã'
    })),
    macros: {
      protein: Math.round(dailyCalories * 0.25 * 0.2 / 4),
      carbs: Math.round(dailyCalories * 0.25 * 0.5 / 4),
      fats: Math.round(dailyCalories * 0.25 * 0.3 / 9),
      fiber: 5
    },
    description: 'Café da manhã balanceado'
  };
  
  const lunch = {
    calories: Math.round(dailyCalories * 0.35),
    foods: request.foodsByMealType.lunch.slice(0, 3).map(food => ({
      name: food.name,
      portion: food.portion || 100,
      unit: food.portionUnit || 'g',
      details: 'Almoço'
    })),
    macros: {
      protein: Math.round(dailyCalories * 0.35 * 0.3 / 4),
      carbs: Math.round(dailyCalories * 0.35 * 0.4 / 4),
      fats: Math.round(dailyCalories * 0.35 * 0.3 / 9),
      fiber: 8
    },
    description: 'Almoço nutritivo'
  };
  
  const dayPlan = {
    monday: {
      dayName: 'Segunda-feira',
      meals: {
        breakfast,
        morningSnack: {
          calories: Math.round(dailyCalories * 0.1),
          foods: request.foodsByMealType.snack.slice(0, 2).map(food => ({
            name: food.name,
            portion: food.portion || 50,
            unit: food.portionUnit || 'g',
            details: 'Lanche da manhã'
          })),
          macros: {
            protein: Math.round(dailyCalories * 0.1 * 0.2 / 4),
            carbs: Math.round(dailyCalories * 0.1 * 0.6 / 4),
            fats: Math.round(dailyCalories * 0.1 * 0.2 / 9),
            fiber: 3
          },
          description: 'Lanche leve para a manhã'
        },
        lunch,
        afternoonSnack: {
          calories: Math.round(dailyCalories * 0.1),
          foods: request.foodsByMealType.snack.slice(2, 4).map(food => ({
            name: food.name,
            portion: food.portion || 50,
            unit: food.portionUnit || 'g',
            details: 'Lanche da tarde'
          })),
          macros: {
            protein: Math.round(dailyCalories * 0.1 * 0.2 / 4),
            carbs: Math.round(dailyCalories * 0.1 * 0.5 / 4),
            fats: Math.round(dailyCalories * 0.1 * 0.3 / 9),
            fiber: 3
          },
          description: 'Lanche para a tarde'
        },
        dinner: {
          calories: Math.round(dailyCalories * 0.2),
          foods: request.foodsByMealType.dinner.slice(0, 3).map(food => ({
            name: food.name,
            portion: food.portion || 100,
            unit: food.portionUnit || 'g',
            details: 'Jantar'
          })),
          macros: {
            protein: Math.round(dailyCalories * 0.2 * 0.3 / 4),
            carbs: Math.round(dailyCalories * 0.2 * 0.4 / 4),
            fats: Math.round(dailyCalories * 0.2 * 0.3 / 9),
            fiber: 6
          },
          description: 'Jantar leve e nutritivo'
        }
      },
      dailyTotals: {
        calories: dailyCalories,
        protein: Math.round(dailyCalories * 0.25 / 4),
        carbs: Math.round(dailyCalories * 0.5 / 4),
        fats: Math.round(dailyCalories * 0.25 / 9),
        fiber: 25
      }
    }
  };
  
  // Copy the day plan to other days of the week
  const weekdays = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weeklyPlan = { ...dayPlan };
  
  weekdays.forEach((day, index) => {
    weeklyPlan[day] = {
      ...dayPlan.monday,
      dayName: ['Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'][index]
    };
  });
  
  // Recommendations based on goal
  const recommendations = {
    general: 'Mantenha-se hidratado bebendo pelo menos 2 litros de água por dia. Prefira alimentos integrais e minimize processados.',
    preworkout: 'Consuma carboidratos e proteínas 1-2 horas antes do treino para energia ideal.',
    postworkout: 'Após o treino, combine proteínas e carboidratos para recuperação muscular.',
    timing: [
      'Coma a cada 3-4 horas para manter seu metabolismo ativo.',
      'Evite refeições pesadas 2-3 horas antes de dormir.'
    ]
  };
  
  if (goal === 'lose_weight') {
    recommendations.general += ' Para perda de peso, mantenha um déficit calórico moderado de 300-500 calorias por dia.';
  } else if (goal === 'gain_weight') {
    recommendations.general += ' Para ganho de massa, mantenha um superávit calórico de 300-500 calorias por dia.';
  }
  
  return {
    weeklyPlan,
    weeklyTotals: {
      averageCalories: dailyCalories,
      averageProtein: Math.round(dailyCalories * 0.25 / 4),
      averageCarbs: Math.round(dailyCalories * 0.5 / 4),
      averageFats: Math.round(dailyCalories * 0.25 / 9),
      averageFiber: 25
    },
    recommendations
  };
}

serve(handler);
