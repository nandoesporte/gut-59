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
    
    console.log('Iniciando geração do plano alimentar detalhado...');

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const systemPrompt = `Você é um nutricionista especializado que deve criar um plano alimentar detalhado.
    Regras essenciais:

    1. Estrutura das refeições:
       - Inclua descrição detalhada de cada refeição
       - Especifique porções em medidas caseiras práticas
       - Forneça detalhes de preparação para cada alimento
       - Use apenas os alimentos fornecidos na lista

    2. Distribuição calórica:
       - Café da manhã: 20-25% do VET
       - Lanche manhã: 10-15% do VET
       - Almoço: 30-35% do VET
       - Lanche tarde: 10-15% do VET
       - Jantar: 20-25% do VET

    3. Macronutrientes (baseado no objetivo):
       Perda de peso:
       - Proteína: 2.0-2.2g/kg
       - Carboidrato: 45-50% do VET
       - Gordura: 25-30% do VET

       Ganho de massa:
       - Proteína: 1.8-2.0g/kg
       - Carboidrato: 55-60% do VET
       - Gordura: 25-30% do VET

       Manutenção:
       - Proteína: 1.6-1.8g/kg
       - Carboidrato: 50-55% do VET
       - Gordura: 25-30% do VET

    4. Timing nutricional:
       - Intervalo de 3-4h entre refeições
       - Pré-treino: priorize carboidratos complexos
       - Pós-treino: proporção 3:1 (CHO:PTN)`;

    const userPrompt = `Elabore um plano alimentar detalhado considerando:

    DADOS DO PACIENTE:
    - Peso: ${userData.weight}kg
    - Altura: ${userData.height}cm
    - IMC: ${(userData.weight / Math.pow(userData.height/100, 2)).toFixed(1)}
    - Idade: ${userData.age} anos
    - Gênero: ${userData.gender}
    - Nível de atividade: ${userData.activityLevel}
    - VET calculado: ${userData.dailyCalories} kcal
    - Objetivo: ${userData.goal}

    RESTRIÇÕES E PREFERÊNCIAS:
    - Alergias: ${dietaryPreferences.allergies?.join(', ') || 'Nenhuma'}
    - Restrições: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
    - Horário de treino: ${dietaryPreferences.trainingTime || 'Não especificado'}

    ALIMENTOS DISPONÍVEIS:
    ${selectedFoods.map(food => 
      `- ${food.name} (por 100g):
         Calorias: ${food.calories}kcal
         Proteína: ${food.protein}g
         Carboidratos: ${food.carbs}g
         Gorduras: ${food.fats}g`
    ).join('\n')}

    Retorne o plano no formato JSON:
    {
      "dailyPlan": {
        "breakfast": {
          "description": string,
          "foods": [
            {
              "name": string,
              "portion": number,
              "unit": string,
              "details": string
            }
          ],
          "calories": number,
          "macros": {
            "protein": number,
            "carbs": number,
            "fats": number
          }
        },
        "morningSnack": { ... mesmo formato },
        "lunch": { ... mesmo formato },
        "afternoonSnack": { ... mesmo formato },
        "dinner": { ... mesmo formato }
      },
      "totalNutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number
      },
      "recommendations": {
        "general": string,
        "preworkout": string,
        "postworkout": string,
        "timing": string[]
      }
    }`;

    console.log('Enviando requisição para análise nutricional...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na análise nutricional:', errorText);
      throw new Error('Falha na geração do plano alimentar');
    }

    const data = await response.json();
    console.log('Análise nutricional concluída');

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Resposta inválida do sistema');
    }

    let mealPlan;
    try {
      mealPlan = JSON.parse(data.choices[0].message.content);
      
      // Padronizar unidades de medida
      Object.values(mealPlan.dailyPlan).forEach((meal: any) => {
        meal.foods.forEach((food: any) => {
          food.unit = standardizeUnits(food.unit);
        });
      });

      // Validar estrutura completa
      mealPlan = validateMealPlan(mealPlan);

      console.log('Plano nutricional validado com sucesso');

    } catch (error) {
      console.error('Erro na validação nutricional:', error);
      throw new Error('Erro na validação do plano nutricional: ' + error.message);
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no processo:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
