
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
    
    // Enhanced logging with proper user identification
    const userId = userData.id || 'não autenticado';
    console.log(`[NUTRI+] Dados recebidos para usuário: ${userId}`);
    
    // Log important user data with null checks
    if (userData.age && userData.gender && userData.weight && userData.height) {
      console.log(`[NUTRI+] Perfil do usuário: ${userData.age} anos, ${userData.gender}, ${userData.weight}kg, ${userData.height}cm`);
    } else {
      console.log(`[NUTRI+] Perfil do usuário incompleto: ${JSON.stringify(userData)}`);
    }
    
    if (userData.goal && userData.dailyCalories) {
      console.log(`[NUTRI+] Objetivo: ${userData.goal}, Calorias diárias: ${userData.dailyCalories}kcal`);
    } else {
      console.log(`[NUTRI+] Objetivo ou calorias não especificados`);
    }
    
    console.log(`[NUTRI+] Alimentos selecionados: ${selectedFoods?.length || 0}`);
    
    // Safer logging of dietary preferences
    if (dietaryPreferences) {
      const allergiesLog = dietaryPreferences.hasAllergies && dietaryPreferences.allergies?.length > 0 
        ? `Alergias: ${dietaryPreferences.allergies.join(', ')}` 
        : 'Sem alergias';
      
      const restrictionsLog = dietaryPreferences.dietaryRestrictions?.length > 0 
        ? `Restrições: ${dietaryPreferences.dietaryRestrictions.join(', ')}` 
        : 'Sem restrições';
      
      console.log(`[NUTRI+] Preferências e restrições: ${allergiesLog}, ${restrictionsLog}`);
    } else {
      console.log('[NUTRI+] Nenhuma preferência alimentar especificada');
    }
    
    if (!selectedFoods || selectedFoods.length === 0) {
      console.error("[NUTRI+] Erro: Nenhum alimento selecionado");
      return new Response(
        JSON.stringify({ error: "Nenhum alimento selecionado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check for foodsByMealType structure
    if (!foodsByMealType || typeof foodsByMealType !== 'object') {
      console.warn("[NUTRI+] Aviso: foodsByMealType não está no formato esperado ou está ausente");
    } else {
      console.log(`[NUTRI+] Distribuição de alimentos por refeição: ${Object.keys(foodsByMealType).join(', ')}`);
    }

    // Check if GROQ API key is available
    if (!GROQ_API_KEY) {
      console.error("[NUTRI+] Erro: GROQ_API_KEY não encontrada nas variáveis de ambiente");
      return new Response(
        JSON.stringify({ error: "Erro de configuração da API" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Prepare system message for Nutri+ agent with Portuguese instructions
    const systemMessage = `Você é Nutri+, um agente especialista em nutrição que cria planos alimentares personalizados em Português do Brasil.
Sua tarefa é analisar os dados do usuário e criar um plano alimentar semanal detalhado e cientificamente fundamentado.

REGRAS IMPORTANTES DE FORMATO DE SAÍDA:
1. Sua resposta DEVE ser um JSON válido que possa ser processado com JSON.parse().
2. Sua resposta deve conter APENAS o objeto JSON sem explicações, narrativas ou texto adicional.
3. A saída deve seguir exatamente esta estrutura:
{
  "weeklyPlan": {
    "monday": { /* estrutura do plano diário */ },
    "tuesday": { /* estrutura do plano diário */ },
    /* ... outros dias ... */
  },
  "weeklyTotals": { /* médias nutricionais semanais */ },
  "recommendations": { /* recomendações personalizadas */ }
}

MUITO IMPORTANTE: Você DEVE usar Português do Brasil para TODOS os nomes, incluindo:
- Dias da semana: "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"
- Refeições: "cafeDaManha", "lancheDaManha", "almoco", "lancheDaTarde", "jantar"
- Todos os nomes de alimentos, descrições e recomendações

Certifique-se de que o weeklyPlan contenha TODOS os 7 dias (segunda a domingo). Cada dia deve ter a seguinte estrutura:
{
  "dayName": "Nome do Dia em Português",
  "meals": {
    "cafeDaManha": {
      "description": "Descrição do café da manhã em Português",
      "foods": [{"name": "Nome do alimento em Português", "portion": 100, "unit": "g", "details": "Detalhes sobre o preparo e consumo do alimento em Português"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    "lancheDaManha": {
      "description": "Descrição do lanche da manhã em Português",
      "foods": [{"name": "Nome do alimento em Português", "portion": 100, "unit": "g", "details": "Detalhes sobre o preparo e consumo do alimento em Português"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    "almoco": {
      "description": "Descrição do almoço em Português",
      "foods": [{"name": "Nome do alimento em Português", "portion": 100, "unit": "g", "details": "Detalhes sobre o preparo e consumo do alimento em Português"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    "lancheDaTarde": {
      "description": "Descrição do lanche da tarde em Português",
      "foods": [{"name": "Nome do alimento em Português", "portion": 100, "unit": "g", "details": "Detalhes sobre o preparo e consumo do alimento em Português"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    "jantar": {
      "description": "Descrição do jantar em Português",
      "foods": [{"name": "Nome do alimento em Português", "portion": 100, "unit": "g", "details": "Detalhes sobre o preparo e consumo do alimento em Português"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    }
  },
  "dailyTotals": {"calories": 2000, "protein": 120, "carbs": 180, "fats": 60, "fiber": 25}
}

IMPORTANTE: Use exatamente os nomes de propriedades especificados acima:
- Use "cafeDaManha" para café da manhã (não "breakfast")
- Use "lancheDaManha" para lanche da manhã (não "morningSnack" ou "morning_snack")
- Use "almoco" para almoço (não "lunch")
- Use "lancheDaTarde" para lanche da tarde (não "afternoonSnack" ou "afternoon_snack")
- Use "jantar" para jantar (não "dinner")

É FUNDAMENTAL que cada alimento na lista "foods" contenha instruções detalhadas de preparo no campo "details", explicando como o alimento deve ser preparado, cozido ou consumido. Tudo em Português do Brasil.

IMPORTANTE: Respeite rigorosamente a categorização dos alimentos por tipo de refeição:
- Alimentos categorizados como 'cafeDaManha' devem ser colocados APENAS na refeição do café da manhã
- Alimentos categorizados como 'lancheDaManha' devem ser colocados APENAS no lanche da manhã
- Alimentos categorizados como 'almoco' devem ser colocados APENAS no almoço
- Alimentos categorizados como 'lancheDaTarde' devem ser colocados APENAS no lanche da tarde
- Alimentos categorizados como 'jantar' devem ser colocados APENAS no jantar

As recomendações devem incluir:
{
  "general": "Conselho geral de nutrição em Português",
  "preworkout": "Conselho de nutrição pré-treino em Português",
  "postworkout": "Conselho de nutrição pós-treino em Português",
  "timing": ["Conselho específico de tempo de refeição em Português", "Outro conselho de timing em Português"]
}

IMPORTANTE:
1. Todos os valores de macronutrientes e calorias DEVEM ser números inteiros, não strings. 
2. NUNCA adicione 'g' ou qualquer unidade como sufixo aos valores numéricos.
3. Exemplo correto: "protein": 30, "carbs": 40 (não "protein": "30g", "carbs": "40g")
4. Isso é crucial para que o JSON seja validado corretamente.

IMPORTANTE: Devido a limitações técnicas, sua resposta NÃO pode exceder 8000 tokens. Se necessário, simplifique as descrições de preparo dos alimentos, mas NUNCA omita informações essenciais como calorias, macronutrientes ou items requeridos.`;

    // Construct user message with all relevant data
    const userMessage = `Crie um plano alimentar semanal personalizado em Português do Brasil com base nestes dados:

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
9. MUITO IMPORTANTE: Use a nomenclatura correta para as refeições em português: "cafeDaManha", "lancheDaManha", "almoco", "lancheDaTarde", "jantar"
10. MUITO IMPORTANTE: Todos os valores de macronutrientes e calorias devem ser números inteiros, NÃO inclua 'g' como sufixo nos valores
11. NÃO utilize nomes em inglês (como "breakfast", "lunch", "dinner", "morning", "snack", etc)
12. Use os seguintes nomes para os dias da semana: "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"`;

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
      max_tokens: 7000, 
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
      const errorText = await response.text();
      console.error(`[NUTRI+] Erro da API Groq (${response.status}):`, errorText);
      
      // Return the error to the client
      return new Response(
        JSON.stringify({ 
          error: `Erro da API: ${response.status}`, 
          details: errorText,
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
    
    // Log size and a preview of the content
    console.log(`[NUTRI+] Tamanho da resposta: ${mealPlanContent.length} caracteres`);
    console.log(`[NUTRI+] Prévia da resposta: ${mealPlanContent.substring(0, 300)}...`);
    
    // Ensure the response is valid JSON
    try {
      // Parse and validate the JSON response
      const mealPlanJson = JSON.parse(mealPlanContent);
      
      // For backwards compatibility, we add a mealPlan wrapper if needed
      const finalResponse = mealPlanJson.mealPlan ? mealPlanJson : { mealPlan: mealPlanJson };
      
      // Add metadata to the response
      finalResponse.modelUsed = modelName;
      
      // Log success
      console.log(`[NUTRI+] Plano alimentar gerado com sucesso às ${new Date().toISOString()}`);
      console.log(`[NUTRI+] Duração do processo: ${(new Date().getTime() - new Date(startTime).getTime()) / 1000}s`);
      
      // Return the successful response
      return new Response(
        JSON.stringify(finalResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (jsonError) {
      // If the response is not valid JSON, log the error and return error response
      console.error("[NUTRI+] Erro ao analisar JSON:", jsonError.message);
      console.error("[NUTRI+] Resposta JSON inválida:", mealPlanContent.substring(0, 500));
      
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
