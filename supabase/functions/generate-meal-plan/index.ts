
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openai = {
  key: Deno.env.get('OPENAI_API_KEY'),
  url: 'https://api.openai.com/v1/chat/completions',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences } = await req.json();
    console.log('Iniciando geração do plano alimentar com IA:', { 
      goal: userData.goal,
      calories: userData.dailyCalories,
      selectedFoodsCount: selectedFoods.length 
    });

    // Preparar o prompt para a IA
    const prompt = {
      role: "system",
      content: `Você é um nutricionista especializado em criar planos alimentares personalizados. 
      Gere um plano alimentar detalhado baseado nas seguintes informações:
      
      Objetivo: ${userData.goal}
      Calorias diárias: ${userData.dailyCalories}
      Gênero: ${userData.gender}
      Peso: ${userData.weight}kg
      Altura: ${userData.height}cm
      Idade: ${userData.age}
      Nível de atividade: ${userData.activityLevel}
      
      Alergias: ${dietaryPreferences.allergies?.join(', ') || 'Nenhuma'}
      Restrições: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
      Horário de treino: ${dietaryPreferences.trainingTime || 'Não especificado'}
      
      Alimentos disponíveis:
      ${selectedFoods.map(food => 
        `- ${food.name} (Proteína: ${food.protein}g, Carboidratos: ${food.carbs}g, Gorduras: ${food.fats}g)`
      ).join('\n')}
      
      Gere um plano alimentar completo no formato JSON com:
      1. 5 refeições (café da manhã, lanche da manhã, almoço, lanche da tarde, jantar)
      2. Descrição detalhada de cada refeição
      3. Porções específicas
      4. Macronutrientes por refeição
      5. Recomendações personalizadas
      6. Dicas de preparação
      7. Horários sugeridos
      8. Considere o horário de treino para otimizar as refeições
      
      Use APENAS os alimentos da lista fornecida.`
    };

    // Chamar a API da OpenAI
    console.log('Chamando OpenAI para gerar plano alimentar');
    const aiResponse = await fetch(openai.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openai.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [prompt],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('Erro na chamada da OpenAI');
    }

    const aiData = await aiResponse.json();
    console.log('Resposta da IA recebida, processando...');

    // Processar e validar a resposta da IA
    let mealPlan;
    try {
      mealPlan = JSON.parse(aiData.choices[0].message.content);
      
      // Adicionar cálculos de nutrientes totais
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;

      Object.values(mealPlan.dailyPlan).forEach((meal: any) => {
        totalCalories += meal.calories || 0;
        totalProtein += meal.macros?.protein || 0;
        totalCarbs += meal.macros?.carbs || 0;
        totalFats += meal.macros?.fats || 0;
      });

      mealPlan.totalNutrition = {
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fats: Math.round(totalFats)
      };

      console.log('Plano alimentar processado com sucesso');
    } catch (error) {
      console.error('Erro ao processar resposta da IA:', error);
      throw new Error('Formato inválido na resposta da IA');
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
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
