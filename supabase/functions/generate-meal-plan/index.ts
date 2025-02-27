
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { calculateDailyCalories } from "./calculators.ts";
import { validateInput } from "./validator.ts";
import { generateRecommendations } from "./recommendations.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    console.log("Requisição recebida:", JSON.stringify(requestData));

    const { userData, selectedFoods, dietaryPreferences } = requestData;

    // Validação básica dos dados
    validateInput(userData, selectedFoods, dietaryPreferences);

    // Calcular necessidades calóricas se não fornecidas
    if (!userData.dailyCalories) {
      userData.dailyCalories = calculateDailyCalories(
        userData.weight,
        userData.height,
        userData.age,
        userData.gender,
        userData.activityLevel,
        userData.goal
      );
    }

    console.log(`Necessidade calórica calculada: ${userData.dailyCalories} kcal`);

    // Buscar o prompt ativo para plano alimentar
    const promptResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_agent_prompts?agent_type=eq.meal_plan&is_active=eq.true&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!promptResponse.ok) {
      throw new Error('Erro ao buscar prompt de plano alimentar');
    }

    const prompts = await promptResponse.json();
    
    if (!prompts || prompts.length === 0) {
      throw new Error('Nenhum prompt de plano alimentar ativo encontrado');
    }

    const systemPrompt = prompts[0].prompt;

    // Construir o prompt com os dados do usuário
    const userPrompt = `
Crie um plano alimentar personalizado com as seguintes características:

DADOS DO USUÁRIO:
- Gênero: ${userData.gender}
- Idade: ${userData.age} anos
- Peso: ${userData.weight} kg
- Altura: ${userData.height} cm
- Nível de atividade: ${userData.activityLevel}
- Objetivo: ${userData.goal}
- Necessidade calórica diária: ${userData.dailyCalories} kcal

PREFERÊNCIAS ALIMENTARES:
- Alergias: ${dietaryPreferences.hasAllergies ? dietaryPreferences.allergies.join(', ') : 'Nenhuma'}
- Restrições alimentares: ${dietaryPreferences.dietaryRestrictions?.join(', ') || 'Nenhuma'}
- Horário de treino: ${dietaryPreferences.trainingTime || 'Não especificado'}

ALIMENTOS PREFERIDOS:
${selectedFoods.map(food => `- ${food.name} (${food.calories} kcal, P: ${food.protein}g, C: ${food.carbs}g, G: ${food.fats}g)`).join('\n')}

Por favor, crie um plano alimentar semanal personalizado com 7 dias. Para cada dia, forneça café da manhã, lanche da manhã, almoço, lanche da tarde e jantar.

Formate a resposta como JSON válido com a seguinte estrutura:
{
  "weeklyPlan": {
    "monday": {
      "meals": {
        "breakfast": {
          "foods": [
            { "name": "Nome do alimento", "portion": "Quantidade", "unit": "Unidade de medida" }
          ],
          "calories": 500,
          "macros": { "protein": 20, "carbs": 60, "fats": 15, "fiber": 5 }
        },
        // outras refeições: morningSnack, lunch, afternoonSnack, dinner
      },
      "dailyTotals": { "calories": 2000, "protein": 120, "carbs": 220, "fats": 60, "fiber": 30 }
    },
    // outros dias da semana: tuesday, wednesday, thursday, friday, saturday, sunday
  },
  "weeklyTotals": {
    "averageCalories": 2000,
    "averageProtein": 120,
    "averageCarbs": 220,
    "averageFats": 60,
    "averageFiber": 30
  },
  "recommendations": {
    "general": "Recomendações gerais de alimentação e hidratação",
    "preworkout": "Sugestões de alimentação pré-treino",
    "postworkout": "Sugestões de alimentação pós-treino",
    "timing": ["Recomendação 1 sobre horários", "Recomendação 2 sobre horários"]
  }
}
`;

    // Chamar o modelo Llama para gerar o plano alimentar
    console.log("Iniciando chamada ao modelo Llama...");
    const llamaResponse = await fetch(`${SUPABASE_URL}/functions/v1/llama-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 4096
      })
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error('Erro na chamada da função llama-completion:', errorText);
      throw new Error('Erro ao gerar plano com o modelo Llama');
    }

    const llamaData = await llamaResponse.json();
    const responseText = llamaData.choices[0].message.content;
    
    console.log('Resposta do modelo Llama recebida, extraindo JSON...');
    
    // Extrair o JSON da resposta
    let mealPlan;
    try {
      // Tentar extrair o JSON da resposta, que pode estar envolta em markdown
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```([\s\S]*?)```/) ||
                        [null, responseText];
      
      const jsonString = jsonMatch[1] || responseText;
      mealPlan = JSON.parse(jsonString);
      console.log('Plano alimentar extraído com sucesso');
    } catch (parseError) {
      console.error('Erro ao extrair JSON da resposta:', parseError);
      console.log('Resposta original:', responseText);
      throw new Error('Falha ao processar a resposta do modelo');
    }

    // Fallback para recomendações se não estiverem presentes
    if (!mealPlan.recommendations) {
      console.log("Gerando recomendações padrão...");
      mealPlan.recommendations = generateRecommendations(
        userData.dailyCalories,
        userData.goal,
        dietaryPreferences.trainingTime
      );
    }

    // Retorna o plano alimentar gerado
    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Erro:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
