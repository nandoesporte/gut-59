
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
    Gere um cardápio baseado nos alimentos: ${selectedFoodDetails.join(', ')},
    para uma necessidade calórica diária de ${dailyCalories} calorias.
    O cardápio deve ter 5 refeições distribuídas ao longo do dia.
    Use apenas os alimentos listados. Inclua porções aproximadas.
    Responda APENAS com um objeto JSON neste formato:
    {"dailyPlan":{"breakfast":{"foods":[],"calories":0},"morningSnack":{"foods":[],"calories":0},"lunch":{"foods":[],"calories":0},"afternoonSnack":{"foods":[],"calories":0},"dinner":{"foods":[],"calories":0}},"recommendations":{"general":"","timing":[]}}`;

    console.log('Sending prompt to OpenAI:', prompt);

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
            content: 'Você é um assistente que responde APENAS com JSON válido, sem formatação markdown ou texto adicional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    const openAIResponse = await response.json();
    console.log('OpenAI raw response:', openAIResponse);

    const mealPlan = openAIResponse.choices[0].message.content;
    console.log('Meal plan content:', mealPlan);

    return new Response(mealPlan, {
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
