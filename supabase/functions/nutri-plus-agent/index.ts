
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

    // Prepare system message with updated instructions for Nutri+ agent
    const systemMessage = `Você é Nutri+, um agente especialista em nutrição que cria planos alimentares personalizados em Português do Brasil.
Sua tarefa é analisar os dados do usuário e criar um plano alimentar semanal detalhado e cientificamente fundamentado.

REGRAS IMPORTANTES PARA GERAÇÃO DE JSON VÁLIDO:
1. Sua resposta DEVE ser um JSON válido que possa ser processado com JSON.parse().
2. Nunca use aspas simples (') para strings, use APENAS aspas duplas (").
3. Não use notação científica como 1e5 para números.
4. Garanta que o JSON não tenha vírgulas extras no final dos objetos e arrays.
5. Garanta que cada propriedade de objeto tenha um valor.
6. Todos os valores numéricos devem ser números (sem aspas).
7. Não inclua comentários no JSON.
8. Não deixe o JSON truncado ou incompleto.
9. Incluir recomendações completas, mas concisas.

ESTRUTURA DO JSON:
{
  "weeklyPlan": {
    "segunda": {
      "dayName": "Segunda-feira",
      "meals": {
        "cafeDaManha": {
          "description": "Descrição em português",
          "foods": [
            {
              "name": "Nome do alimento em português",
              "portion": 100,
              "unit": "g",
              "details": "Detalhes de preparo em português"
            }
          ],
          "calories": 500,
          "macros": {
            "protein": 30,
            "carbs": 40,
            "fats": 15,
            "fiber": 5
          }
        },
        "lancheDaManha": { /* mesma estrutura */ },
        "almoco": { /* mesma estrutura */ },
        "lancheDaTarde": { /* mesma estrutura */ },
        "jantar": { /* mesma estrutura */ }
      },
      "dailyTotals": {
        "calories": 2000,
        "protein": 120,
        "carbs": 180,
        "fats": 60,
        "fiber": 25
      }
    },
    "terca": { /* mesma estrutura */ },
    "quarta": { /* mesma estrutura */ },
    "quinta": { /* mesma estrutura */ },
    "sexta": { /* mesma estrutura */ },
    "sabado": { /* mesma estrutura */ },
    "domingo": { /* mesma estrutura */ }
  },
  "weeklyTotals": {
    "averageCalories": 2000,
    "averageProtein": 120,
    "averageCarbs": 180,
    "averageFats": 60,
    "averageFiber": 25
  },
  "recommendations": {
    "general": "Recomendação geral em português",
    "preworkout": "Recomendação pré-treino em português",
    "postworkout": "Recomendação pós-treino em português",
    "timing": [
      "Recomendação de tempo 1 em português",
      "Recomendação de tempo 2 em português"
    ]
  }
}

MUITO IMPORTANTE:
1. Use os nomes EXATOS das propriedades como especificado acima:
   - cafeDaManha (não "café da manhã" ou "breakfast")
   - lancheDaManha (não "lanche da manhã" ou "morningSnack")
   - almoco (não "almoço" ou "lunch")
   - lancheDaTarde (não "lanche da tarde" ou "afternoonSnack")
   - jantar (não "dinner")

2. Os dias da semana DEVEM ser exatamente:
   - "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"

3. Cada alimento na lista "foods" DEVE conter as seguintes propriedades:
   - "name": Nome do alimento em português
   - "portion": Valor numérico (sem aspas)
   - "unit": Unidade de medida em português (g, ml, etc.)
   - "details": Instruções de preparo em português

4. Todos os valores numéricos (calories, protein, carbs, fats, fiber) devem ser números inteiros SEM ASPAS e SEM SUFIXOS como "g" ou "kcal".`;

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
10. MUITO IMPORTANTE: Todos os valores de macronutrientes e calorias devem ser números inteiros sem unidades
11. MUITO IMPORTANTE: Os dias da semana devem ser: "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"`;

    // Track time for API call preparation
    console.log(`[NUTRI+] Preparando chamada de API às ${new Date().toISOString()}`);

    // Get model settings from request or use defaults
    const modelName = modelConfig?.model || "llama3-8b-8192";
    const temperature = modelConfig?.temperature || 0.2; // Reduced temperature for more predictable output
    
    console.log(`[NUTRI+] Usando modelo: ${modelName} com temperatura: ${temperature}`);

    // Prepare the API call to Groq with improved parameters
    const groqPayload = {
      model: modelName,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: temperature,
      max_tokens: 6000, // Reduced to leave room for processing
      top_p: 0.95,
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
      
      // Try with a simpler format if we get a JSON validation error
      if (response.status === 400 && errorText.includes("json_validate_failed")) {
        console.log("[NUTRI+] Tentando novamente com formato simplificado devido a erro de validação JSON");
        
        // Switch to alternative model if specified model failed
        const alternativeModel = modelName === "llama3-8b-8192" ? "llama3-70b-8192" : "llama3-8b-8192";
        
        return new Response(
          JSON.stringify({ 
            error: "Erro de validação JSON na resposta da API", 
            details: errorText.substring(0, 500),
            suggestedModel: alternativeModel
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Return the error to the client
      return new Response(
        JSON.stringify({ 
          error: `Erro da API: ${response.status}`, 
          details: errorText.substring(0, 500),
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
      
      // Validate the structure to make sure it matches our expected format
      if (!mealPlanJson.weeklyPlan) {
        console.error("[NUTRI+] Estrutura JSON inválida: weeklyPlan não encontrado");
        return new Response(
          JSON.stringify({ 
            error: "Estrutura JSON inválida", 
            details: "weeklyPlan não encontrado na resposta" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Map meal plan days to ensure they use the correct property names
      const fixedMealPlan = {
        weeklyPlan: {},
        weeklyTotals: mealPlanJson.weeklyTotals || {
          averageCalories: 0,
          averageProtein: 0,
          averageCarbs: 0,
          averageFats: 0,
          averageFiber: 0
        },
        recommendations: mealPlanJson.recommendations || {
          general: "Mantenha uma alimentação balanceada e variada.",
          preworkout: "Consuma carboidratos antes do treino para energia.",
          postworkout: "Consuma proteínas após o treino para recuperação muscular.",
          timing: ["Distribua as refeições a cada 3-4 horas."]
        }
      };
      
      // Transfer and fix the meal plan structure if needed
      Object.entries(mealPlanJson.weeklyPlan).forEach(([day, dayPlan]) => {
        // Ensure the day plan has the correct structure
        if (dayPlan && dayPlan.meals) {
          fixedMealPlan.weeklyPlan[day] = dayPlan;
        }
      });
      
      // Add metadata to the response
      fixedMealPlan.modelUsed = modelName;
      fixedMealPlan.generatedAt = new Date().toISOString();
      
      // Log success
      console.log(`[NUTRI+] Plano alimentar gerado com sucesso às ${new Date().toISOString()}`);
      console.log(`[NUTRI+] Duração do processo: ${(new Date().getTime() - new Date(startTime).getTime()) / 1000}s`);
      
      // Return the successful response
      return new Response(
        JSON.stringify(fixedMealPlan),
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
