
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the auth context of the function
async function createSupabaseClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

// Generate meal plan using Groq API
async function generateMealPlanWithGroq(userData: any, selectedFoods: any[], preferences: any) {
  try {
    console.log("Iniciando geração de plano alimentar com Groq API");
    
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY não encontrada nas variáveis de ambiente');
    }

    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    // Prepare the prompt with user data
    const prompt = `Gere um plano alimentar semanal para um usuário com as seguintes características:
    - Peso: ${userData.weight}kg
    - Altura: ${userData.height}cm
    - Idade: ${userData.age} anos
    - Gênero: ${userData.gender === 'male' ? 'Masculino' : 'Feminino'}
    - Nível de atividade: ${userData.activityLevel}
    - Objetivo: ${userData.goal}
    - Calorias diárias: ${userData.dailyCalories} kcal
    
    Alimentos selecionados:
    ${selectedFoods.map(food => `- ${food.name} (${food.calories} kcal por porção)`).join('\n')}
    
    Preferências dietéticas:
    - Alergias: ${preferences.hasAllergies ? preferences.allergies.join(', ') : 'Nenhuma'}
    - Restrições alimentares: ${preferences.dietaryRestrictions.length > 0 ? preferences.dietaryRestrictions.join(', ') : 'Nenhuma'}
    - Horário de treino: ${preferences.trainingTime || 'Não especificado'}
    
    O plano deve incluir:
    1. Café da manhã, lanche da manhã, almoço, lanche da tarde e jantar para cada dia da semana.
    2. Descrição detalhada de cada refeição com porções e quantidades.
    3. Contagem de calorias e macronutrientes para cada refeição e total diário.
    4. Recomendações gerais, pré e pós-treino e sugestões de horários.
    
    Formate a resposta como um objeto JSON válido seguindo exatamente esta estrutura:
    {
      "weeklyPlan": {
        "monday": {
          "meals": {
            "breakfast": {
              "description": "",
              "foods": [
                { "name": "", "portion": 0, "unit": "", "details": "" }
              ],
              "calories": 0,
              "macros": { "protein": 0, "carbs": 0, "fats": 0, "fiber": 0 }
            },
            "morningSnack": { ... },
            "lunch": { ... },
            "afternoonSnack": { ... },
            "dinner": { ... }
          },
          "dailyTotals": { "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "fiber": 0 }
        },
        // Repita para tuesday, wednesday, thursday, friday, saturday, sunday
      },
      "weeklyTotals": {
        "averageCalories": 0,
        "averageProtein": 0,
        "averageCarbs": 0,
        "averageFats": 0,
        "averageFiber": 0
      },
      "recommendations": {
        "general": "",
        "preworkout": "",
        "postworkout": "",
        "timing": [""]
      }
    }`;

    console.log("Enviando requisição para Groq API");
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: "Você é um nutricionista especialista em criar planos alimentares personalizados. Forneça respostas apenas no formato JSON solicitado."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API da Groq: ${response.status} - ${errorText}`);
      throw new Error(`Erro na API da Groq: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta recebida da API Groq");
    
    try {
      const mealPlanJson = JSON.parse(data.choices[0].message.content);
      console.log("Plano alimentar JSON parseado com sucesso");
      return mealPlanJson;
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON retornado pela API:", parseError);
      throw new Error("O modelo retornou um JSON inválido");
    }
  } catch (error) {
    console.error("Erro na geração do plano alimentar com Groq:", error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Validating request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Getting request body
    const requestBody = await req.json();
    const { userData, selectedFoods, preferences } = requestBody;
    
    // Input validation
    if (!userData || !selectedFoods || !preferences) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log("Iniciando processamento do plano alimentar com Groq");
    console.log("Dados do usuário:", userData);
    console.log("Número de alimentos selecionados:", selectedFoods.length);
    
    // Initialize Supabase client
    const supabase = await createSupabaseClient(req);
    
    // Record the plan generation in database
    if (userData.id) {
      const { error: updateError } = await supabase
        .from('plan_generation_counts')
        .upsert(
          { 
            user_id: userData.id, 
            nutrition_count: supabase.rpc('increment_counter', { row_id: userData.id, column_name: 'nutrition_count' })
          },
          { onConflict: 'user_id' }
        );
      
      if (updateError) {
        console.error("Erro ao atualizar contagem de gerações:", updateError);
      }
    }
    
    // Generate the meal plan
    const mealPlan = await generateMealPlanWithGroq(userData, selectedFoods, preferences);
    
    // Save the meal plan to database
    if (userData.id && mealPlan) {
      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.id,
          plan_data: mealPlan,
          daily_calories: userData.dailyCalories,
          selected_foods: selectedFoods.map(food => food.id)
        });
      
      if (saveError) {
        console.error("Erro ao salvar plano alimentar:", saveError);
      }
    }
    
    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Erro na função generate-meal-plan-groq:", error);
    
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
