import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Log completo da requisição recebida
  console.log('Request received:', {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  });
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validar se o corpo da requisição existe
    const contentLength = req.headers.get('content-length');
    if (!contentLength || parseInt(contentLength) === 0) {
      console.error('Empty request body');
      throw new Error('Request body is empty');
    }

    // Converter o corpo da requisição para texto primeiro para debug
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);

    // Tentar fazer o parse do JSON
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

    // Validação detalhada dos dados recebidos
    if (!userData || typeof userData !== 'object') {
      throw new Error('Missing or invalid userData object');
    }

    if (!Array.isArray(selectedFoods)) {
      throw new Error('selectedFoods must be an array');
    }

    if (!dietaryPreferences || typeof dietaryPreferences !== 'object') {
      throw new Error('Missing or invalid dietaryPreferences object');
    }

    // Validar campos obrigatórios do userData
    const requiredFields = ['weight', 'height', 'age', 'gender', 'activityLevel', 'goal'];
    for (const field of requiredFields) {
      if (!(field in userData)) {
        throw new Error(`Missing required field in userData: ${field}`);
      }
    }

    // Initialize Supabase client
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

    // Create response with proper meal structure and recommendations
    const mockResponse = {
      dailyPlan: {
        breakfast: {
          foods: foods?.slice(0, 3) || [],
          macros: { protein: 20, carbs: 30, fats: 10 },
          calories: 300
        },
        morningSnack: {
          foods: foods?.slice(3, 6) || [],
          macros: { protein: 10, carbs: 15, fats: 5 },
          calories: 150
        },
        lunch: {
          foods: foods?.slice(6, 12) || [],
          macros: { protein: 30, carbs: 45, fats: 15 },
          calories: 450
        },
        afternoonSnack: {
          foods: foods?.slice(12, 15) || [],
          macros: { protein: 10, carbs: 15, fats: 5 },
          calories: 150
        },
        dinner: {
          foods: foods?.slice(15, 21) || [],
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
          "Lanche da Manhã/Tarde (Mínimo 3 itens): Combine proteína com carboidrato ou fruta para manter a energia",
          "Almoço/Jantar (Mínimo 6 itens): Monte seu prato com 2 porções de proteína, 2 porções de carboidrato, 2 porções de vegetais e uma gordura boa",
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

    // Validate minimum food requirements
    const validateMealPlan = (plan: any) => {
      if (plan.dailyPlan.breakfast.foods.length < 3) {
        throw new Error('Café da manhã deve ter no mínimo 3 itens');
      }
      if (plan.dailyPlan.morningSnack.foods.length < 3) {
        throw new Error('Lanche da manhã deve ter no mínimo 3 itens');
      }
      if (plan.dailyPlan.lunch.foods.length < 6) {
        throw new Error('Almoço deve ter no mínimo 6 itens');
      }
      if (plan.dailyPlan.afternoonSnack.foods.length < 3) {
        throw new Error('Lanche da tarde deve ter no mínimo 3 itens');
      }
      if (plan.dailyPlan.dinner.foods.length < 6) {
        throw new Error('Jantar deve ter no mínimo 6 itens');
      }
    };

    // Validate the meal plan
    validateMealPlan(mockResponse);

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
