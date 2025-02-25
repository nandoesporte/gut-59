
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userData, selectedFoods, dietaryPreferences, agentPrompt } = await req.json();

    // Preparar os dados para o prompt
    const dietaryRestrictionsText = dietaryPreferences.dietaryRestrictions.length > 0
      ? `Restrições alimentares: ${dietaryPreferences.dietaryRestrictions.join(", ")}`
      : "Sem restrições alimentares";

    const allergiesText = dietaryPreferences.hasAllergies && dietaryPreferences.allergies.length > 0
      ? `Alergias: ${dietaryPreferences.allergies.join(", ")}`
      : "Sem alergias";

    const trainingTimeText = dietaryPreferences.trainingTime
      ? `Horário de treino: ${dietaryPreferences.trainingTime}`
      : "Sem horário de treino definido";

    const foodsListText = selectedFoods
      .map(food => `${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`)
      .join("\n");

    // Construir o prompt completo
    const fullPrompt = `
${agentPrompt}

DADOS DO USUÁRIO:
- Peso: ${userData.weight}kg
- Altura: ${userData.height}cm
- Idade: ${userData.age} anos
- Gênero: ${userData.gender}
- Nível de atividade: ${userData.activityLevel}
- Objetivo: ${userData.goal}
- Calorias diárias necessárias: ${userData.dailyCalories}kcal

PREFERÊNCIAS E RESTRIÇÕES:
${dietaryRestrictionsText}
${allergiesText}
${trainingTimeText}

ALIMENTOS DISPONÍVEIS:
${foodsListText}

Por favor, gere um plano alimentar completo seguindo todas as instruções acima.`;

    // Fazer a chamada para o GPT-4
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4", // Mudando para o modelo correto
        messages: [
          {
            role: "system",
            content: "Você é um nutricionista especializado em criar planos alimentares personalizados. Você deve gerar planos detalhados considerando as necessidades específicas de cada pessoa e retornar no formato JSON que corresponda à estrutura MealPlan."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      console.error("OpenAI API error:", result);
      throw new Error(`OpenAI API error: ${JSON.stringify(result.error)}`);
    }

    const result = await response.json();
    const generatedContent = result.choices[0].message.content;

    try {
      // Tentar fazer o parse do conteúdo gerado como JSON
      const parsedPlan = JSON.parse(generatedContent);
      
      return new Response(
        JSON.stringify({ mealPlan: parsedPlan }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (parseError) {
      console.error("Error parsing GPT response:", parseError);
      throw new Error("Formato de resposta inválido do GPT");
    }

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Houve um erro ao gerar o plano alimentar. Por favor, tente novamente."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
