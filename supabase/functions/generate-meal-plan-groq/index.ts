
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers for browser requests
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
    // Obter os dados da requisição 
    const { 
      userData, 
      selectedFoods, 
      foodsByMealType,
      dietaryPreferences,
      model = "mistral-saba-24b" // Usar Mistral Saba 24B como padrão
    } = await req.json();
    
    console.log(`Gerando plano alimentar personalizado com modelo ${model}`);
    console.log(`Usuário: ${userData.gender}, ${userData.age} anos, ${userData.weight}kg, ${userData.height}cm`);
    console.log(`Objetivo: ${userData.goal}, Calorias: ${userData.dailyCalories}`);
    console.log(`Total de alimentos selecionados: ${selectedFoods.length}`);

    // Verificar se temos os dados mínimos necessários
    if (!userData || !selectedFoods || selectedFoods.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Dados insuficientes para gerar um plano alimentar" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    // Construir o prompt para o modelo
    const systemPrompt = `Você é um nutricionista especialista em criar planos alimentares personalizados em português brasileiro. 
    Sua tarefa é criar um plano alimentar semanal completo (de segunda a domingo) baseado nas seguintes informações:

    - Pessoa: ${userData.gender === 'male' ? 'Homem' : 'Mulher'}, ${userData.age} anos, ${userData.weight}kg, ${userData.height}cm
    - Objetivo: ${userData.goal === 'lose_weight' ? 'Perda de peso' : userData.goal === 'gain_weight' ? 'Ganho de massa' : 'Manutenção'}
    - Necessidade calórica diária: ${userData.dailyCalories} calorias
    - Nível de atividade: ${userData.activityLevel}
    ${dietaryPreferences?.hasAllergies ? `- Alergias: ${dietaryPreferences.allergies.join(', ')}` : ''}
    ${dietaryPreferences?.dietaryRestrictions?.length > 0 ? `- Restrições alimentares: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : ''}
    ${dietaryPreferences?.trainingTime ? `- Horário de treino: ${dietaryPreferences.trainingTime}` : ''}

    Use APENAS os alimentos fornecidos na lista. Seja criativo com combinações, mas mantenha-se fiel à lista de alimentos disponíveis.
    Seu plano deve incluir café da manhã, lanche da manhã, almoço, lanche da tarde e jantar para cada dia.
    Forneça porções específicas para cada alimento em gramas ou unidades.
    Calcule as calorias e macronutrientes (proteínas, carboidratos, gorduras e fibras) para cada refeição e totais diários.
    Forneça recomendações gerais, dicas para pré e pós-treino, e sugestões de tempo de refeições.

    IMPORTANTE: Sua resposta deve ser um objeto JSON válido seguindo EXATAMENTE esta estrutura:

    {
      "weeklyPlan": {
        "monday": {
          "dayName": "Segunda-feira",
          "meals": {
            "breakfast": {
              "description": "Descrição do café da manhã",
              "foods": [
                { "name": "Nome do alimento", "portion": 100, "unit": "g", "details": "Informações adicionais" }
              ],
              "calories": 500,
              "macros": { "protein": 20, "carbs": 60, "fats": 15, "fiber": 5 }
            },
            "morningSnack": { ... },
            "lunch": { ... },
            "afternoonSnack": { ... },
            "dinner": { ... }
          },
          "dailyTotals": { "calories": 2000, "protein": 100, "carbs": 250, "fats": 70, "fiber": 30 }
        },
        "tuesday": { ... },
        "wednesday": { ... },
        "thursday": { ... },
        "friday": { ... },
        "saturday": { ... },
        "sunday": { ... }
      },
      "weeklyTotals": {
        "averageCalories": 2000,
        "averageProtein": 100,
        "averageCarbs": 250,
        "averageFats": 70,
        "averageFiber": 30
      },
      "recommendations": {
        "general": "Recomendações gerais",
        "preworkout": "Dicas para pré-treino",
        "postworkout": "Dicas para pós-treino",
        "timing": ["Dica 1", "Dica 2", "Dica 3"]
      }
    }

    Não inclua nada além deste objeto JSON na sua resposta.`;

    // Formatar dados dos alimentos para o prompt
    let foodsPrompt = "Lista de alimentos disponíveis:\n";
    
    // Verificar se temos alimentos categorizados por refeição
    if (foodsByMealType && Object.keys(foodsByMealType).length > 0) {
      // Organizar alimentos por tipo de refeição
      for (const [mealType, foods] of Object.entries(foodsByMealType)) {
        if (foods.length > 0) {
          foodsPrompt += `\n${mealType.toUpperCase()}:\n`;
          foods.forEach((food: any) => {
            foodsPrompt += `- ${food.name}: ${food.calories} kcal, Proteínas: ${food.protein}g, Carboidratos: ${food.carbs}g, Gorduras: ${food.fats}g, Fibras: ${food.fiber || 0}g\n`;
          });
        }
      }
    } else {
      // Lista simples de todos os alimentos
      selectedFoods.forEach(food => {
        foodsPrompt += `- ${food.name}: ${food.calories} kcal, Proteínas: ${food.protein}g, Carboidratos: ${food.carbs}g, Gorduras: ${food.fats}g, Fibras: ${food.fiber || 0}g\n`;
      });
    }

    // Preparar o prompt completo
    const userPrompt = `${foodsPrompt}

    Por favor, crie um plano alimentar semanal completo usando apenas os alimentos acima, considerando as necessidades do usuário.`;

    // Chamar a API Groq
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      throw new Error("GROQ_API_KEY não está definida");
    }
    
    console.log("Enviando requisição para a API Groq...");
    
    const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model, // Usar o modelo especificado (Mistral Saba 24B)
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API Groq: ${response.status}`, errorText);
      throw new Error(`Erro na API Groq: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Resposta da API Groq recebida com sucesso");
    
    // Extrair a resposta do assistente (que deve ser um JSON)
    const responseContent = data.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error("Resposta vazia da API Groq");
    }
    
    // Validar e processar a resposta JSON
    let mealPlan;
    try {
      // Tentar fazer o parse do JSON
      if (typeof responseContent === 'string') {
        mealPlan = JSON.parse(responseContent);
      } else {
        mealPlan = responseContent;
      }
      
      console.log("Plano alimentar gerado com sucesso");
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON:", parseError);
      console.error("Conteúdo recebido:", responseContent);
      throw new Error("A resposta da API não é um JSON válido");
    }
    
    // Retornar o plano alimentar
    return new Response(
      JSON.stringify({ mealPlan }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Erro ao gerar plano alimentar:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Erro ao gerar plano alimentar",
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
