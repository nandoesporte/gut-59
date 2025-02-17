
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
      .map((food: any) => ({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats
      }));

    const prompt = `Como um nutricionista especializado, crie um cardápio diário usando APENAS os seguintes alimentos:
    ${JSON.stringify(selectedFoodDetails, null, 2)}
    
    Regras importantes:
    1. Distribuir ${dailyCalories} calorias totais entre as 5 refeições
    2. Usar APENAS os alimentos listados acima
    3. Incluir porções em gramas para cada alimento
    4. Distribuir as calorias aproximadamente assim:
       - Café da manhã: 25%
       - Lanche da manhã: 15%
       - Almoço: 30%
       - Lanche da tarde: 15%
       - Jantar: 15%
    
    RESPONDA EXATAMENTE NESTE FORMATO JSON:
    {
      "dailyPlan": {
        "breakfast": {
          "foods": [
            {"name": "nome do alimento", "portion": "quantidade em gramas"}
          ],
          "calories": numero_de_calorias
        },
        "morningSnack": {
          "foods": [
            {"name": "nome do alimento", "portion": "quantidade em gramas"}
          ],
          "calories": numero_de_calorias
        },
        "lunch": {
          "foods": [
            {"name": "nome do alimento", "portion": "quantidade em gramas"}
          ],
          "calories": numero_de_calorias
        },
        "afternoonSnack": {
          "foods": [
            {"name": "nome do alimento", "portion": "quantidade em gramas"}
          ],
          "calories": numero_de_calorias
        },
        "dinner": {
          "foods": [
            {"name": "nome do alimento", "portion": "quantidade em gramas"}
          ],
          "calories": numero_de_calorias
        }
      },
      "recommendations": {
        "general": "recomendação geral sobre o cardápio",
        "timing": ["horário sugerido para cada refeição"]
      }
    }`;

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
            content: 'Você é um assistente que responde APENAS com JSON válido, sem formatação markdown ou texto adicional. Não inclua comentários, apenas o JSON puro.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      throw new Error('Failed to get response from OpenAI');
    }

    const openAIResponse = await response.json();
    console.log('OpenAI raw response:', openAIResponse);

    if (!openAIResponse.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI');
    }

    let mealPlan;
    try {
      const content = openAIResponse.choices[0].message.content.trim();
      mealPlan = JSON.parse(content);
      
      // Validação básica da estrutura
      if (!mealPlan.dailyPlan || !mealPlan.recommendations) {
        throw new Error('Invalid meal plan structure');
      }
    } catch (parseError) {
      console.error('Error parsing meal plan:', parseError);
      console.log('Raw content:', openAIResponse.choices[0].message.content);
      throw new Error('Failed to parse meal plan JSON');
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Erro ao gerar o cardápio. Por favor, tente novamente."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
