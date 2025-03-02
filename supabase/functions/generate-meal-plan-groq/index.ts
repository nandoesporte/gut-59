
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestData = await req.json();
    console.log("Request data received:", JSON.stringify(requestData).substring(0, 500) + "...");

    // Validate required data
    if (!requestData.userData) {
      throw new Error("Dados do usuário não fornecidos");
    }

    if (!requestData.selectedFoods || !Array.isArray(requestData.selectedFoods) || requestData.selectedFoods.length === 0) {
      throw new Error("Alimentos selecionados não fornecidos");
    }

    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = requestData;

    // Validate user data properties
    const requiredUserFields = ["weight", "height", "age", "gender", "goal", "dailyCalories"];
    for (const field of requiredUserFields) {
      if (userData[field] === undefined) {
        throw new Error(`Campo obrigatório faltando nos dados do usuário: ${field}`);
      }
    }

    // Determine model to use (default to llama3-8b-8192)
    const model = requestData.model || "llama3-8b-8192";
    console.log(`Using Groq model: ${model}`);

    // Access GROQ API key from environment variables
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY não está definida no ambiente");
    }

    // Prepare dietary preferences information
    const allergiesText = dietaryPreferences && dietaryPreferences.hasAllergies && dietaryPreferences.allergies && dietaryPreferences.allergies.length > 0
      ? `Alergias: ${dietaryPreferences.allergies.join(", ")}`
      : "Sem alergias";
    
    const restrictionsText = dietaryPreferences && dietaryPreferences.dietaryRestrictions && dietaryPreferences.dietaryRestrictions.length > 0
      ? `Restrições alimentares: ${dietaryPreferences.dietaryRestrictions.join(", ")}`
      : "Sem restrições alimentares";
    
    const trainingTimeText = dietaryPreferences && dietaryPreferences.trainingTime
      ? `Horário de treino: ${dietaryPreferences.trainingTime}`
      : "Horário de treino não especificado";

    // Create a simple list of available foods with their macros
    const foodsList = selectedFoods.map(food => {
      return `${food.name} (${food.calories || 0} kcal, P:${food.protein || 0}g, C:${food.carbs || 0}g, G:${food.fats || 0}g)`;
    }).join("\n");

    // Form the structured prompt
    const prompt = `
Você é um nutricionista especializado em criar planos alimentares personalizados. 
Crie um plano alimentar semanal completo baseado nas informações abaixo:

### Dados do Usuário:
- Peso: ${userData.weight} kg
- Altura: ${userData.height} cm
- Idade: ${userData.age} anos
- Gênero: ${userData.gender}
- Objetivo: ${userData.goal}
- Necessidade calórica diária: ${userData.dailyCalories} kcal

### Preferências e Restrições:
${allergiesText}
${restrictionsText}
${trainingTimeText}

### Alimentos Disponíveis:
${foodsList}

### Instruções:
1. Crie um plano alimentar semanal (segunda a domingo) com 5 refeições por dia: café da manhã, lanche da manhã, almoço, lanche da tarde e jantar.
2. Para cada refeição, selecione alimentos da lista acima e especifique as porções em gramas.
3. Calcule as calorias e macronutrientes (proteínas, carboidratos, gorduras e fibras) para cada refeição.
4. Calcule o total diário de calorias e macronutrientes.
5. Inclua recomendações gerais, pré-treino e pós-treino de acordo com o objetivo.
6. O formato de resposta deve ser ESTRITAMENTE JSON conforme exemplo abaixo (sem textos ou explicações adicionais):

{
  "weeklyPlan": {
    "monday": {
      "dayName": "Segunda",
      "meals": {
        "breakfast": {
          "description": "Café da Manhã",
          "foods": [
            { "name": "Nome do Alimento", "portion": 100, "unit": "g", "details": "Informações adicionais" }
          ],
          "calories": 300,
          "macros": { "protein": 20, "carbs": 30, "fats": 10, "fiber": 5 }
        },
        "morningSnack": { 
          "description": "Lanche da Manhã",
          "foods": [
            { "name": "Nome do Alimento", "portion": 50, "unit": "g", "details": "Informações adicionais" }
          ],
          "calories": 150,
          "macros": { "protein": 10, "carbs": 15, "fats": 5, "fiber": 2 }
        },
        "lunch": { 
          "description": "Almoço",
          "foods": [
            { "name": "Nome do Alimento", "portion": 150, "unit": "g", "details": "Informações adicionais" }
          ],
          "calories": 400,
          "macros": { "protein": 30, "carbs": 40, "fats": 15, "fiber": 8 }
        },
        "afternoonSnack": { 
          "description": "Lanche da Tarde",
          "foods": [
            { "name": "Nome do Alimento", "portion": 50, "unit": "g", "details": "Informações adicionais" }
          ],
          "calories": 150,
          "macros": { "protein": 10, "carbs": 15, "fats": 5, "fiber": 2 }
        },
        "dinner": { 
          "description": "Jantar",
          "foods": [
            { "nome": "Nome do Alimento", "portion": 120, "unit": "g", "details": "Informações adicionais" }
          ],
          "calories": 350,
          "macros": { "protein": 25, "carbs": 35, "fats": 12, "fiber": 6 }
        }
      },
      "dailyTotals": {
        "calories": 1350,
        "protein": 95,
        "carbs": 135,
        "fats": 47,
        "fiber": 23
      }
    }
  },
  "weeklyTotals": {
    "averageCalories": 1350,
    "averageProtein": 95,
    "averageCarbs": 135,
    "averageFats": 47,
    "averageFiber": 23
  },
  "recommendations": {
    "general": "Recomendações gerais para o seu plano alimentar...",
    "preworkout": "O que comer antes do treino...",
    "postworkout": "O que comer após o treino...",
    "timing": [
      "Recomendação 1 sobre timing das refeições",
      "Recomendação 2 sobre timing das refeições"
    ]
  }
}

Lembre-se que a saída DEVE ser estritamente um JSON válido sem nenhum texto ou explicação adicional.`;

    console.log("Prompt preparado para envio à API Groq");

    // Call Groq API using the llama3-8b-8192 model
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error("Groq API error:", errorData);
      throw new Error(`Erro na API Groq: ${groqResponse.status} ${errorData}`);
    }

    // Parse the Groq API response
    const groqData = await groqResponse.json();
    console.log("Received response from Groq API");

    if (!groqData.choices || groqData.choices.length === 0 || !groqData.choices[0].message) {
      console.error("Groq API returned unexpected format:", groqData);
      throw new Error("Formato de resposta inválido da API Groq");
    }

    const generatedText = groqData.choices[0].message.content;
    console.log("Response text length:", generatedText.length);
    console.log("First 300 chars of response:", generatedText.substring(0, 300));

    // Try to parse the JSON from the response
    let mealPlanJson;
    try {
      // First, extract JSON from text if needed (in case the model added explanations)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : generatedText;
      
      mealPlanJson = JSON.parse(jsonString);
      console.log("Successfully parsed JSON meal plan");
    } catch (jsonError) {
      console.error("JSON parse error:", jsonError);
      console.error("Raw text returned:", generatedText);
      throw new Error("Falha ao analisar o JSON do plano alimentar");
    }

    // Add extra context for specific user
    if (userData.userId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      try {
        // Save meal plan to database
        const { error } = await supabase
          .from("meal_plans")
          .insert({
            user_id: userData.userId,
            plan_data: mealPlanJson,
            calories: userData.dailyCalories,
            dietary_preferences: dietaryPreferences
          });

        if (error) {
          console.error("Error saving meal plan to database:", error);
          // Continue even if saving fails
        } else {
          console.log("Meal plan saved to database successfully");
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Continue even if database operation fails
      }
    }

    // Return the successful response
    return new Response(
      JSON.stringify({
        success: true,
        mealPlan: mealPlanJson
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in generate-meal-plan-groq:", error);
    
    // Return a proper error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro desconhecido ao gerar plano alimentar"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
