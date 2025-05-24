
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = await req.json();
    
    console.log('Gerando plano alimentar com Groq para usuário:', userData.id);

    if (!GROQ_API_KEY) {
      throw new Error('Chave da API Groq não configurada');
    }

    // Preparar prompt para Groq
    const systemPrompt = `Você é um nutricionista especializado em criar planos alimentares personalizados. 
    Crie um plano alimentar semanal detalhado baseado nas informações do usuário.
    IMPORTANTE: Responda SEMPRE em português do Brasil e retorne APENAS um JSON válido sem formatação markdown.`;

    const userPrompt = `
    Crie um plano alimentar semanal baseado nestas informações:
    
    Dados do usuário:
    - Peso: ${userData.weight}kg
    - Altura: ${userData.height}cm  
    - Idade: ${userData.age} anos
    - Sexo: ${userData.gender}
    - Nível de atividade: ${userData.activityLevel}
    - Objetivo: ${userData.goal}
    - Calorias diárias: ${userData.dailyCalories}kcal
    
    Alimentos selecionados: ${selectedFoods.map(f => f.name).join(', ')}
    
    Preferências dietéticas:
    - Restrições: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
    - Alergias: ${dietaryPreferences.hasAllergies ? dietaryPreferences.allergies?.join(', ') : 'Nenhuma'}
    - Horário de treino: ${dietaryPreferences.trainingTime || 'Não especificado'}
    
    Retorne um JSON com esta estrutura exata:
    {
      "weeklyPlan": {
        "monday": {
          "dayName": "Segunda",
          "meals": {
            "breakfast": {
              "foods": [{"name": "Aveia", "portion": 50, "unit": "g", "details": "com leite"}],
              "calories": 300,
              "macros": {"protein": 15, "carbs": 45, "fats": 8, "fiber": 6}
            },
            "morningSnack": {
              "foods": [{"name": "Banana", "portion": 1, "unit": "unidade"}],
              "calories": 100,
              "macros": {"protein": 1, "carbs": 25, "fats": 0, "fiber": 3}
            },
            "lunch": {
              "foods": [{"name": "Arroz integral", "portion": 100, "unit": "g"}],
              "calories": 400,
              "macros": {"protein": 20, "carbs": 60, "fats": 5, "fiber": 4}
            },
            "afternoonSnack": {
              "foods": [{"name": "Iogurte", "portion": 200, "unit": "ml"}],
              "calories": 150,
              "macros": {"protein": 10, "carbs": 15, "fats": 3, "fiber": 0}
            },
            "dinner": {
              "foods": [{"name": "Frango grelhado", "portion": 150, "unit": "g"}],
              "calories": 350,
              "macros": {"protein": 35, "carbs": 0, "fats": 8, "fiber": 0}
            }
          },
          "dailyTotals": {"calories": 1300, "protein": 81, "carbs": 145, "fats": 24, "fiber": 13}
        },
        "tuesday": {},
        "wednesday": {},
        "thursday": {},
        "friday": {},
        "saturday": {},
        "sunday": {}
      },
      "weeklyTotals": {
        "averageCalories": ${userData.dailyCalories},
        "averageProtein": ${Math.round(userData.dailyCalories * 0.3 / 4)},
        "averageCarbs": ${Math.round(userData.dailyCalories * 0.4 / 4)},
        "averageFats": ${Math.round(userData.dailyCalories * 0.3 / 9)},
        "averageFiber": 25
      },
      "recommendations": {
        "general": "Mantenha uma alimentação equilibrada e beba bastante água.",
        "preworkout": "Consuma carboidratos 30-60 minutos antes do treino.",
        "postworkout": "Consuma proteínas e carboidratos até 30 minutos após o treino.",
        "timing": ["Faça 5-6 refeições por dia", "Evite jejuns prolongados", "Beba 2-3 litros de água por dia"]
      }
    }
    
    Complete todos os dias da semana seguindo o padrão mostrado para segunda-feira.
    `;

    // Chamar API da Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!groqResponse.ok) {
      throw new Error(`Erro da API Groq: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Nenhum conteúdo retornado pela API Groq');
    }

    // Parse do JSON retornado
    let mealPlan;
    try {
      const cleanContent = content.replace(/```json|```/g, '').trim();
      mealPlan = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      throw new Error('Erro ao processar resposta da IA');
    }

    // Adicionar propriedades extras
    mealPlan.userCalories = userData.dailyCalories;
    mealPlan.generatedBy = 'groq';

    console.log('Plano alimentar gerado com sucesso via Groq');
    
    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro durante o processo:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar plano alimentar',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
