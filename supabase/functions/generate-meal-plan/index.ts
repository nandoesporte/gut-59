
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
    
    console.log('Iniciando geração do plano alimentar detalhado...', {
      calories: userData.dailyCalories,
      selectedFoodsCount: selectedFoods.length,
      dietaryPreferences
    });

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const systemPrompt = `Você é um nutricionista especializado que cria planos alimentares detalhados.
    Baseie-se apenas nos alimentos fornecidos e respeite as restrições e preferências do usuário.
    Responda APENAS com um objeto JSON válido seguindo exatamente esta estrutura, sem texto adicional:

    {
      "dailyPlan": {
        "breakfast": {
          "description": "descrição da refeição",
          "foods": [
            {
              "name": "nome do alimento",
              "portion": 100,
              "unit": "g",
              "details": "detalhes do preparo"
            }
          ],
          "calories": 300,
          "macros": {
            "protein": 20,
            "carbs": 30,
            "fats": 10,
            "fiber": 5
          }
        },
        "morningSnack": { ... mesmo formato do breakfast },
        "lunch": { ... mesmo formato do breakfast },
        "afternoonSnack": { ... mesmo formato do breakfast },
        "dinner": { ... mesmo formato do breakfast }
      },
      "totalNutrition": {
        "calories": 2000,
        "protein": 150,
        "carbs": 200,
        "fats": 70,
        "fiber": 25
      },
      "recommendations": {
        "general": "recomendação geral",
        "preworkout": "recomendação pré-treino",
        "postworkout": "recomendação pós-treino",
        "timing": [
          "recomendação 1",
          "recomendação 2",
          "recomendação 3",
          "recomendação 4",
          "recomendação 5"
        ]
      }
    }`;

    const userPrompt = `Gere um plano alimentar com estes parâmetros:

    Dados do Usuário:
    - Calorias Diárias: ${userData.dailyCalories}
    - Peso: ${userData.weight}kg
    - Altura: ${userData.height}cm
    - Idade: ${userData.age}
    - Gênero: ${userData.gender}
    - Nível de Atividade: ${userData.activityLevel}
    - Objetivo: ${userData.goal}

    Alimentos Disponíveis:
    ${selectedFoods.map(food => 
      `- ${food.name}:
         Calorias: ${food.calories}kcal
         Proteína: ${food.protein}g
         Carboidratos: ${food.carbs}g
         Gorduras: ${food.fats}g
         Porção: ${food.portion}${food.portionUnit}`
    ).join('\n')}

    Preferências Alimentares:
    - Alergias: ${dietaryPreferences.allergies?.join(', ') || 'Nenhuma'}
    - Restrições: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
    - Horário de Treino: ${dietaryPreferences.trainingTime || 'Não especificado'}

    Requisitos:
    1. Use APENAS os alimentos listados
    2. Mantenha o total de ${userData.dailyCalories} calorias diárias
    3. Distribua as refeições ao longo do dia
    4. Considere alergias e restrições
    5. Retorne um objeto JSON válido seguindo a estrutura especificada`;

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
        temperature: 0.2,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Erro na API da OpenAI:', errorData || response.statusText);
      throw new Error('Erro ao gerar plano alimentar');
    }

    const data = await response.json();
    console.log('Resposta recebida da OpenAI');

    if (!data.choices?.[0]?.message?.content) {
      console.error('Estrutura da resposta inválida:', data);
      throw new Error('Resposta inválida do modelo');
    }

    let mealPlan;
    try {
      const content = data.choices[0].message.content;
      console.log('Parseando resposta da IA...');
      
      mealPlan = JSON.parse(content);
      console.log('JSON parseado com sucesso');
      
      // Padronizar unidades de medida
      Object.values(mealPlan.dailyPlan).forEach((meal: any) => {
        meal.foods.forEach((food: any) => {
          food.unit = standardizeUnits(food.unit);
        });
      });

      console.log('Validando estrutura do plano...');
      mealPlan = validateMealPlan(mealPlan);
      console.log('Plano validado com sucesso');

    } catch (error) {
      console.error('Erro no processamento:', error);
      throw new Error('Falha ao processar resposta do modelo');
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro detalhado:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
