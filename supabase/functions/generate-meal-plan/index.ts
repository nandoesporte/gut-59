
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  console.log('Function called');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body');
    const body = await req.json();
    console.log('Received request data:', JSON.stringify(body, null, 2));

    const { userData, selectedFoods, dietaryPreferences } = body;

    // Basic validation
    if (!userData || !selectedFoods || !dietaryPreferences) {
      console.log('Missing required data:', { userData, selectedFoods, dietaryPreferences });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required data',
          received: { 
            hasUserData: !!userData, 
            hasSelectedFoods: !!selectedFoods, 
            hasDietaryPreferences: !!dietaryPreferences 
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch foods data from Supabase
    console.log('Creating Supabase client');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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

    // For now, return a mock response to test data flow
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

    console.log('Returning response');
    return new Response(
      JSON.stringify(mockResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
