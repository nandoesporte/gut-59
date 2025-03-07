
// nutri-plus-agent: Uses Groq API to analyze user data and generate personalized meal plans
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log start of process with timestamp
    const startTime = new Date().toISOString();
    console.log(`[NUTRI+] Processamento iniciado às ${startTime}`);

    // Parse the request body
    const requestData = await req.json();
    
    // Validate request data
    if (!requestData || !requestData.userData) {
      console.error("[NUTRI+] Erro: Dados de requisição inválidos - userData ausente");
      return new Response(
        JSON.stringify({ error: "Dados de requisição inválidos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { userData, selectedFoods, foodsByMealType, dietaryPreferences, modelConfig } = requestData;
    console.log(`[NUTRI+] Dados recebidos para usuário: ${userData.id || 'anônimo'}`);
    console.log(`[NUTRI+] Perfil do usuário: ${userData.age} anos, ${userData.gender}, ${userData.weight}kg, ${userData.height}cm`);
    console.log(`[NUTRI+] Objetivo: ${userData.goal}, Calorias diárias: ${userData.dailyCalories}kcal`);
    console.log(`[NUTRI+] Alimentos selecionados: ${selectedFoods?.length || 0}`);
    console.log(`[NUTRI+] Preferências e restrições: ${JSON.stringify(dietaryPreferences)}`);
    
    if (!selectedFoods || selectedFoods.length === 0) {
      console.error("[NUTRI+] Erro: Nenhum alimento selecionado");
      return new Response(
        JSON.stringify({ error: "Nenhum alimento selecionado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if GROQ API key is available
    if (!GROQ_API_KEY) {
      console.error("[NUTRI+] Erro: GROQ_API_KEY não encontrada nas variáveis de ambiente");
      return new Response(
        JSON.stringify({ error: "Erro de configuração da API" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Prepare system message for Nutri+ agent
    const systemMessage = `Você é Nutri+, um agente especialista em nutrição que cria planos alimentares personalizados. 
Sua tarefa é analisar os dados do usuário e criar um plano alimentar semanal detalhado e cientificamente fundamentado.

REGRAS IMPORTANTES DE FORMATO DE SAÍDA:
1. Sua resposta DEVE ser um JSON válido que possa ser processado com JSON.parse().
2. Sua resposta deve conter APENAS o objeto JSON sem explicações, narrativas ou texto adicional.
3. A saída deve seguir exatamente esta estrutura:
{
  "mealPlan": {
    "weeklyPlan": {
      "monday": { /* estrutura do plano diário */ },
      "tuesday": { /* estrutura do plano diário */ },
      /* ... outros dias ... */
    },
    "weeklyTotals": { /* médias nutricionais semanais */ },
    "recommendations": { /* recomendações personalizadas */ }
  }
}

Certifique-se de que o weeklyPlan contenha TODOS os 7 dias (segunda a domingo). Cada dia deve ter a seguinte estrutura:
{
  "dayName": "Nome do Dia",
  "meals": {
    "breakfast": {
      "description": "Descrição do café da manhã",
      "foods": [{"name": "Nome do alimento", "portion": 100, "unit": "g", "details": "Detalhes sobre o preparo e consumo do alimento"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    /* outras refeições: morningSnack, lunch, afternoonSnack, dinner */
  },
  "dailyTotals": {"calories": 2000, "protein": 120, "carbs": 180, "fats": 60, "fiber": 25}
}

É FUNDAMENTAL que cada alimento na lista "foods" contenha instruções detalhadas de preparo no campo "details", explicando como o alimento deve ser preparado, cozido ou consumido.

IMPORTANTE: Respeite rigorosamente a categorização dos alimentos por tipo de refeição:
- Alimentos categorizados como 'breakfast' devem ser colocados APENAS na refeição do café da manhã
- Alimentos categorizados como 'morning_snack' devem ser colocados APENAS no lanche da manhã
- Alimentos categorizados como 'lunch' devem ser colocados APENAS no almoço
- Alimentos categorizados como 'afternoon_snack' devem ser colocados APENAS no lanche da tarde
- Alimentos categorizados como 'dinner' devem ser colocados APENAS no jantar

As recomendações devem incluir:
{
  "general": "Conselho geral de nutrição",
  "preworkout": "Conselho de nutrição pré-treino",
  "postworkout": "Conselho de nutrição pós-treino",
  "timing": ["Conselho específico de tempo de refeição", "Outro conselho de timing"]
}

IMPORTANTE: Devido a limitações técnicas, sua resposta NÃO pode exceder 8000 tokens. Se necessário, simplifique as descrições de preparo dos alimentos, mas NUNCA omita informações essenciais como calorias, macronutrientes ou items requeridos.`;

    // Construct user message with all relevant data
    const userMessage = `Crie um plano alimentar semanal personalizado com base nestes dados:

PERFIL DO USUÁRIO:
- Idade: ${userData.age}
- Gênero: ${userData.gender}
- Peso: ${userData.weight}kg
- Altura: ${userData.height}cm
- Nível de Atividade: ${userData.activityLevel}
- Objetivo: ${userData.goal}
- Meta de Calorias Diárias: ${userData.dailyCalories}kcal

PREFERÊNCIAS ALIMENTARES:
${dietaryPreferences.hasAllergies ? `- Alergias: ${dietaryPreferences.allergies.join(', ')}` : '- Sem alergias conhecidas'}
${dietaryPreferences.dietaryRestrictions && dietaryPreferences.dietaryRestrictions.length > 0 ? `- Restrições Alimentares: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : '- Sem restrições alimentares'}
${dietaryPreferences.trainingTime ? `- Horário de Treino: ${dietaryPreferences.trainingTime}` : '- Sem horário específico de treino'}

ALIMENTOS DISPONÍVEIS (${selectedFoods.length} no total):
${selectedFoods.slice(0, 30).map(food => `- ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`).join('\n')}
${selectedFoods.length > 30 ? `\n... e mais ${selectedFoods.length - 30} alimentos.` : ''}

${foodsByMealType ? `ALIMENTOS CATEGORIZADOS POR REFEIÇÃO:
${Object.entries(foodsByMealType).map(([mealType, foods]) => 
  `- ${mealType}: ${Array.isArray(foods) ? foods.length : 0} alimentos`
).join('\n')}` : ''}

Por favor, crie um plano de 7 dias que:
1. Atenda à meta de ${userData.dailyCalories} calorias diárias (com margem de +/- 100 kcal)
2. Distribua adequadamente os macronutrientes (proteínas, carboidratos, gorduras, fibras)
3. Use os alimentos disponíveis fornecidos
4. Respeite as preferências e restrições alimentares do usuário
5. Forneça variedade ao longo da semana
6. Inclua todos os tipos de refeições: café da manhã, lanche da manhã, almoço, lanche da tarde, jantar
7. Calcule as calorias e macros para cada refeição e dia
8. Forneça detalhes de preparo para cada alimento
9. MUITO IMPORTANTE: Respeite a categorização dos alimentos - não coloque alimentos de uma categoria (ex: breakfast) em outra refeição (ex: dinner)`;

    // Track time for API call preparation
    console.log(`[NUTRI+] Preparando chamada de API às ${new Date().toISOString()}`);

    // Get model settings from request or use defaults
    const modelName = modelConfig?.model || "llama3-8b-8192";
    const temperature = modelConfig?.temperature || 0.3;
    
    console.log(`[NUTRI+] Usando modelo: ${modelName} com temperatura: ${temperature}`);

    // Prepare the API call to Groq
    const groqPayload = {
      model: modelName,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: temperature, // Lower temperature for more consistent output
      max_tokens: 7000, // Aumentado de 4000 para 7000
      top_p: 0.9,
      response_format: { type: "json_object" } // Request JSON format response
    };

    console.log(`[NUTRI+] Chamando API Groq com modelo: ${groqPayload.model}`);

    // Call the Groq API
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(groqPayload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[NUTRI+] Erro da API Groq (${response.status}):`, errorData);
      
      // If we received a JSON generation error, we'll try to use the failed_generation content
      if (response.status === 400 && errorData.includes('json_validate_failed')) {
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.error && errorJson.error.failed_generation) {
            console.log("[NUTRI+] Tentando recuperar dados do JSON inválido...");
            
            // Try to extract and fix the incomplete JSON
            let failedJson = errorJson.error.failed_generation;
            
            // Attempt to complete the truncated JSON if necessary
            if (!failedJson.endsWith('}')) {
              failedJson = failedJson + '"}}}';
            }
            
            try {
              // Try to parse the fixed JSON
              const fixedMealPlan = JSON.parse(failedJson);
              console.log("[NUTRI+] JSON recuperado com sucesso!");
              
              return new Response(
                JSON.stringify({
                  mealPlan: fixedMealPlan.mealPlan,
                  modelUsed: modelName,
                  recovered: true
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            } catch (parseError) {
              console.error("[NUTRI+] Não foi possível recuperar o JSON:", parseError);
            }
          }
        } catch (errorParseError) {
          console.error("[NUTRI+] Erro ao analisar o erro da API:", errorParseError);
        }
      }
      
      // Return the error to the client if recovery failed
      return new Response(
        JSON.stringify({ 
          error: `Erro da API: ${response.status}`, 
          details: errorData,
          // Try alternative model next time
          suggestedModel: modelName === "llama3-8b-8192" ? "llama3-70b-8192" : "llama3-8b-8192"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Get the API response
    const apiResponse = await response.json();
    console.log(`[NUTRI+] Resposta recebida da API Groq às ${new Date().toISOString()}`);
    
    // Check for valid response content
    if (!apiResponse.choices || !apiResponse.choices[0] || !apiResponse.choices[0].message) {
      console.error("[NUTRI+] Formato de resposta da API inválido:", JSON.stringify(apiResponse).substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Formato de resposta da API inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Get the model's response content
    const mealPlanContent = apiResponse.choices[0].message.content;
    
    // Ensure the response is valid JSON
    try {
      // Parse and validate the JSON response
      const mealPlanJson = JSON.parse(mealPlanContent);
      
      // Validate the structure
      if (!mealPlanJson.mealPlan || !mealPlanJson.mealPlan.weeklyPlan) {
        console.error("[NUTRI+] Resposta da API sem estrutura requerida. Resposta:", mealPlanContent.substring(0, 500));
        return new Response(
          JSON.stringify({ error: "Estrutura do plano alimentar inválida" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Complete meal plan with the latest data
      const mealPlan = {
        ...mealPlanJson.mealPlan,
        userCalories: userData.dailyCalories,
        generatedBy: "nutri-plus-agent-llama3"
      };
      
      // Ensure all days have complete meal data and details for each food
      Object.keys(mealPlan.weeklyPlan).forEach(day => {
        const dayPlan = mealPlan.weeklyPlan[day];
        if (dayPlan && dayPlan.meals) {
          Object.keys(dayPlan.meals).forEach(mealType => {
            const meal = dayPlan.meals[mealType];
            if (meal && meal.foods) {
              meal.foods.forEach(food => {
                // Ensure each food has details for preparation
                if (!food.details || food.details === "") {
                  food.details = "Preparar conforme preferência pessoal. Consumir fresco quando possível.";
                }
              });
            }
          });
        }
      });
      
      // Verify the weekly totals match the user's calorie goal
      if (!mealPlan.weeklyTotals || 
          isNaN(mealPlan.weeklyTotals.averageCalories) || 
          isNaN(mealPlan.weeklyTotals.averageProtein) ||
          isNaN(mealPlan.weeklyTotals.averageCarbs) ||
          isNaN(mealPlan.weeklyTotals.averageFats) ||
          isNaN(mealPlan.weeklyTotals.averageFiber)) {
        
        console.log("[NUTRI+] Recalculando médias semanais devido a valores inválidos");
        
        const days = Object.values(mealPlan.weeklyPlan);
        const validDays = days.filter(day => day && day.dailyTotals);
        const dayCount = validDays.length || 1; // Avoid division by zero
        
        mealPlan.weeklyTotals = {
          averageCalories: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.calories || 0), 0) / dayCount),
          averageProtein: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.protein || 0), 0) / dayCount),
          averageCarbs: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.carbs || 0), 0) / dayCount),
          averageFats: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.fats || 0), 0) / dayCount),
          averageFiber: Math.round(validDays.reduce((sum, day) => sum + (day.dailyTotals?.fiber || 0), 0) / dayCount)
        };
      }

      console.log(`[NUTRI+] Plano alimentar gerado com sucesso às ${new Date().toISOString()}`);
      console.log(`[NUTRI+] Duração do processo: ${(new Date().getTime() - new Date(startTime).getTime()) / 1000}s`);
      
      // Return the successful response with model info
      return new Response(
        JSON.stringify({ 
          mealPlan,
          modelUsed: modelName
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (jsonError) {
      // If the response is not valid JSON, log the error and return error response
      console.error("[NUTRI+] Erro ao analisar JSON:", jsonError);
      console.error("[NUTRI+] Resposta JSON inválida:", mealPlanContent.substring(0, 1000));
      
      return new Response(
        JSON.stringify({ 
          error: "Falha ao analisar JSON do plano alimentar",
          details: jsonError.message,
          rawContent: mealPlanContent.substring(0, 500) + "..." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
  } catch (error) {
    // Handle any unexpected errors
    console.error("[NUTRI+] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
