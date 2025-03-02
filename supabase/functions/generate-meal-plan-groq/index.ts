
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  try {
    console.log("Iniciando função generate-meal-plan-groq com modelo Mistral Saba 24B");
    const requestData = await req.json();
    const { userData, selectedFoods = [], foodsByMealType = {}, dietaryPreferences = {}, model = "mistral-saba-24b" } = requestData;

    console.log(`Modelo solicitado: ${model}`);
    console.log(`Calorias diárias do usuário: ${userData?.dailyCalories || 'não definido'}`);
    console.log(`Número de alimentos selecionados: ${selectedFoods?.length || 0}`);
    console.log(`Preferências dietéticas: ${JSON.stringify(dietaryPreferences).substring(0, 100)}...`);

    if (!userData || !userData.dailyCalories) {
      throw new Error('Dados do usuário ou calorias diárias não fornecidos');
    }

    if (!selectedFoods || selectedFoods.length === 0) {
      throw new Error('Nenhum alimento selecionado');
    }

    // Construct the system prompt
    const systemPrompt = `Você é um nutricionista profissional especializado em criar planos alimentares personalizados. 
Sua tarefa é criar um cardápio semanal detalhado para 7 dias com base nas preferências, necessidades calóricas e alimentos selecionados pelo usuário.
O resultado deve ser em formato JSON estruturado conforme o exemplo fornecido.`;

    // Create a detailed prompt with user data and food preferences
    let userPrompt = `Crie um plano alimentar semanal personalizado com as seguintes características:

PERFIL DO USUÁRIO:
- Peso: ${userData.weight}kg
- Altura: ${userData.height}cm
- Idade: ${userData.age} anos
- Gênero: ${userData.gender === 'male' ? 'Masculino' : 'Feminino'}
- Nível de atividade: ${userData.activityLevel || 'moderado'}
- Objetivo: ${userData.goal === 'lose_weight' ? 'Perda de peso' : userData.goal === 'gain_weight' ? 'Ganho de massa' : 'Manutenção'}
- Necessidade calórica diária: ${userData.dailyCalories} kcal

PREFERÊNCIAS ALIMENTARES:
`;

    // Add selected foods
    userPrompt += "ALIMENTOS SELECIONADOS PELO USUÁRIO:\n";
    selectedFoods.forEach((food, index) => {
      if (index < 40) { // Limit foods to avoid token limits
        userPrompt += `- ${food.name} (${food.calories || 0}kcal por ${food.portion || 100}${food.portionUnit || 'g'})\n`;
      }
    });

    // Add dietary restrictions and allergies
    userPrompt += "\nRESTRIÇÕES DIETÉTICAS E ALERGIAS:\n";
    if (dietaryPreferences.hasAllergies && dietaryPreferences.allergies && dietaryPreferences.allergies.length > 0) {
      userPrompt += `- Alergias: ${dietaryPreferences.allergies.join(', ')}\n`;
    } else {
      userPrompt += "- Sem alergias reportadas\n";
    }

    if (dietaryPreferences.dietaryRestrictions && dietaryPreferences.dietaryRestrictions.length > 0) {
      userPrompt += `- Restrições: ${dietaryPreferences.dietaryRestrictions.join(', ')}\n`;
    } else {
      userPrompt += "- Sem restrições dietéticas específicas\n";
    }

    // Add training time if available
    if (dietaryPreferences.trainingTime) {
      userPrompt += `\nHORÁRIO DE TREINO: ${dietaryPreferences.trainingTime}\n`;
    }

    // Add custom food categorization by meal type if available
    if (foodsByMealType && Object.keys(foodsByMealType).length > 0) {
      userPrompt += "\nCATEGORIZAÇÃO DE ALIMENTOS POR REFEIÇÃO:\n";
      
      for (const [mealType, foods] of Object.entries(foodsByMealType)) {
        if (Array.isArray(foods) && foods.length > 0) {
          const mealTypeLabels = {
            breakfast: "Café da Manhã",
            lunch: "Almoço",
            dinner: "Jantar",
            snack: "Lanches"
          };
          
          const mealLabel = mealTypeLabels[mealType as keyof typeof mealTypeLabels] || mealType;
          
          userPrompt += `- ${mealLabel}: `;
          
          // Get food names based on the food IDs in this meal type
          const foodNames = foods.map(foodId => {
            const food = selectedFoods.find(f => f.id === foodId || f.name === foodId);
            return food ? food.name : foodId;
          }).filter(name => name);
          
          userPrompt += foodNames.join(', ') + '\n';
        }
      }
    }

    // Add expected output format
    userPrompt += `
RESULTADO ESPERADO:
Crie um cardápio semanal completo com refeições para 7 dias (segunda a domingo) na estrutura JSON abaixo. 
Use apenas os alimentos que o usuário selecionou.
Distribua as calorias diárias conforme o objetivo do usuário.
Inclua recomendações específicas para antes e após o treino.

FORMATO JSON ESPERADO:
{
  "weeklyPlan": {
    "monday": {
      "dayName": "Segunda-feira",
      "meals": {
        "breakfast": {
          "foods": [{"name": "Nome do alimento", "portion": 100, "unit": "g", "details": "Detalhes nutricionais"}],
          "calories": 500,
          "macros": {"protein": 30, "carbs": 60, "fats": 15, "fiber": 8},
          "description": "Descrição da refeição"
        },
        "morningSnack": { ... formato similar ao breakfast ... },
        "lunch": { ... formato similar ao breakfast ... },
        "afternoonSnack": { ... formato similar ao breakfast ... },
        "dinner": { ... formato similar ao breakfast ... }
      },
      "dailyTotals": {
        "calories": 2000,
        "protein": 150,
        "carbs": 200,
        "fats": 70,
        "fiber": 30
      }
    },
    ... similar structure for tuesday through sunday ...
  },
  "weeklyTotals": {
    "averageCalories": 2000,
    "averageProtein": 150,
    "averageCarbs": 200,
    "averageFats": 70,
    "averageFiber": 30
  },
  "recommendations": {
    "general": "Recomendações gerais sobre alimentação",
    "preworkout": "O que comer antes do treino",
    "postworkout": "O que comer após o treino",
    "timing": ["Dica 1 sobre tempo de alimentação", "Dica 2 sobre tempo de alimentação"]
  }
}

Importante: O resultado deve ser apenas o JSON válido, sem texto antes ou depois.`;

    // Log the prompt (truncated for logs)
    console.log(`Prompt de sistema: ${systemPrompt.substring(0, 100)}...`);
    console.log(`Prompt do usuário: ${userPrompt.substring(0, 100)}...`);

    // Get Groq API key
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY não definida nas variáveis de ambiente');
    }

    // Set up messages array for Groq API
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ];

    console.log(`Enviando requisição para Groq API usando modelo Mistral Saba 24B...`);
    
    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "mistral-saba-24b", // Always use Mistral Saba 24B which is excellent for structured output
        messages: messages,
        response_format: { type: "json_object" }, // Ensure JSON response
        temperature: 0.7,
        max_tokens: 4000, // Need plenty of tokens for the full meal plan
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Erro na resposta da Groq API: ${response.status} ${response.statusText}`);
      console.error(`Detalhes do erro: ${errorData}`);
      throw new Error(`Erro na resposta da Groq API: ${response.status} ${response.statusText}`);
    }

    // Parse Groq API response
    const groqResponse = await response.json();
    console.log('Resposta recebida da Groq API');
    
    if (!groqResponse.choices || !groqResponse.choices[0] || !groqResponse.choices[0].message) {
      console.error('Formato inválido de resposta da Groq API:', groqResponse);
      throw new Error('Formato inválido de resposta da Groq API');
    }

    // Extract JSON content from Groq response
    const aiResponseContent = groqResponse.choices[0].message.content;
    console.log(`Resposta da IA (primeiros 100 caracteres): ${aiResponseContent.substring(0, 100)}...`);

    // Parse the JSON from the AI response content
    let mealPlan;
    try {
      // Extract JSON from the response - handle potential text before or after JSON
      let jsonContent = aiResponseContent;
      
      // Find JSON opening brace and closing brace
      const startIndex = jsonContent.indexOf('{');
      const endIndex = jsonContent.lastIndexOf('}') + 1;
      
      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        jsonContent = jsonContent.substring(startIndex, endIndex);
      }
      
      // Now try to parse it
      mealPlan = JSON.parse(jsonContent);
      console.log('JSON do plano alimentar extraído com sucesso');
    } catch (error) {
      console.error('Erro ao extrair JSON da resposta:', error);
      console.error('Conteúdo que falhou ao analisar:', aiResponseContent);
      throw new Error(`Erro ao analisar JSON da resposta: ${error.message}`);
    }

    // Add user calories to the meal plan for reference
    mealPlan.userCalories = userData.dailyCalories;

    // Save meal plan to database if userId is provided
    if (userData.userId) {
      try {
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        console.log(`Salvando plano alimentar para usuário ${userData.userId}`);
        
        // Insert meal plan into database
        const { error } = await supabase
          .from('meal_plans')
          .insert({
            user_id: userData.userId,
            plan_data: mealPlan,
            calories: userData.dailyCalories,
            dietary_preferences: dietaryPreferences
          });
          
        if (error) {
          console.error('Erro ao salvar plano alimentar no banco de dados:', error);
          // Continue execution despite database error
        } else {
          console.log('Plano alimentar salvo com sucesso no banco de dados');
        }
      } catch (dbError) {
        console.error('Erro no acesso ao banco de dados:', dbError);
        // Continue execution despite database error
      }
    }

    // Return the response
    console.log('Retornando resposta com o plano alimentar gerado');
    return new Response(
      JSON.stringify({
        mealPlan: mealPlan,
        message: 'Plano alimentar gerado com sucesso usando Mistral Saba 24B',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Erro na função generate-meal-plan-groq:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({
        error: `Erro ao gerar plano alimentar: ${error.message}`,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});
