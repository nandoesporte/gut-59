
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Sistema: Instruções detalhadas para o assistente
    const systemPrompt = `Você é um nutricionista especialista que deve criar um plano alimentar personalizado.
    Regras importantes:
    1. Use APENAS os alimentos fornecidos na lista
    2. Distribua as calorias diárias entre 5 refeições
    3. Mantenha a distribuição de macronutrientes adequada
    4. Considere o horário de treino para o timing das refeições
    5. Retorne APENAS o JSON, sem explicações adicionais`;

    // Usuário: Dados específicos para geração do plano
    const userPrompt = `Crie um plano alimentar com estas especificações:

    PERFIL:
    - Meta: ${userData.goal}
    - Calorias diárias: ${userData.dailyCalories}
    - Gênero: ${userData.gender}
    - Peso: ${userData.weight}kg
    - Altura: ${userData.height}cm
    - Idade: ${userData.age} anos
    - Nível de atividade: ${userData.activityLevel}
    
    PREFERÊNCIAS:
    - Alergias: ${dietaryPreferences.allergies?.join(', ') || 'Nenhuma'}
    - Restrições: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
    - Horário de treino: ${dietaryPreferences.trainingTime || 'Não especificado'}
    
    ALIMENTOS DISPONÍVEIS:
    ${selectedFoods.map(food => 
      `- ${food.name} (Calorias: ${food.calories}, Proteína: ${food.protein}g, Carboidratos: ${food.carbs}g, Gorduras: ${food.fats}g)`
    ).join('\n')}

    Forneça o plano no seguinte formato JSON:
    {
      "dailyPlan": {
        "breakfast": {
          "foods": [{"name": string, "portion": number, "portionUnit": string}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        "morningSnack": { ... mesmo formato do breakfast },
        "lunch": { ... mesmo formato do breakfast },
        "afternoonSnack": { ... mesmo formato do breakfast },
        "dinner": { ... mesmo formato do breakfast }
      },
      "recommendations": {
        "preworkout": string,
        "postworkout": string,
        "general": string,
        "timing": string[]
      },
      "totalNutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number,
        "fiber": number
      }
    }`;

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
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta da OpenAI:', errorText);
      throw new Error('Falha na geração do plano alimentar');
    }

    const data = await response.json();
    console.log('Resposta da OpenAI recebida');

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Resposta inválida da IA');
    }

    let mealPlan;
    try {
      mealPlan = JSON.parse(data.choices[0].message.content);
      
      // Validação da estrutura do plano
      if (!mealPlan.dailyPlan || !mealPlan.recommendations || !mealPlan.totalNutrition) {
        throw new Error('Estrutura do plano alimentar inválida');
      }

      // Validação das refeições
      ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'].forEach(meal => {
        if (!mealPlan.dailyPlan[meal]) {
          throw new Error(`Refeição ${meal} não encontrada no plano`);
        }
      });

      console.log('Plano alimentar validado com sucesso');

    } catch (error) {
      console.error('Erro ao processar resposta da IA:', error);
      throw new Error('Erro ao processar o plano alimentar gerado');
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
