
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    console.log('Dados recebidos:', { userData, selectedFoods, dietaryPreferences });

    if (!userData || !selectedFoods || !dietaryPreferences) {
      throw new Error('Dados incompletos recebidos');
    }

    const systemPrompt = `Você é um nutricionista especializado em criar planos alimentares personalizados.
    Use estas informações para criar um plano detalhado e específico:
    
    PERFIL DO USUÁRIO:
    - Objetivo: ${userData.goal}
    - Calorias Diárias: ${userData.dailyCalories} kcal
    - Nível de Atividade: ${userData.activityLevel}
    - Gênero: ${userData.gender}
    - Idade: ${userData.age}
    - Peso: ${userData.weight}kg
    - Altura: ${userData.height}cm
    
    CONSIDERAÇÕES ESPECIAIS:
    - Alergias: ${dietaryPreferences.allergies?.join(', ') || 'Nenhuma'}
    - Restrições Alimentares: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
    - Horário de Treino: ${dietaryPreferences.trainingTime || 'Não especificado'}

    INSTRUÇÕES IMPORTANTES:
    1. Use APENAS os alimentos fornecidos na lista
    2. Forneça medidas precisas e descrições detalhadas
    3. Sugira combinações saborosas e nutritivas
    4. Inclua dicas de preparo para cada refeição
    5. Adicione descrições nutricionais para cada refeição
    6. Adapte as porções ao objetivo e nível de atividade
    7. Distribua as calorias de forma adequada ao longo do dia`;

    const foodsData = selectedFoods.map(food => ({
      nome: food.name,
      calorias: food.calories,
      proteina: food.protein,
      carboidratos: food.carbs,
      gorduras: food.fats,
      porcao: food.portion,
      unidade: food.portionUnit
    }));

    const userPrompt = `Crie um plano alimentar detalhado usando APENAS estes alimentos: ${JSON.stringify(foodsData)}

    REQUISITOS DA RESPOSTA:
    Retorne um objeto JSON seguindo EXATAMENTE esta estrutura:
    {
      "dailyPlan": {
        "breakfast": {
          "description": "Descrição nutricional do café da manhã",
          "foods": [
            {
              "name": "Nome do Alimento",
              "portion": 100,
              "unit": "g",
              "details": "Descrição do preparo e dicas"
            }
          ],
          "calories": 0,
          "macros": {"protein": 0, "carbs": 0, "fats": 0, "fiber": 0}
        },
        "morningSnack": {
          // Mesma estrutura do breakfast
        },
        "lunch": {
          // Mesma estrutura do breakfast
        },
        "afternoonSnack": {
          // Mesma estrutura do breakfast
        },
        "dinner": {
          // Mesma estrutura do breakfast
        }
      },
      "totalNutrition": {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fats": 0,
        "fiber": 0
      },
      "recommendations": {
        "general": "Recomendações gerais sobre o plano",
        "preworkout": "Dicas específicas para pré-treino",
        "postworkout": "Dicas específicas para pós-treino",
        "timing": [
          "Horários sugeridos para cada refeição"
        ],
        "preparation": [
          "Dicas gerais de preparação"
        ],
        "substitutions": [
          "Sugestões de substituições permitidas"
        ]
      }
    }`;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    console.log('Iniciando chamada à API do OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro na resposta da OpenAI:', errorData);
      throw new Error(`Erro na API do OpenAI: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('Resposta recebida da OpenAI');
    
    if (!aiResponse.choices || !aiResponse.choices[0]) {
      throw new Error('Resposta inválida da OpenAI');
    }

    let mealPlan;
    try {
      mealPlan = JSON.parse(aiResponse.choices[0].message.content);
      console.log('Plano alimentar processado com sucesso');
    } catch (e) {
      console.error('Erro ao processar resposta da IA:', e);
      throw new Error('Falha ao processar dados do plano alimentar');
    }

    // Ajustar horários com base no treino
    if (dietaryPreferences.trainingTime) {
      const trainingTime = new Date(`1970-01-01T${dietaryPreferences.trainingTime}`);
      const hour = trainingTime.getHours();
      
      // Adicionar recomendações específicas baseadas no horário de treino
      mealPlan.recommendations.timing = [
        "Café da manhã: 7:00",
        "Lanche da manhã: 10:00",
        "Almoço: 12:00",
        `Pré-treino: ${hour - 1}:00`,
        `Pós-treino: ${hour + 1}:00`,
        "Jantar: 20:00"
      ];

      mealPlan.recommendations.preworkout = `Consuma uma refeição leve 1 hora antes do treino (${hour - 1}:00). Foque em carboidratos de fácil digestão e proteínas moderadas.`;
      mealPlan.recommendations.postworkout = `Faça uma refeição rica em proteínas e carboidratos em até 1 hora após o treino (${hour + 1}:00) para otimizar a recuperação.`;
    }

    console.log('Enviando resposta final');

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro na função generate-meal-plan:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno ao gerar plano alimentar'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
