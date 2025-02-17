
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  console.log('Request received:', {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  });
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const contentLength = req.headers.get('content-length');
    if (!contentLength || parseInt(contentLength) === 0) {
      console.error('Empty request body');
      throw new Error('Request body is empty');
    }

    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message,
          receivedBody: rawBody
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Parsed request body:', JSON.stringify(body, null, 2));

    const { userData, selectedFoods, dietaryPreferences } = body;

    if (!userData || typeof userData !== 'object') {
      throw new Error('Missing or invalid userData object');
    }

    if (!Array.isArray(selectedFoods)) {
      throw new Error('selectedFoods must be an array');
    }

    if (!dietaryPreferences || typeof dietaryPreferences !== 'object') {
      throw new Error('Missing or invalid dietaryPreferences object');
    }

    const requiredFields = ['weight', 'height', 'age', 'gender', 'activityLevel', 'goal'];
    for (const field of requiredFields) {
      if (!(field in userData)) {
        throw new Error(`Missing required field in userData: ${field}`);
      }
    }

    console.log('Initializing Supabase client');
    const supabase = createClient(
      'https://sxjafhzikftdenqnkcri.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4amFmaHppa2Z0ZGVucW5rY3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5ODQ0NTMsImV4cCI6MjA1NDU2MDQ1M30.qc8SAzrY0FJSz34BMeelH9CPWFZar5_1P-tAFMr4zp4'
    );

    console.log('Fetching selected foods');
    const { data: foods, error: foodsError } = await supabase
      .from('protocol_foods')
      .select('*')
      .in('id', selectedFoods);

    if (foodsError) {
      console.error('Error fetching foods:', foodsError);
      throw new Error('Failed to fetch foods data');
    }

    if (!foods || foods.length === 0) {
      console.warn('No foods found for the provided IDs');
      throw new Error('No foods found for the provided IDs');
    }

    // Distribute foods across meals more evenly
    const distributeFoods = (foods: any[], selectedFoods: string[]) => {
      const mealDistribution = {
        breakfast: foods.slice(0, Math.min(4, foods.length)),
        morningSnack: foods.slice(Math.min(4, foods.length), Math.min(7, foods.length)),
        lunch: foods.slice(Math.min(7, foods.length), Math.min(13, foods.length)),
        afternoonSnack: foods.slice(Math.min(13, foods.length), Math.min(16, foods.length)),
        dinner: foods.slice(Math.min(16, foods.length))
      };

      // Ensure minimum items for each meal by redistributing if necessary
      const minItems = {
        breakfast: 3,
        morningSnack: 2,
        lunch: 4,
        afternoonSnack: 2,
        dinner: 4
      };

      Object.entries(minItems).forEach(([meal, min]) => {
        if (mealDistribution[meal as keyof typeof mealDistribution].length < min) {
          // Try to borrow items from other meals that have excess
          Object.entries(mealDistribution).forEach(([otherMeal, foods]) => {
            if (otherMeal !== meal && foods.length > minItems[otherMeal as keyof typeof minItems]) {
              while (
                mealDistribution[meal as keyof typeof mealDistribution].length < min &&
                foods.length > minItems[otherMeal as keyof typeof minItems]
              ) {
                const food = foods.pop();
                if (food) {
                  mealDistribution[meal as keyof typeof mealDistribution].push(food);
                }
              }
            }
          });
        }
      });

      return mealDistribution;
    };

    const mealDistribution = distributeFoods(foods, selectedFoods);

    const mockResponse = {
      dailyPlan: {
        breakfast: {
          foods: mealDistribution.breakfast,
          macros: { protein: 20, carbs: 30, fats: 10 },
          calories: 300
        },
        morningSnack: {
          foods: mealDistribution.morningSnack,
          macros: { protein: 10, carbs: 15, fats: 5 },
          calories: 150
        },
        lunch: {
          foods: mealDistribution.lunch,
          macros: { protein: 30, carbs: 45, fats: 15 },
          calories: 450
        },
        afternoonSnack: {
          foods: mealDistribution.afternoonSnack,
          macros: { protein: 10, carbs: 15, fats: 5 },
          calories: 150
        },
        dinner: {
          foods: mealDistribution.dinner,
          macros: { protein: 25, carbs: 35, fats: 12 },
          calories: 375
        }
      },
      totalNutrition: {
        calories: 1425,
        protein: 95,
        carbs: 140,
        fats: 47,
        fiber: 25
      },
      recommendations: {
        general: "Para melhores resultados, siga estas orientações:",
        timing: [
          "Café da Manhã (Mínimo 3 itens): Inclua sempre uma proteína, um carboidrato complexo e uma fruta ou gordura boa",
          "Lanche da Manhã/Tarde (Mínimo 2 itens): Combine proteína com carboidrato ou fruta para manter a energia",
          "Almoço/Jantar (Mínimo 4 itens): Monte seu prato com proteína, carboidrato, vegetais e uma gordura boa",
          "Distribua as refeições a cada 3-4 horas para manter o metabolismo ativo",
          "Beba água entre as refeições, não durante, para melhor digestão"
        ],
        preworkout: "Consuma carboidratos complexos 1-2 horas antes do treino",
        postworkout: "Priorize proteínas e carboidratos até 30 minutos após o treino",
        substitutions: []
      },
      nutritionalAnalysis: {
        carbsPercentage: 45,
        proteinPercentage: 30,
        fatsPercentage: 25,
        fiberAdequate: true,
        vitaminsComplete: true,
        mineralsComplete: true
      }
    };

    console.log('Preparing response');
    const responseJson = JSON.stringify(mockResponse);
    console.log('Response data:', responseJson);

    return new Response(responseJson, { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        type: error.constructor.name
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
