
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
3. A saída deve ser um objeto JSON simples e compacto, com tamanho máximo de 4000 tokens.
4. Use nomes curtos para propriedades, evite redundâncias e comentários no JSON.
5. A saída deve seguir esta estrutura simplificada:
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

Cada dia deve ter a seguinte estrutura SIMPLIFICADA:
{
  "dayName": "Nome do Dia",
  "meals": {
    "breakfast": {
      "description": "Descrição breve",
      "foods": [{"name": "Nome do alimento", "portion": 100, "unit": "g", "details": "Instruções breves"}],
      "calories": 500,
      "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
    },
    /* outras refeições */
  },
  "dailyTotals": {"calories": 2000, "protein": 120, "carbs": 180, "fats": 60, "fiber": 25}
}

IMPORTANTE: Use exatamente os nomes de propriedades especificados acima em camelCase:
- "breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"
- NÃO use nomes com underscores como "morning_snack"`;

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
${selectedFoods.slice(0, 20).map(food => `- ${food.name} (${food.calories} kcal, P:${food.protein}g, C:${food.carbs}g, G:${food.fats}g)`).join('\n')}
${selectedFoods.length > 20 ? `\n... e mais ${selectedFoods.length - 20} alimentos.` : ''}

IMPORTANTE: Sua resposta deve ser MUITO SIMPLIFICADA e SEM COMENTÁRIOS para evitar erros de parsing JSON.
Crie apenas 3 dias (segunda, terça, quarta) para economizar tokens.
Use descrições curtas e instruções breves para manter o JSON compacto.
Limite o número de alimentos por refeição a no máximo 3.`;

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
      temperature: temperature,
      max_tokens: 4000,
      top_p: 0.9,
      response_format: { type: "json_object" }
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
      
      // Return an alternative meal plan for development purposes
      return new Response(
        JSON.stringify({ 
          mealPlan: generateFallbackMealPlan(userData.dailyCalories, selectedFoods),
          modelUsed: "fallback",
          error: `Erro da API Groq: ${response.status}`,
          errorDetails: errorData.substring(0, 500)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the API response
    const apiResponse = await response.json();
    console.log(`[NUTRI+] Resposta recebida da API Groq às ${new Date().toISOString()}`);
    
    // Check for valid response content
    if (!apiResponse.choices || !apiResponse.choices[0] || !apiResponse.choices[0].message) {
      console.error("[NUTRI+] Formato de resposta da API inválido:", JSON.stringify(apiResponse).substring(0, 200));
      return new Response(
        JSON.stringify({ 
          mealPlan: generateFallbackMealPlan(userData.dailyCalories, selectedFoods),
          modelUsed: "fallback",
          error: "Formato de resposta da API inválido"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the model's response content
    const mealPlanContent = apiResponse.choices[0].message.content;
    
    // Log size and a preview of the content
    console.log(`[NUTRI+] Tamanho da resposta: ${mealPlanContent.length} caracteres`);
    console.log(`[NUTRI+] Prévia da resposta: ${mealPlanContent.substring(0, 300)}...`);
    
    try {
      // Parse and validate the JSON response with safer approach
      let mealPlanJson;
      
      try {
        // First try normal parsing
        mealPlanJson = JSON.parse(mealPlanContent);
      } catch (parseError) {
        console.error("[NUTRI+] Erro no parsing inicial:", parseError.message);
        
        // Try with normalizing the content first
        try {
          // Remove any markdown formatting and normalize meal type names
          const normalizedContent = mealPlanContent
            .replace(/```json|```/g, '')
            .replace(/"morning_snack":/g, '"morningSnack":')
            .replace(/"afternoon_snack":/g, '"afternoonSnack":')
            .replace(/,\s*\]/g, ']')  // Remove trailing commas in arrays
            .replace(/,\s*\}/g, '}')  // Remove trailing commas in objects
            .trim();
          
          mealPlanJson = JSON.parse(normalizedContent);
          console.log("[NUTRI+] JSON corrigido após normalização");
        } catch (normalizeError) {
          console.error("[NUTRI+] Erro após normalização:", normalizeError.message);
          
          // If all parsing attempts fail, use fallback
          throw new Error(`Erro de parsing do JSON: ${parseError.message}`);
        }
      }
      
      // Validate the structure
      if (!mealPlanJson.mealPlan || !mealPlanJson.mealPlan.weeklyPlan) {
        throw new Error("Estrutura do plano alimentar inválida");
      }
      
      // Ensure at least 3 days are present (can be expanded to 7 if needed)
      const weeklyPlan = mealPlanJson.mealPlan.weeklyPlan;
      const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const availableDays = Object.keys(weeklyPlan);
      
      console.log(`[NUTRI+] Dias disponíveis: ${availableDays.join(', ')}`);
      
      // If missing days, duplicate from available days
      if (availableDays.length < 3) {
        console.log("[NUTRI+] Adicionando dias faltantes no plano");
        
        const templateDay = weeklyPlan[availableDays[0]];
        for (let i = 0; i < 3; i++) {
          if (!weeklyPlan[daysOfWeek[i]]) {
            weeklyPlan[daysOfWeek[i]] = structuredClone(templateDay);
            weeklyPlan[daysOfWeek[i]].dayName = capitalizeFirstLetter(daysOfWeek[i]);
          }
        }
      }
      
      // Ensure all days have complete meal data
      Object.keys(weeklyPlan).forEach(day => {
        const dayPlan = weeklyPlan[day];
        if (!dayPlan.meals) {
          dayPlan.meals = {};
        }
        
        // Ensure all meal types exist
        const mealTypes = ["breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner"];
        mealTypes.forEach(mealType => {
          if (!dayPlan.meals[mealType]) {
            dayPlan.meals[mealType] = {
              description: `${capitalizeFirstLetter(mealType)} padrão`,
              foods: [],
              calories: 0,
              macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
            };
          }
        });
        
        // Ensure dailyTotals exists
        if (!dayPlan.dailyTotals) {
          dayPlan.dailyTotals = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            fiber: 0
          };
          
          // Calculate totals from meals
          Object.values(dayPlan.meals).forEach((meal: any) => {
            dayPlan.dailyTotals.calories += meal.calories || 0;
            dayPlan.dailyTotals.protein += meal.macros?.protein || 0;
            dayPlan.dailyTotals.carbs += meal.macros?.carbs || 0;
            dayPlan.dailyTotals.fats += meal.macros?.fats || 0;
            dayPlan.dailyTotals.fiber += meal.macros?.fiber || 0;
          });
        }
      });
      
      // Ensure weeklyTotals exists and is valid
      if (!mealPlanJson.mealPlan.weeklyTotals) {
        mealPlanJson.mealPlan.weeklyTotals = {
          averageCalories: userData.dailyCalories || 2000,
          averageProtein: 0,
          averageCarbs: 0,
          averageFats: 0,
          averageFiber: 0
        };
        
        // Calculate from available days
        const days = Object.values(weeklyPlan);
        if (days.length > 0) {
          const validDays = days.filter((day: any) => day && day.dailyTotals);
          const dayCount = validDays.length || 1;
          
          mealPlanJson.mealPlan.weeklyTotals = {
            averageCalories: Math.round(validDays.reduce((sum, day: any) => sum + (day.dailyTotals?.calories || 0), 0) / dayCount),
            averageProtein: Math.round(validDays.reduce((sum, day: any) => sum + (day.dailyTotals?.protein || 0), 0) / dayCount),
            averageCarbs: Math.round(validDays.reduce((sum, day: any) => sum + (day.dailyTotals?.carbs || 0), 0) / dayCount),
            averageFats: Math.round(validDays.reduce((sum, day: any) => sum + (day.dailyTotals?.fats || 0), 0) / dayCount),
            averageFiber: Math.round(validDays.reduce((sum, day: any) => sum + (day.dailyTotals?.fiber || 0), 0) / dayCount)
          };
        }
      }
      
      // Ensure recommendations exist
      if (!mealPlanJson.mealPlan.recommendations) {
        mealPlanJson.mealPlan.recommendations = {
          general: "Mantenha uma alimentação balanceada e variada.",
          preworkout: "Consuma carboidratos de rápida absorção antes do treino.",
          postworkout: "Consuma proteínas e carboidratos após o treino para recuperação.",
          timing: [
            "Café da manhã: Logo ao acordar",
            "Lanche da manhã: 2-3 horas após café",
            "Almoço: 12-13h",
            "Lanche da tarde: 15-16h",
            "Jantar: 19-20h"
          ]
        };
      }
      
      // Add user calories to the meal plan
      mealPlanJson.mealPlan.userCalories = userData.dailyCalories;
      mealPlanJson.mealPlan.generatedBy = "nutri-plus-agent-llama3";
      
      console.log(`[NUTRI+] Plano alimentar processado com sucesso às ${new Date().toISOString()}`);
      console.log(`[NUTRI+] Duração do processo: ${(new Date().getTime() - new Date(startTime).getTime()) / 1000}s`);
      
      // Return the successful response with model info
      return new Response(
        JSON.stringify({ 
          mealPlan: mealPlanJson.mealPlan,
          modelUsed: modelName
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (error) {
      // Handle any unexpected errors in parsing or validation
      console.error("[NUTRI+] Erro ao processar resposta:", error);
      
      // Return fallback meal plan
      return new Response(
        JSON.stringify({ 
          mealPlan: generateFallbackMealPlan(userData.dailyCalories, selectedFoods),
          modelUsed: "fallback",
          error: error.message,
          errorDetails: "Ocorreu um erro ao processar o plano alimentar. Um plano básico foi gerado."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
  } catch (error) {
    // Handle any unexpected errors
    console.error("[NUTRI+] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor", 
        details: error.message,
        mealPlan: generateFallbackMealPlan(2000, []) // Provide fallback with default values
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper function to capitalize first letter
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Generate a fallback meal plan when the API fails
function generateFallbackMealPlan(calories: number = 2000, foods: any[]): any {
  // Create a simple meal plan structure with basic meals
  const sampleFoods = foods.length > 10 ? foods.slice(0, 10) : foods;
  
  // Default recommendations
  const recommendations = {
    general: "Mantenha uma alimentação balanceada com proteínas, carboidratos e gorduras saudáveis.",
    preworkout: "Consuma carboidratos 30-60 minutos antes do treino para energia.",
    postworkout: "Consuma proteínas após o treino para recuperação muscular.",
    timing: [
      "Café da manhã: Logo ao acordar",
      "Lanche da manhã: 10:00",
      "Almoço: 13:00",
      "Lanche da tarde: 16:00",
      "Jantar: 19:00"
    ]
  };

  // Create a meal template
  const createMeal = (name: string, calories: number) => {
    const protein = Math.round(calories * 0.3 / 4); // 30% from protein
    const carbs = Math.round(calories * 0.5 / 4);   // 50% from carbs
    const fats = Math.round(calories * 0.2 / 9);    // 20% from fats
    
    // Get 1-2 random foods if available
    const mealFoods = [];
    if (sampleFoods.length > 0) {
      const randomIndex = Math.floor(Math.random() * sampleFoods.length);
      const food = sampleFoods[randomIndex];
      mealFoods.push({
        name: food.name || "Alimento genérico",
        portion: 100,
        unit: "g",
        details: "Prepare conforme sua preferência."
      });
    } else {
      mealFoods.push({
        name: `${name} genérico`,
        portion: 100,
        unit: "g",
        details: "Prepare conforme sua preferência."
      });
    }
    
    return {
      description: `${name} básico`,
      foods: mealFoods,
      calories: calories,
      macros: {
        protein: protein,
        carbs: carbs,
        fats: fats,
        fiber: Math.round(carbs * 0.2) // Approximately 20% of carbs as fiber
      }
    };
  };

  // Create day template with balanced calorie distribution
  const createDay = (dayName: string) => {
    const breakfastCal = Math.round(calories * 0.25);
    const morningSnackCal = Math.round(calories * 0.1);
    const lunchCal = Math.round(calories * 0.3);
    const afternoonSnackCal = Math.round(calories * 0.1);
    const dinnerCal = Math.round(calories * 0.25);
    
    const breakfast = createMeal("Café da manhã", breakfastCal);
    const morningSnack = createMeal("Lanche da manhã", morningSnackCal);
    const lunch = createMeal("Almoço", lunchCal);
    const afternoonSnack = createMeal("Lanche da tarde", afternoonSnackCal);
    const dinner = createMeal("Jantar", dinnerCal);
    
    const totalProtein = breakfast.macros.protein + morningSnack.macros.protein + 
                         lunch.macros.protein + afternoonSnack.macros.protein + dinner.macros.protein;
                         
    const totalCarbs = breakfast.macros.carbs + morningSnack.macros.carbs + 
                      lunch.macros.carbs + afternoonSnack.macros.carbs + dinner.macros.carbs;
                      
    const totalFats = breakfast.macros.fats + morningSnack.macros.fats + 
                     lunch.macros.fats + afternoonSnack.macros.fats + dinner.macros.fats;
                     
    const totalFiber = breakfast.macros.fiber + morningSnack.macros.fiber + 
                      lunch.macros.fiber + afternoonSnack.macros.fiber + dinner.macros.fiber;
    
    return {
      dayName: dayName,
      meals: {
        breakfast,
        morningSnack,
        lunch,
        afternoonSnack,
        dinner
      },
      dailyTotals: {
        calories: calories,
        protein: totalProtein,
        carbs: totalCarbs,
        fats: totalFats,
        fiber: totalFiber
      }
    };
  };

  // Create the week plan with 3 days
  return {
    weeklyPlan: {
      monday: createDay("Segunda-feira"),
      tuesday: createDay("Terça-feira"),
      wednesday: createDay("Quarta-feira")
    },
    weeklyTotals: {
      averageCalories: calories,
      averageProtein: Math.round(calories * 0.3 / 4),
      averageCarbs: Math.round(calories * 0.5 / 4),
      averageFats: Math.round(calories * 0.2 / 9),
      averageFiber: Math.round(calories * 0.5 / 4 * 0.2)
    },
    recommendations,
    userCalories: calories,
    generatedBy: "fallback-generator"
  };
}
