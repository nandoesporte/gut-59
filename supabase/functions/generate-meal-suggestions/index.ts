
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { selectedFoods, protocolFoods, dailyCalories } = await req.json();

    const selectedFoodDetails = protocolFoods
      .filter((food: any) => selectedFoods.includes(food.id))
      .map((food: any) => food.name);

    const prompt = `Você é um nutricionista especializado em criar cardápios personalizados.
    Baseado nas seguintes preferências alimentares do usuário: ${selectedFoodDetails.join(', ')},
    e necessidade calórica diária de ${dailyCalories} calorias,
    crie um cardápio diário detalhado com 5 refeições (café da manhã, lanche da manhã, almoço, lanche da tarde e jantar).
    Use apenas os alimentos listados acima.
    Inclua porções aproximadas para cada alimento.
    Distribua as calorias de forma equilibrada entre as refeições.
    Formate o resultado em JSON seguindo exatamente esta estrutura:
    {
      "dailyPlan": {
        "breakfast": { "foods": [], "calories": 0 },
        "morningSnack": { "foods": [], "calories": 0 },
        "lunch": { "foods": [], "calories": 0 },
        "afternoonSnack": { "foods": [], "calories": 0 },
        "dinner": { "foods": [], "calories": 0 }
      },
      "recommendations": {
        "general": "",
        "timing": []
      }
    }`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um nutricionista especializado que responde apenas em JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const mealPlan = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
