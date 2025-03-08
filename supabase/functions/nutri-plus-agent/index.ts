
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
6. Todos os valores numéricos devem ser números inteiros (sem casas decimais e sem aspas).
7. Não inclua comentários no JSON.
8. Não deixe o JSON truncado ou incompleto.
9. Incluir recomendações completas, mas concisas.
10. IMPORTANTE: Para números decimais, arredonde para inteiros. Ex: 10.5 deve ser apenas 10, 7.8 deve ser apenas 8.

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
   - "portion": Valor numérico INTEIRO (sem aspas)
   - "unit": Unidade de medida em português (g, ml, etc.)
   - "details": Instruções de preparo em português

4. Todos os valores numéricos (calories, protein, carbs, fats, fiber) devem ser números inteiros SEM ASPAS e SEM SUFIXOS como "g" ou "kcal".

5. Arredonde todos os números decimais para inteiros. Ex: 10.5 deve ser 10, 7.8 deve ser 8.`;

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
11. MUITO IMPORTANTE: Os dias da semana devem ser: "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"
12. MUITO IMPORTANTE: Todos os números decimais devem ser arredondados para inteiros: 10.5 para 10, 7.8 para 8, etc.`;

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
      max_tokens: 4000,
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
      
      // Handle json validation errors specifically
      if (response.status === 400 && errorText.includes("json_validate_failed")) {
        console.log("[NUTRI+] Erro de validação JSON na resposta da API");
        
        // Extract the full JSON content from the error message
        let extractedJson = null;
        let mealPlanData = null;
        
        try {
          // Various extraction strategies to recover the JSON from error response
          
          // Strategy 1: Extract from failed_generation
          const failedGenerationMatch = errorText.match(/"failed_generation"\s*:\s*"([\s\S]*)"/);
          if (failedGenerationMatch && failedGenerationMatch[1]) {
            // Clean the extracted content by replacing escaped newlines and quotes
            extractedJson = failedGenerationMatch[1]
              .replace(/\\n/g, '')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
            
            console.log("[NUTRI+] Extraindo JSON da mensagem de erro (failed_generation)");
            
            // Attempt to parse the JSON directly
            try {
              // First try: direct parse by adding curly braces if missing
              if (!extractedJson.trim().startsWith('{')) {
                extractedJson = '{' + extractedJson;
              }
              if (!extractedJson.trim().endsWith('}')) {
                extractedJson = extractedJson + '}';
              }
              
              mealPlanData = JSON.parse(extractedJson);
              console.log("[NUTRI+] Conversão direta do JSON bem-sucedida");
            } catch (directParseError) {
              console.log("[NUTRI+] Erro na conversão direta:", directParseError.message);
              
              try {
                // Second try: Using regex to extract everything between the first { and last }
                const jsonMatch = extractedJson.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const jsonContent = jsonMatch[0];
                  mealPlanData = JSON.parse(jsonContent);
                  console.log("[NUTRI+] Extração de JSON com regex bem-sucedida");
                }
              } catch (regexError) {
                console.log("[NUTRI+] Erro na extração com regex:", regexError.message);
                
                try {
                  // Third try: Split by the first { and rebuild
                  const parts = extractedJson.split('{');
                  if (parts.length > 1) {
                    const reconstructed = '{' + parts.slice(1).join('{');
                    // Find the last valid closing brace
                    let validJson = reconstructed;
                    let braceCount = 0;
                    for (let i = 0; i < reconstructed.length; i++) {
                      if (reconstructed[i] === '{') braceCount++;
                      if (reconstructed[i] === '}') braceCount--;
                      if (braceCount === 0) {
                        validJson = reconstructed.substring(0, i + 1);
                        break;
                      }
                    }
                    mealPlanData = JSON.parse(validJson);
                    console.log("[NUTRI+] Reconstrução de JSON bem-sucedida");
                  }
                } catch (reconstructError) {
                  console.log("[NUTRI+] Erro na reconstrução:", reconstructError.message);
                }
              }
            }
          }
        } catch (extractError) {
          console.error("[NUTRI+] Erro ao extrair JSON:", extractError.message);
        }
        
        // If we successfully recovered partial data, process and return it
        if (mealPlanData) {
          console.log("[NUTRI+] Dados JSON recuperados com sucesso da resposta de erro");
          
          // Process all numeric values to ensure they're integers
          const processNumericValues = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            
            Object.keys(obj).forEach(key => {
              if (typeof obj[key] === 'number') {
                // Round to integer
                obj[key] = Math.round(obj[key]);
              } else if (typeof obj[key] === 'string' && !isNaN(obj[key])) {
                // Convert string numbers to integers
                obj[key] = Math.round(parseFloat(obj[key]));
              } else if (Array.isArray(obj[key])) {
                obj[key].forEach(item => {
                  if (typeof item === 'object' && item !== null) {
                    processNumericValues(item);
                  }
                });
              } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                processNumericValues(obj[key]);
              }
            });
            return obj;
          };
          
          // Process all numeric values to integers
          mealPlanData = processNumericValues(mealPlanData);
          
          // Ensure basic structure is complete
          const ensureStructureComplete = () => {
            if (!mealPlanData.weeklyPlan) {
              mealPlanData.weeklyPlan = {};
              console.log("[NUTRI+] Criando estrutura de plano semanal ausente");
            }
            
            // Check for required days
            const requiredDays = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
            const dayNames = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
            
            // Get an existing day structure to clone if needed
            const existingDay = Object.values(mealPlanData.weeklyPlan)[0];
            
            requiredDays.forEach((day, index) => {
              if (!mealPlanData.weeklyPlan[day]) {
                console.log(`[NUTRI+] Adicionando dia ausente: ${day}`);
                
                if (existingDay) {
                  // Clone structure from existing day
                  mealPlanData.weeklyPlan[day] = JSON.parse(JSON.stringify(existingDay));
                  mealPlanData.weeklyPlan[day].dayName = dayNames[index];
                } else {
                  // Create basic structure if no existing day
                  const mealTemplate = {
                    description: "Refeição",
                    foods: [{ name: "Alimento", portion: 100, unit: "g", details: "Preparar conforme instruções" }],
                    calories: userData.dailyCalories / 5, // Rough estimate
                    macros: { protein: 20, carbs: 30, fats: 10, fiber: 5 }
                  };
                  
                  mealPlanData.weeklyPlan[day] = {
                    dayName: dayNames[index],
                    meals: {
                      cafeDaManha: JSON.parse(JSON.stringify(mealTemplate)),
                      lancheDaManha: JSON.parse(JSON.stringify(mealTemplate)),
                      almoco: JSON.parse(JSON.stringify(mealTemplate)),
                      lancheDaTarde: JSON.parse(JSON.stringify(mealTemplate)),
                      jantar: JSON.parse(JSON.stringify(mealTemplate)),
                    },
                    dailyTotals: {
                      calories: userData.dailyCalories,
                      protein: Math.round(userData.dailyCalories * 0.25 / 4), // 25% from protein
                      carbs: Math.round(userData.dailyCalories * 0.5 / 4), // 50% from carbs
                      fats: Math.round(userData.dailyCalories * 0.25 / 9), // 25% from fats
                      fiber: 25 // Default value
                    }
                  };
                }
              }
              
              // Check meal structure for each day
              const dayData = mealPlanData.weeklyPlan[day];
              if (!dayData.meals) {
                dayData.meals = {};
              }
              
              const requiredMeals = ['cafeDaManha', 'lancheDaManha', 'almoco', 'lancheDaTarde', 'jantar'];
              requiredMeals.forEach(meal => {
                if (!dayData.meals[meal]) {
                  console.log(`[NUTRI+] Adicionando refeição ausente: ${meal} para ${day}`);
                  
                  // Find an existing meal to clone, or create default
                  const existingMeal = Object.values(dayData.meals)[0];
                  
                  if (existingMeal) {
                    dayData.meals[meal] = JSON.parse(JSON.stringify(existingMeal));
                    dayData.meals[meal].description = `Refeição ${meal}`;
                  } else {
                    dayData.meals[meal] = {
                      description: `Refeição ${meal}`,
                      foods: [{ name: "Alimento", portion: 100, unit: "g", details: "Preparar conforme instruções" }],
                      calories: Math.round(userData.dailyCalories / 5),
                      macros: { protein: 20, carbs: 30, fats: 10, fiber: 5 }
                    };
                  }
                }
                
                // Ensure food items are correctly structured
                const mealData = dayData.meals[meal];
                if (!mealData.foods || !Array.isArray(mealData.foods) || mealData.foods.length === 0) {
                  mealData.foods = [{ name: "Alimento", portion: 100, unit: "g", details: "Preparar conforme instruções" }];
                }
                
                // Ensure numeric meal values
                if (typeof mealData.calories !== 'number') {
                  mealData.calories = Math.round(userData.dailyCalories / 5);
                }
                
                if (!mealData.macros) {
                  mealData.macros = { protein: 20, carbs: 30, fats: 10, fiber: 5 };
                }
              });
              
              // Recalculate daily totals
              if (!dayData.dailyTotals) {
                console.log(`[NUTRI+] Recalculando totais diários para: ${day}`);
                
                const meals = dayData.meals;
                dayData.dailyTotals = {
                  calories: Object.values(meals).reduce((sum, meal) => sum + (meal.calories || 0), 0),
                  protein: Object.values(meals).reduce((sum, meal) => sum + (meal.macros?.protein || 0), 0),
                  carbs: Object.values(meals).reduce((sum, meal) => sum + (meal.macros?.carbs || 0), 0),
                  fats: Object.values(meals).reduce((sum, meal) => sum + (meal.macros?.fats || 0), 0),
                  fiber: Object.values(meals).reduce((sum, meal) => sum + (meal.macros?.fiber || 0), 0)
                };
              }
            });
          };
          
          ensureStructureComplete();
          
          // Calculate or fix weekly totals
          if (!mealPlanData.weeklyTotals || 
              isNaN(mealPlanData.weeklyTotals.averageCalories) || 
              isNaN(mealPlanData.weeklyTotals.averageProtein)) {
            
            console.log("[NUTRI+] Calculando médias semanais");
            
            const weeklyPlan = mealPlanData.weeklyPlan || {};
            const days = Object.values(weeklyPlan);
            const dayCount = days.length || 1; // Prevent division by zero
            
            mealPlanData.weeklyTotals = {
              averageCalories: Math.round(days.reduce((sum, day) => sum + (day.dailyTotals?.calories || 0), 0) / dayCount),
              averageProtein: Math.round(days.reduce((sum, day) => sum + (day.dailyTotals?.protein || 0), 0) / dayCount),
              averageCarbs: Math.round(days.reduce((sum, day) => sum + (day.dailyTotals?.carbs || 0), 0) / dayCount),
              averageFats: Math.round(days.reduce((sum, day) => sum + (day.dailyTotals?.fats || 0), 0) / dayCount),
              averageFiber: Math.round(days.reduce((sum, day) => sum + (day.dailyTotals?.fiber || 0), 0) / dayCount)
            };
          }
          
          // Ensure recommendations are complete
          if (!mealPlanData.recommendations) {
            console.log("[NUTRI+] Adicionando recomendações padrão");
            
            mealPlanData.recommendations = {
              general: "Mantenha uma alimentação balanceada e variada. Beba pelo menos 2 litros de água por dia.",
              preworkout: "Consuma carboidratos 30-60 minutos antes do treino para energia.",
              postworkout: "Consuma proteínas e carboidratos dentro de 30 minutos após o treino para recuperação muscular.",
              timing: [
                "Distribua as refeições a cada 3-4 horas durante o dia.",
                "Evite refeições pesadas antes de dormir."
              ]
            };
          }
          
          // Add metadata to the response
          mealPlanData.modelUsed = modelName;
          mealPlanData.generatedAt = new Date().toISOString();
          mealPlanData.userCalories = userData.dailyCalories;
          mealPlanData.recoveredFromError = true;
          
          console.log(`[NUTRI+] Plano alimentar recuperado e normalizado às ${new Date().toISOString()}`);
          
          return new Response(
            JSON.stringify({ mealPlan: mealPlanData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // If recovery failed, return sensible error with suggestions
        return new Response(
          JSON.stringify({ 
            error: "Erro de validação JSON na resposta da API", 
            details: "Não foi possível recuperar um plano alimentar válido da resposta",
            suggestedModel: "llama3-70b-8192",
            recoveryFailed: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Return the error to the client
      return new Response(
        JSON.stringify({ 
          error: `Erro da API: ${response.status}`, 
          details: errorText.substring(0, 500),
          suggestedModel: "llama3-70b-8192"
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
      
      // Process all numeric values to ensure they're integers
      const processNumericValues = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === 'number') {
            // Round to integer
            obj[key] = Math.round(obj[key]);
          } else if (typeof obj[key] === 'string' && !isNaN(obj[key])) {
            // Convert string numbers to integers
            obj[key] = Math.round(parseFloat(obj[key]));
          } else if (Array.isArray(obj[key])) {
            obj[key].forEach(item => {
              if (typeof item === 'object' && item !== null) {
                processNumericValues(item);
              }
            });
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            processNumericValues(obj[key]);
          }
        });
        return obj;
      };
      
      // Process all numeric values to integers
      processNumericValues(mealPlanJson);
      
      // Ensure the meal plan uses the user's specified daily calories
      if (userData.dailyCalories) {
        mealPlanJson.userCalories = userData.dailyCalories;
      }
      
      // Make sure weeklyTotals are valid numbers
      if (mealPlanJson.weeklyTotals) {
        const totals = mealPlanJson.weeklyTotals;
        Object.keys(totals).forEach(key => {
          if (typeof totals[key] === 'number' && isNaN(totals[key])) {
            totals[key] = 0;
          }
        });
      } else {
        // Calculate weeklyTotals if missing
        console.log("Recalculando médias semanais");
        
        // Convert weeklyPlan to array of day plans, with validation
        const weeklyPlan = mealPlanJson.weeklyPlan || {};
        const days = Object.values(weeklyPlan);
        
        // Define a proper type guard function to ensure day has properly typed dailyTotals
        const isDayPlanWithValidTotals = (day) => {
          return (
            !!day && 
            typeof day === 'object' &&
            'dailyTotals' in day &&
            !!day.dailyTotals &&
            typeof day.dailyTotals === 'object' &&
            'calories' in day.dailyTotals
          );
        };
        
        // Filter days to only include valid days with proper dailyTotals
        const validDays = days.filter(isDayPlanWithValidTotals);
        const dayCount = validDays.length || 1; // Prevent division by zero
        
        mealPlanJson.weeklyTotals = {
          averageCalories: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.calories, 0) / dayCount),
          averageProtein: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.protein, 0) / dayCount),
          averageCarbs: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.carbs, 0) / dayCount),
          averageFats: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.fats, 0) / dayCount),
          averageFiber: Math.round(validDays.reduce((sum, day) => sum + day.dailyTotals.fiber, 0) / dayCount)
        };
      }
      
      // Add metadata to the response
      mealPlanJson.modelUsed = modelName;
      mealPlanJson.generatedAt = new Date().toISOString();
      
      // Log success
      console.log(`[NUTRI+] Plano alimentar gerado com sucesso às ${new Date().toISOString()}`);
      console.log(`[NUTRI+] Duração do processo: ${(new Date().getTime() - new Date(startTime).getTime()) / 1000}s`);
      
      // Return the successful response
      return new Response(
        JSON.stringify({ mealPlan: mealPlanJson }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (jsonError) {
      // If the response is not valid JSON, try to recover
      console.error("[NUTRI+] Erro ao analisar JSON:", jsonError.message);
      console.error("[NUTRI+] Resposta JSON inválida:", mealPlanContent.substring(0, 500));
      
      try {
        // Attempt to fix common JSON issues
        console.log("[NUTRI+] Tentando corrigir problemas comuns de JSON");
        
        const fixedContent = mealPlanContent
          .replace(/,\s*}/g, '}') // Remove trailing commas in objects
          .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
          .replace(/([0-9]+)\.([0-9]+)/g, (match, p1, p2) => Math.round(parseFloat(`${p1}.${p2}`)).toString()) // Round decimals
          .replace(/:\s*NaN/g, ': 0') // Replace NaN with 0
          .replace(/:\s*null/g, ': 0') // Replace null numeric values with 0
          .replace(/:\s*undefined/g, ': 0') // Replace undefined with 0
          .replace(/\\n/g, '') // Remove newlines
          .replace(/\\r/g, '') // Remove carriage returns
          .replace(/\\t/g, '') // Remove tabs
          .replace(/\n|\r|\t/g, ''); // Remove any actual newlines or tabs
        
        console.log("[NUTRI+] Tentando analisar JSON corrigido");
        const mealPlanJson = JSON.parse(fixedContent);
        
        if (mealPlanJson.weeklyPlan) {
          console.log("[NUTRI+] Correção do JSON bem-sucedida");
          
          // Process all numeric values
          const processNumericValues = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            
            Object.keys(obj).forEach(key => {
              if (typeof obj[key] === 'number') {
                obj[key] = Math.round(obj[key]);
              } else if (Array.isArray(obj[key])) {
                obj[key].forEach(item => {
                  if (typeof item === 'object' && item !== null) {
                    processNumericValues(item);
                  }
                });
              } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                processNumericValues(obj[key]);
              }
            });
            return obj;
          };
          
          // Process all numeric values to integers
          processNumericValues(mealPlanJson);
          
          // Add metadata
          mealPlanJson.modelUsed = modelName;
          mealPlanJson.generatedAt = new Date().toISOString();
          mealPlanJson.userCalories = userData.dailyCalories;
          mealPlanJson.fixed = true;
          
          return new Response(
            JSON.stringify({ mealPlan: mealPlanJson }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          throw new Error("Estrutura JSON ainda inválida após correções");
        }
      } catch (fixError) {
        console.error("[NUTRI+] Falha na correção do JSON:", fixError.message);
        
        // Try to extract JSON using regex if the fixes didn't work
        try {
          console.log("[NUTRI+] Tentando extrair JSON com regex");
          
          const jsonMatch = mealPlanContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extractedJson = jsonMatch[0]
              .replace(/,\s*}/g, '}') // Remove trailing commas
              .replace(/,\s*\]/g, ']')
              .replace(/([0-9]+)\.([0-9]+)/g, (match, p1, p2) => Math.round(parseFloat(`${p1}.${p2}`)).toString());
            
            const mealPlanJson = JSON.parse(extractedJson);
            
            if (mealPlanJson.weeklyPlan) {
              console.log("[NUTRI+] Extração de JSON com regex bem-sucedida");
              
              // Add metadata
              mealPlanJson.modelUsed = modelName;
              mealPlanJson.generatedAt = new Date().toISOString();
              mealPlanJson.userCalories = userData.dailyCalories;
              mealPlanJson.extractedWithRegex = true;
              
              return new Response(
                JSON.stringify({ mealPlan: mealPlanJson }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
          
          throw new Error("Nenhum JSON válido encontrado com regex");
        } catch (regexError) {
          console.error("[NUTRI+] Falha na extração por regex:", regexError.message);
          
          // All recovery attempts failed, return error
          return new Response(
            JSON.stringify({ 
              error: "Falha ao analisar JSON do plano alimentar",
              details: jsonError.message,
              suggestedModel: "llama3-70b-8192",
              recoveryAttempted: true
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
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
