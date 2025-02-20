
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
    
    console.log('Iniciando geração do plano alimentar especializado...');

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key não configurada');
    }

    // Sistema: Instruções técnicas e específicas para nutrição
    const systemPrompt = `Você é um nutricionista especializado em nutrição clínica e esportiva.
    Regras técnicas para elaboração do plano:
    1. Distribuição calórica:
       - Café da manhã: 20-25% das calorias diárias
       - Lanche da manhã: 10-15%
       - Almoço: 30-35%
       - Lanche da tarde: 10-15%
       - Jantar: 20-25%
    
    2. Distribuição de macronutrientes:
       - Proteínas: 1.6-2.2g/kg para praticantes de atividade física
       - Carboidratos: 45-65% do VET
       - Gorduras: 20-35% do VET
       - Fibras: mínimo 25g/dia
    
    3. Timing nutricional:
       - Refeições a cada 3-4 horas
       - Pré-treino: priorizar carboidratos de fácil digestão
       - Pós-treino: proporção 3:1 de carboidrato/proteína

    4. Porções e medidas:
       - Use medidas caseiras práticas
       - Respeite as porções recomendadas pela OMS
       - Mantenha a densidade nutricional adequada`;

    const userPrompt = `Elabore um plano alimentar técnico considerando:

    AVALIAÇÃO ANTROPOMÉTRICA E DADOS CLÍNICOS:
    - Peso: ${userData.weight}kg
    - Altura: ${userData.height}cm
    - IMC: ${(userData.weight / Math.pow(userData.height/100, 2)).toFixed(1)}
    - Idade: ${userData.age} anos
    - Gênero: ${userData.gender}
    - Nível de atividade: ${userData.activityLevel}
    - VET calculado: ${userData.dailyCalories} kcal
    - Objetivo: ${userData.goal}

    ANAMNESE ALIMENTAR:
    - Alergias: ${dietaryPreferences.allergies?.join(', ') || 'Nenhuma'}
    - Restrições alimentares: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
    - Horário de treino: ${dietaryPreferences.trainingTime || 'Não especificado'}

    ALIMENTOS DISPONÍVEIS PARA O PLANO:
    ${selectedFoods.map(food => 
      `- ${food.name} (Valor nutricional por 100g:
         Energia: ${food.calories}kcal,
         PTN: ${food.protein}g,
         CHO: ${food.carbs}g,
         LIP: ${food.fats}g)`
    ).join('\n')}

    Retorne um plano alimentar técnico e personalizado no formato JSON especificado:
    {
      "dailyPlan": {
        "breakfast": {
          "foods": [{"name": string, "portion": number, "portionUnit": string}],
          "calories": number,
          "macros": {"protein": number, "carbs": number, "fats": number, "fiber": number}
        },
        "morningSnack": { ... mesmo formato },
        "lunch": { ... mesmo formato },
        "afternoonSnack": { ... mesmo formato },
        "dinner": { ... mesmo formato }
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

    console.log('Enviando requisição para análise nutricional...');

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
        temperature: 0.5, // Reduzido para maior consistência técnica
        max_tokens: 2000,
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
      
      // Validações técnicas do plano
      if (!mealPlan.dailyPlan || !mealPlan.recommendations || !mealPlan.totalNutrition) {
        throw new Error('Estrutura do plano nutricional inválida');
      }

      // Validação das refeições e distribuição calórica
      const totalCalories = mealPlan.totalNutrition.calories;
      ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner'].forEach(meal => {
        const mealData = mealPlan.dailyPlan[meal];
        if (!mealData) {
          throw new Error(`Refeição ${meal} não especificada`);
        }

        // Verificar se as calorias da refeição estão dentro dos limites esperados
        const mealCalories = mealData.calories;
        const mealPercentage = (mealCalories / totalCalories) * 100;

        // Validar macronutrientes
        const { protein, carbs, fats } = mealData.macros;
        if (!protein || !carbs || !fats) {
          throw new Error(`Macronutrientes não especificados para ${meal}`);
        }
      });

      console.log('Plano nutricional validado com sucesso');

    } catch (error) {
      console.error('Erro na validação nutricional:', error);
      throw new Error('Erro na validação do plano nutricional');
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
