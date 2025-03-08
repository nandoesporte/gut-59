
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
10. REDUZA O TAMANHO DA RESPOSTA - seja conciso nas descrições, nosso modelo tem limites de tokens.

ESTRUTURA DO JSON:
{
  "weeklyPlan": {
    "segunda": {
      "dayName": "Segunda-feira",
      "meals": {
        "cafeDaManha": {
          "description": "Descrição breve",
          "foods": [
            {
              "name": "Nome do alimento",
              "portion": 100,
              "unit": "g",
              "details": "Detalhes breves"
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
    "general": "Recomendação geral concisa",
    "preworkout": "Recomendação pré-treino concisa",
    "postworkout": "Recomendação pós-treino concisa",
    "timing": [
      "Recomendação 1",
      "Recomendação 2"
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
   - "details": Instruções breves de preparo

4. Todos os valores numéricos (calories, protein, carbs, fats, fiber) devem ser números inteiros SEM ASPAS e SEM SUFIXOS como "g" ou "kcal".

5. SEJA BREVE E CONCISO EM TODAS AS DESCRIÇÕES PARA REDUZIR O TAMANHO DA RESPOSTA.`;

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
${selectedFoods.slice(0, 15).map(food => `- ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`).join('\n')}
${selectedFoods.length > 15 ? `\n... e mais ${selectedFoods.length - 15} alimentos.` : ''}

${foodsByMealType ? `ALIMENTOS CATEGORIZADOS POR REFEIÇÃO:
${Object.entries(foodsByMealType).map(([mealType, foods]) => 
  `- ${mealType}: ${Array.isArray(foods) ? foods.length : 0} alimentos`
).join('\n')}` : ''}

Por favor, crie um plano de 7 dias que:
1. Atenda à meta de ${userData.dailyCalories} calorias diárias (com margem de +/- 100 kcal)
2. Distribua adequadamente os macronutrientes
3. Use os alimentos disponíveis fornecidos
4. Respeite as preferências e restrições alimentares
5. Forneça variedade ao longo da semana
6. Seja BREVE E CONCISO nas descrições para evitar que a resposta fique muito grande
7. Calcule as calorias e macros para cada refeição e dia
8. MUITO IMPORTANTE: Use os nomes corretos em português para refeições e dias da semana
9. MUITO IMPORTANTE: Todos os valores numéricos devem ser números inteiros sem unidades`;

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
      max_tokens: 4096, // Reduced to leave room for processing
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
        console.log("[NUTRI+] Tentando novamente com modelo alternativo devido a erro de validação JSON");
        
        // Try with the backup model
        try {
          // Attempt with llama3-70b if we were using 8b, or vice versa
          const backupModel = modelName === "llama3-8b-8192" ? "llama3-70b-8192" : "llama3-8b-8192";
          console.log(`[NUTRI+] Tentando com modelo alternativo: ${backupModel}`);
          
          const backupPayload = {
            ...groqPayload,
            model: backupModel,
            max_tokens: 2048, // Reduce tokens even further
          };
          
          // Simplify the system message for backup attempt
          backupPayload.messages[0].content = backupPayload.messages[0].content
            .replace(/REGRAS IMPORTANTES.*?ESTRUTURA DO JSON:/s, "ESTRUTURA DO JSON:")
            .replace(/\n[0-9]+\..+/g, "") // Remove numbered rules
            .replace(/MUITO IMPORTANTE:.*$/s, ""); // Remove the final section
          
          // Make the backup API call
          const backupResponse = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify(backupPayload)
          });
          
          if (!backupResponse.ok) {
            throw new Error(`Backup call failed with status ${backupResponse.status}`);
          }
          
          // Get response from backup model
          const backupApiResponse = await backupResponse.json();
          
          if (!backupApiResponse.choices || !backupApiResponse.choices[0]) {
            throw new Error("Invalid response format from backup model");
          }
          
          // Parse backup model content
          const backupContent = backupApiResponse.choices[0].message.content;
          const backupMealPlan = JSON.parse(backupContent);
          
          console.log(`[NUTRI+] Sucesso com modelo de backup ${backupModel}`);
          
          // Return the meal plan from backup model
          return new Response(
            JSON.stringify({ 
              ...backupMealPlan,
              modelUsed: backupModel,
              note: "Generated using backup model due to JSON validation issues with primary model"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
          
        } catch (backupError) {
          console.error("[NUTRI+] Tentativa com modelo alternativo também falhou:", backupError);
          
          // Attempt with a hardcoded fallback structure
          return new Response(
            JSON.stringify({ 
              error: "Erro de validação JSON. Tentamos com modelos alternativos sem sucesso.",
              details: errorText.substring(0, 500),
              suggestedModel: modelName === "llama3-8b-8192" ? "llama3-70b-8192" : "llama3-8b-8192"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
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
      
      // Try again with a simplified fallback approach
      try {
        console.log("[NUTRI+] Tentando recuperar a resposta com abordagem alternativa...");
        
        // Create a baseline meal plan structure
        const fallbackMealPlan = {
          weeklyPlan: {
            segunda: { 
              dayName: "Segunda-feira",
              meals: {
                cafeDaManha: {
                  description: "Café da manhã simples",
                  foods: [{ name: "Opções variadas", portion: 1, unit: "porção", details: "Alimentos disponíveis" }],
                  calories: Math.round(userData.dailyCalories * 0.25),
                  macros: { protein: 20, carbs: 30, fats: 10, fiber: 5 }
                },
                lancheDaManha: {
                  description: "Lanche da manhã simples",
                  foods: [{ name: "Opções variadas", portion: 1, unit: "porção", details: "Alimentos disponíveis" }],
                  calories: Math.round(userData.dailyCalories * 0.15),
                  macros: { protein: 10, carbs: 15, fats: 5, fiber: 3 }
                },
                almoco: {
                  description: "Almoço balanceado",
                  foods: [{ name: "Opções variadas", portion: 1, unit: "porção", details: "Alimentos disponíveis" }],
                  calories: Math.round(userData.dailyCalories * 0.3),
                  macros: { protein: 30, carbs: 40, fats: 15, fiber: 8 }
                },
                lancheDaTarde: {
                  description: "Lanche da tarde simples",
                  foods: [{ name: "Opções variadas", portion: 1, unit: "porção", details: "Alimentos disponíveis" }],
                  calories: Math.round(userData.dailyCalories * 0.15),
                  macros: { protein: 10, carbs: 15, fats: 5, fiber: 3 }
                },
                jantar: {
                  description: "Jantar balanceado",
                  foods: [{ name: "Opções variadas", portion: 1, unit: "porção", details: "Alimentos disponíveis" }],
                  calories: Math.round(userData.dailyCalories * 0.15),
                  macros: { protein: 20, carbs: 25, fats: 10, fiber: 5 }
                }
              },
              dailyTotals: {
                calories: userData.dailyCalories,
                protein: Math.round(userData.dailyCalories * 0.3 / 4), // 30% das calorias como proteína
                carbs: Math.round(userData.dailyCalories * 0.4 / 4),   // 40% das calorias como carbs
                fats: Math.round(userData.dailyCalories * 0.3 / 9),    // 30% das calorias como gorduras
                fiber: 25
              }
            }
          },
          weeklyTotals: {
            averageCalories: userData.dailyCalories,
            averageProtein: Math.round(userData.dailyCalories * 0.3 / 4),
            averageCarbs: Math.round(userData.dailyCalories * 0.4 / 4),
            averageFats: Math.round(userData.dailyCalories * 0.3 / 9),
            averageFiber: 25
          },
          recommendations: {
            general: "Mantenha uma alimentação balanceada e variada. Devido a limitações técnicas, gerou-se um plano simples. Considere tentar novamente mais tarde.",
            preworkout: "Consuma carboidratos antes do treino para energia.",
            postworkout: "Consuma proteínas após o treino para recuperação muscular.",
            timing: ["Distribua as refeições a cada 3-4 horas."]
          },
          modelUsed: modelName,
          generatedAt: new Date().toISOString(),
          fallbackMode: true
        };
        
        // Copy the day plan to other days
        const days = ["terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
        const dayNames = ["Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
        
        days.forEach((day, index) => {
          fallbackMealPlan.weeklyPlan[day] = {
            ...JSON.parse(JSON.stringify(fallbackMealPlan.weeklyPlan.segunda)),
            dayName: dayNames[index]
          };
        });
        
        console.log("[NUTRI+] Plano de contingência gerado com sucesso");
        
        return new Response(
          JSON.stringify(fallbackMealPlan),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        
      } catch (fallbackError) {
        console.error("[NUTRI+] Erro na abordagem de contingência:", fallbackError);
        
        return new Response(
          JSON.stringify({ 
            error: "Falha ao gerar plano alimentar",
            details: jsonError.message,
            rawPreview: mealPlanContent.substring(0, 500) + "...",
            fallbackError: fallbackError.message
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
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
