
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

    // Updated system message with simpler instructions for better JSON formatting
    const systemMessage = `Você é Nutri+, um agente especialista em nutrição que cria planos alimentares personalizados em Português do Brasil.
Sua tarefa é analisar os dados do usuário e criar um plano alimentar semanal detalhado.

REGRAS PARA GERAÇÃO DE JSON VÁLIDO:
1. Responda APENAS com JSON válido - sem texto adicional.
2. Use apenas aspas duplas (").
3. Números devem ser números inteiros (sem casas decimais, sem aspas).
4. Evite comentários no JSON.
5. Seja breve e conciso nas descrições.
6. Evite estruturas muito aninhadas.
7. REDUZA O TAMANHO DA RESPOSTA ao máximo.

ESTRUTURA DO JSON:
{
  "weeklyPlan": {
    "segunda": {
      "dayName": "Segunda-feira",
      "meals": {
        "cafeDaManha": {
          "description": "Breve descrição",
          "foods": [
            {"name": "Alimento", "portion": 100, "unit": "g", "details": "Breve preparo"}
          ],
          "calories": 500,
          "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
        },
        "lancheDaManha": {},
        "almoco": {},
        "lancheDaTarde": {},
        "jantar": {}
      },
      "dailyTotals": {"calories": 2000, "protein": 120, "carbs": 180, "fats": 60, "fiber": 25}
    },
    "terca": {},
    "quarta": {},
    "quinta": {},
    "sexta": {},
    "sabado": {},
    "domingo": {}
  },
  "weeklyTotals": {
    "averageCalories": 2000,
    "averageProtein": 120,
    "averageCarbs": 180,
    "averageFats": 60,
    "averageFiber": 25
  },
  "recommendations": {
    "general": "Recomendação geral",
    "preworkout": "Recomendação pré-treino",
    "postworkout": "Recomendação pós-treino",
    "timing": ["Recomendação 1", "Recomendação 2"]
  }
}`;

    // Construct user message with all relevant data but more concise
    const userMessage = `Crie um plano alimentar semanal personalizado com base nestes dados:

PERFIL: ${userData.age} anos, ${userData.gender}, ${userData.weight}kg, ${userData.height}cm, Nível: ${userData.activityLevel}
OBJETIVO: ${userData.goal}, META: ${userData.dailyCalories}kcal diárias

${dietaryPreferences.hasAllergies ? `ALERGIAS: ${dietaryPreferences.allergies.join(', ')}` : 'SEM ALERGIAS'}
${dietaryPreferences.dietaryRestrictions?.length > 0 ? `RESTRIÇÕES: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : 'SEM RESTRIÇÕES'}
${dietaryPreferences.trainingTime ? `TREINO: ${dietaryPreferences.trainingTime}` : ''}

ALIMENTOS DISPONÍVEIS (${selectedFoods.length}):
${selectedFoods.slice(0, 10).map(food => `${food.name} (${food.calories}kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`).join('; ')}
${selectedFoods.length > 10 ? `... e mais ${selectedFoods.length - 10} alimentos.` : ''}

Crie um plano de 7 dias que:
1. Atenda à meta de ${userData.dailyCalories} calorias/dia (±100 kcal)
2. Distribua adequadamente os macronutrientes
3. Use os alimentos disponíveis fornecidos
4. Seja MUITO BREVE E CONCISO nas descrições
5. Reduza ao máximo o tamanho do JSON gerado`;

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
      max_tokens: 3072, // Reduced to leave room for processing
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
        console.log("[NUTRI+] Tentando novamente com abordagem simplificada devido a erro de validação JSON");
        
        // Try with a different approach - using a template-based generation
        try {
          // Create a minimal system prompt
          const minimalSystemPrompt = `Você é um assistente de nutrição. Gere APENAS um JSON válido com um plano alimentar básico. Seja extremamente conciso.`;
          
          // Create a minimal user prompt
          const minimalUserPrompt = `Crie um plano alimentar semanal para ${userData.gender}, ${userData.age} anos, ${userData.weight}kg, com meta de ${userData.dailyCalories} calorias. Use alimentos simples. Forneça apenas 3 dias de plano para reduzir o tamanho da resposta. RESPONDA APENAS COM JSON VÁLIDO.`;
          
          // Attempt with the simplified prompt
          const backupPayload = {
            model: "llama3-70b-8192", // Try with more capable model
            messages: [
              { role: "system", content: minimalSystemPrompt },
              { role: "user", content: minimalUserPrompt }
            ],
            temperature: 0.1, // Very low temperature for more predictable output
            max_tokens: 2048,
            response_format: { type: "json_object" }
          };
          
          console.log(`[NUTRI+] Tentando com prompt simplificado e modelo llama3-70b-8192`);
          
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
          
          // Get response from backup
          const backupApiResponse = await backupResponse.json();
          console.log(`[NUTRI+] Resposta do modelo de backup recebida`);
          
          if (!backupApiResponse.choices || !backupApiResponse.choices[0]) {
            throw new Error("Invalid response format from backup model");
          }
          
          // Parse backup model content
          const backupContent = backupApiResponse.choices[0].message.content;
          let backupMealPlan = null;
          
          try {
            backupMealPlan = JSON.parse(backupContent);
            console.log(`[NUTRI+] JSON do modelo de backup analisado com sucesso`);
          } catch (jsonError) {
            console.error("[NUTRI+] Erro ao analisar JSON do modelo de backup:", jsonError.message);
            throw new Error("Failed to parse JSON from backup model");
          }
          
          return new Response(
            JSON.stringify({ 
              mealPlan: backupMealPlan,
              modelUsed: "llama3-70b-8192",
              note: "Plano gerado com modelo de backup devido a problemas de validação JSON"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
          
        } catch (backupError) {
          console.error("[NUTRI+] Tentativa com abordagem simplificada também falhou:", backupError);
          
          // Use the fallback hardcoded structure as a last resort
          const fallbackMealPlan = generateFallbackMealPlan(userData, selectedFoods);
          
          return new Response(
            JSON.stringify({ 
              mealPlan: fallbackMealPlan,
              modelUsed: "fallback-template",
              note: "Plano gerado a partir de template de fallback devido a erros de API"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      // If not a JSON validation error or we couldn't recover, return general error
      return new Response(
        JSON.stringify({ 
          error: `Erro da API: ${response.status}`, 
          details: errorText.substring(0, 500)
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
      
      // Add metadata to the response
      mealPlanJson.generatedBy = "nutri-plus-agent";
      mealPlanJson.userCalories = userData.dailyCalories;
      
      // Log success
      console.log(`[NUTRI+] Plano alimentar gerado com sucesso às ${new Date().toISOString()}`);
      console.log(`[NUTRI+] Duração do processo: ${(new Date().getTime() - new Date(startTime).getTime()) / 1000}s`);
      
      // Return the successful response
      return new Response(
        JSON.stringify({ mealPlan: mealPlanJson }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (jsonError) {
      // If the response is not valid JSON, log the error and try to recover
      console.error("[NUTRI+] Erro ao analisar JSON:", jsonError.message);
      console.error("[NUTRI+] Resposta JSON inválida:", mealPlanContent.substring(0, 500));
      
      // Generate fallback plan
      const fallbackMealPlan = generateFallbackMealPlan(userData, selectedFoods);
        
      return new Response(
        JSON.stringify({ 
          mealPlan: fallbackMealPlan,
          modelUsed: "fallback-generator",
          note: "Plano gerado a partir de template devido a erros de parsing JSON"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

// Helper function to generate a fallback meal plan when API fails
function generateFallbackMealPlan(userData: any, selectedFoods: any[]) {
  const caloriesPerDay = userData.dailyCalories || 2000;
  const proteinGrams = Math.round((caloriesPerDay * 0.3) / 4); // 30% of calories from protein
  const carbsGrams = Math.round((caloriesPerDay * 0.4) / 4);   // 40% of calories from carbs
  const fatsGrams = Math.round((caloriesPerDay * 0.3) / 9);    // 30% of calories from fats
  
  // Create sample foods from the selected foods or use defaults
  const sampleFoods = selectedFoods.length > 0 
    ? selectedFoods.slice(0, 20)
    : [
        { name: "Frango grelhado", calories: 165, protein: 31, carbs: 0, fats: 3.6 },
        { name: "Arroz", calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
        { name: "Feijão", calories: 127, protein: 8.7, carbs: 22.8, fats: 0.5 },
        { name: "Batata", calories: 77, protein: 2, carbs: 17, fats: 0.1 },
        { name: "Ovo", calories: 155, protein: 12.6, carbs: 0.6, fats: 10.6 }
      ];
  
  // Function to create a simple meal
  const createMeal = (name: string, caloriePercentage: number) => {
    const mealCalories = Math.round(caloriesPerDay * caloriePercentage);
    
    // Select 1-3 random foods
    const numFoods = Math.floor(Math.random() * 2) + 1;
    const mealFoods = [];
    
    for (let i = 0; i < numFoods; i++) {
      const randomFood = sampleFoods[Math.floor(Math.random() * sampleFoods.length)];
      mealFoods.push({
        name: randomFood.name,
        portion: Math.round(100 * (mealCalories / (numFoods * randomFood.calories))),
        unit: "g",
        details: "Preparar de acordo com preferência"
      });
    }
    
    return {
      description: `${name} balanceado`,
      foods: mealFoods,
      calories: mealCalories,
      macros: {
        protein: Math.round(proteinGrams * caloriePercentage),
        carbs: Math.round(carbsGrams * caloriePercentage),
        fats: Math.round(fatsGrams * caloriePercentage),
        fiber: Math.round(25 * caloriePercentage)
      }
    };
  };
  
  // Create a single day template
  const createDayPlan = (dayName: string) => {
    return {
      dayName,
      meals: {
        cafeDaManha: createMeal("Café da manhã", 0.25),
        lancheDaManha: createMeal("Lanche da manhã", 0.15),
        almoco: createMeal("Almoço", 0.30),
        lancheDaTarde: createMeal("Lanche da tarde", 0.15),
        jantar: createMeal("Jantar", 0.15)
      },
      dailyTotals: {
        calories: caloriesPerDay,
        protein: proteinGrams,
        carbs: carbsGrams,
        fats: fatsGrams,
        fiber: 25
      }
    };
  };
  
  // Create the fallback meal plan
  const fallbackPlan = {
    weeklyPlan: {
      segunda: createDayPlan("Segunda-feira"),
      terca: createDayPlan("Terça-feira"),
      quarta: createDayPlan("Quarta-feira"),
      quinta: createDayPlan("Quinta-feira"),
      sexta: createDayPlan("Sexta-feira"),
      sabado: createDayPlan("Sábado"),
      domingo: createDayPlan("Domingo")
    },
    weeklyTotals: {
      averageCalories: caloriesPerDay,
      averageProtein: proteinGrams,
      averageCarbs: carbsGrams,
      averageFats: fatsGrams,
      averageFiber: 25
    },
    recommendations: {
      general: "Mantenha uma alimentação balanceada e variada.",
      preworkout: "Consuma carboidratos antes do treino para energia.",
      postworkout: "Consuma proteínas após o treino para recuperação muscular.",
      timing: ["Distribua as refeições a cada 3-4 horas.", "Beba pelo menos 2 litros de água por dia."]
    },
    generatedBy: "fallback-generator",
    userCalories: caloriesPerDay
  };
  
  return fallbackPlan;
}
