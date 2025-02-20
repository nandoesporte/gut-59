
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateMealPlan, standardizeUnits } from "./validator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    
    console.log('Iniciando geração do plano alimentar...');

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const systemPrompt = `Como um nutricionista especializado, seu trabalho é criar um plano alimentar diário estruturado usando APENAS os alimentos fornecidos. 
    Você deve retornar um objeto JSON com a seguinte estrutura, sem qualquer texto adicional:
    {
      "dailyPlan": {
        "breakfast": {
          "description": "string",
          "foods": [{
            "name": "string",
            "portion": number,
            "unit": "g ou ml",
            "details": "string"
          }],
          "calories": number,
          "macros": {
            "protein": number,
            "carbs": number,
            "fats": number,
            "fiber": number
          }
        },
        "morningSnack": { <mesmo formato do breakfast> },
        "lunch": { <mesmo formato do breakfast> },
        "afternoonSnack": { <mesmo formato do breakfast> },
        "dinner": { <mesmo formato do breakfast> }
      },
      "totalNutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number,
        "fiber": number
      },
      "recommendations": {
        "general": "string",
        "preworkout": "string",
        "postworkout": "string",
        "timing": ["string", "string", "string"]
      }
    }`;

    const userPrompt = `Crie um plano alimentar usando APENAS os seguintes alimentos e informações:

    Meta Calórica: ${userData.dailyCalories} kcal/dia

    Perfil:
    - Peso: ${userData.weight}kg
    - Altura: ${userData.height}cm
    - Idade: ${userData.age}
    - Gênero: ${userData.gender}
    - Atividade: ${userData.activityLevel}
    - Objetivo: ${userData.goal}

    Alimentos Permitidos:
    ${selectedFoods.map(food => 
      `${food.name}:
       - ${food.calories}kcal
       - Proteína: ${food.protein}g
       - Carboidratos: ${food.carbs}g
       - Gorduras: ${food.fats}g
       - Porção base: ${food.portion}${food.portionUnit}`
    ).join('\n')}

    Preferências:
    - Alergias: ${dietaryPreferences.allergies?.length ? dietaryPreferences.allergies.join(', ') : 'Nenhuma'}
    - Restrições: ${dietaryPreferences.dietaryRestrictions?.length ? dietaryPreferences.dietaryRestrictions.join(', ') : 'Nenhuma'}
    - Treino: ${dietaryPreferences.trainingTime || 'Horário não especificado'}

    Regras:
    1. Use SOMENTE os alimentos listados acima
    2. Siga estritamente a meta de ${userData.dailyCalories} calorias
    3. Retorne apenas o JSON, sem texto adicional`;

    console.log('Enviando requisição para OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta da OpenAI:', errorText);
      throw new Error('Falha na comunicação com OpenAI');
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Resposta inválida da OpenAI:', data);
      throw new Error('Formato de resposta inválido');
    }

    let mealPlan;
    try {
      const content = data.choices[0].message.content;
      console.log('Processando resposta...');
      
      mealPlan = JSON.parse(content);
      
      // Padronizar unidades
      Object.values(mealPlan.dailyPlan).forEach((meal: any) => {
        meal.foods.forEach((food: any) => {
          food.unit = standardizeUnits(food.unit);
        });
      });

      mealPlan = validateMealPlan(mealPlan);
      console.log('Plano alimentar gerado com sucesso');

    } catch (error) {
      console.error('Erro no processamento do plano:', error);
      throw new Error('Erro ao processar plano alimentar');
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na geração do plano:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno',
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
