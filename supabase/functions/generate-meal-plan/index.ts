
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

    // Create response with mock data but real foods
    const mockResponse = {
      dailyPlan: {
        breakfast: {
          foods: foods?.slice(0, 3) || [],
          macros: { protein: 20, carbs: 30, fats: 10 },
          calories: 300
        },
        morningSnack: {
          foods: foods?.slice(3, 5) || [],
          macros: { protein: 10, carbs: 15, fats: 5 },
          calories: 150
        },
        lunch: {
          foods: foods?.slice(5, 8) || [],
          macros: { protein: 30, carbs: 45, fats: 15 },
          calories: 450
        },
        afternoonSnack: {
          foods: foods?.slice(8, 10) || [],
          macros: { protein: 10, carbs: 15, fats: 5 },
          calories: 150
        },
        dinner: {
          foods: foods?.slice(10, 13) || [],
          macros: { protein: 25, carbs: 35, fats: 12 },
          calories: 375
        }
      },
      totalNutrition: {
        calories: 1425,
        protein: 95,
        carbs: 140,
        fats: 47
      },
      recommendations: {
        timing: "Distribute meals every 3-4 hours",
        hydration: "Drink 8-10 glasses of water daily",
        substitutions: []
      },
      nutritionalAnalysis: {
        carbsPercentage: 45,
        proteinPercentage: 30,
        fatsPercentage: 25
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
