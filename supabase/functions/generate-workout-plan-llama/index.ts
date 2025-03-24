
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    
    if (!preferences || !userId) {
      throw new Error('Missing required fields: preferences and userId are required');
    }
    
    console.log('Gerando plano de treino com Llama para usuário:', userId);
    console.log('Preferências recebidas:', JSON.stringify(preferences));
    
    // Check that preferred_exercise_types exists and is an array
    if (!preferences.preferred_exercise_types || !Array.isArray(preferences.preferred_exercise_types)) {
      preferences.preferred_exercise_types = ["strength"]; // Default if missing
    }

    // Additional safety checks for other properties
    if (!preferences.goal) preferences.goal = "maintain";
    if (!preferences.activity_level) preferences.activity_level = "moderate";
    if (!preferences.available_equipment) {
      preferences.available_equipment = ["all"];
    }
    
    // Return a proper error response for now
    return new Response(
      JSON.stringify({
        error: "Serviço Llama temporariamente indisponível. O sistema usará o método alternativo.",
        details: "O serviço de IA avançada está sendo atualizado. Seu plano será gerado pelo método padrão."
      }),
      { 
        status: 503, // Service Unavailable
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '3600' // Suggest client retry after 1 hour
        } 
      }
    );
    
  } catch (error) {
    console.error('Error in generate-workout-plan-llama:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error in Llama workout plan generation',
        details: error instanceof Error ? error.stack : 'No error details available'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
