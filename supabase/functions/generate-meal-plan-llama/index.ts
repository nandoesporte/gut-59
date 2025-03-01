
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  return null;
}

// Main function to handle requests
serve(async (req) => {
  console.log("Received request to generate meal plan with Nous-Hermes-2-Mixtral-8x7B-DPO model");
  
  // Handle CORS preflight request
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Parse request data
    const requestData = await req.json();
    
    // Extract request components
    const { 
      userData, 
      selectedFoods, 
      foodsByMealType, 
      dietaryPreferences 
    } = requestData;
    
    console.log("Request received with data:", {
      userDataPresent: !!userData,
      selectedFoodsCount: selectedFoods?.length || 0,
      dietaryPreferencesPresent: !!dietaryPreferences
    });
    
    // Validate required fields
    if (!userData || !userData.dailyCalories || !selectedFoods || selectedFoods.length === 0) {
      console.error("Invalid request data: missing required fields");
      return new Response(
        JSON.stringify({ 
          error: "Dados incompletos. Por favor, forneça as informações básicas e selecione alguns alimentos." 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using model configuration: Nous-Hermes-2-Mixtral-8x7B-DPO`);
    
    // Get the Groq API key from environment variables
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }
    
    // Construct the prompt for the model
    const prompt = constructPrompt(userData, selectedFoods, foodsByMealType, dietaryPreferences);
    
    console.log("Sending request to Groq API with Nous-Hermes-2-Mixtral-8x7B-DPO model");
    
    // Define model - using Nous-Hermes-2-Mixtral-8x7B-DPO model which is available in Groq
    const modelName = "nous-hermes-2-mixtral-8x7b-dpo";
    
    // Prepare the message for the chat API
    const messages = [
      {
        role: "system", 
        content: "You are a professional nutritionist specialized in creating personalized meal plans. You provide detailed, accurate, and structured meal plans in JSON format."
      },
      { 
        role: "user", 
        content: prompt 
      }
    ];

    // Make the request to Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.3,
        response_format: { "type": "json_object" }
      })
    });
    
    // Parse the response
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Error from Groq API:', responseData);
      return new Response(
        JSON.stringify({ 
          error: "Falha ao gerar o plano alimentar. Por favor, tente novamente.", 
          details: responseData 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Extract and parse the content
    console.log('Groq API response received, extracting content');
    
    const llmResponse = responseData.choices[0]?.message?.content;
    if (!llmResponse) {
      throw new Error('Unexpected response format from Groq API');
    }
    
    // Log truncated response for debugging
    console.log('Response from LLM (truncated):', llmResponse.substring(0, 300) + '...');
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // First try to parse directly
      parsedResponse = JSON.parse(llmResponse);
      console.log('Successfully parsed JSON directly from LLM response');
    } catch (parseError) {
      console.error('Error parsing direct JSON response:', parseError);
      
      // If direct parsing fails, try to extract JSON using regex
      try {
        const jsonMatch = llmResponse.match(/(\{[\s\S]*\})/);
        if (jsonMatch && jsonMatch[0]) {
          parsedResponse = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted and parsed JSON using regex');
        } else {
          throw new Error('Could not extract JSON from response');
        }
      } catch (extractError) {
        console.error('Error extracting JSON with regex:', extractError);
        throw new Error('Failed to parse meal plan from response');
      }
    }
    
    // Extract the meal plan from the parsed response
    const mealPlan = parsedResponse.mealPlan || parsedResponse;
    
    // Validate the meal plan structure
    if (!mealPlan.weeklyPlan) {
      console.error('Invalid meal plan structure:', mealPlan);
      throw new Error('The generated meal plan is missing required structure');
    }
    
    // Add the user's daily calories to the response
    mealPlan.userCalories = userData.dailyCalories;
    
    console.log("Successfully generated meal plan with Nous-Hermes-2-Mixtral-8x7B-DPO model");
    
    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-meal-plan-llama function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Ocorreu um erro ao gerar o plano alimentar.' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Function to construct a detailed prompt for the meal plan generation
function constructPrompt(
  userData: any, 
  selectedFoods: any[], 
  foodsByMealType: any,
  dietaryPreferences: any
): string {
  const {
    weight,
    height,
    age,
    gender,
    activityLevel,
    goal,
    dailyCalories
  } = userData;
  
  // Format the list of selected foods
  const formattedFoods = selectedFoods.map(food => {
    return `- ${food.name} (${food.calories} kcal, Proteínas: ${food.protein}g, Carboidratos: ${food.carbs}g, Gorduras: ${food.fats}g${food.fiber ? `, Fibras: ${food.fiber}g` : ''})`;
  }).join('\n');
  
  // Format foods by meal type if provided
  let formattedFoodsByMeal = '';
  if (foodsByMealType) {
    const mealTypes = Object.keys(foodsByMealType);
    formattedFoodsByMeal = mealTypes.map(mealType => {
      const foods = foodsByMealType[mealType];
      if (!foods || foods.length === 0) return '';
      
      const foodsList = foods.map((food: any) => `- ${food.name}`).join('\n');
      return `${mealType.toUpperCase()}:\n${foodsList}`;
    }).filter(Boolean).join('\n\n');
  }
  
  // Extract dietary preferences
  const allergies = dietaryPreferences?.allergies || [];
  const dietaryRestrictions = dietaryPreferences?.dietaryRestrictions || [];
  const trainingTime = dietaryPreferences?.trainingTime || null;
  
  // Construct the complete prompt
  return `Crie um plano alimentar personalizado em português (Brasil) com base nas seguintes informações:

INFORMAÇÕES DO USUÁRIO:
- Peso: ${weight} kg
- Altura: ${height} cm
- Idade: ${age} anos
- Gênero: ${gender === 'male' ? 'Masculino' : 'Feminino'}
- Nível de Atividade: ${activityLevel}
- Objetivo: ${goal === 'lose_weight' ? 'Perder peso' : goal === 'gain_weight' ? 'Ganhar peso' : 'Manter peso'}
- Calorias Diárias Recomendadas: ${dailyCalories} kcal

PREFERÊNCIAS ALIMENTARES:
${formattedFoods}

${formattedFoodsByMeal ? `ALIMENTOS CATEGORIZADOS POR REFEIÇÃO:\n${formattedFoodsByMeal}\n` : ''}

${allergies.length > 0 ? `ALERGIAS:\n- ${allergies.join('\n- ')}\n` : 'ALERGIAS: Nenhuma\n'}

${dietaryRestrictions.length > 0 ? `RESTRIÇÕES DIETÉTICAS:\n- ${dietaryRestrictions.join('\n- ')}\n` : 'RESTRIÇÕES DIETÉTICAS: Nenhuma\n'}

${trainingTime ? `HORÁRIO DE TREINO: ${trainingTime}\n` : ''}

INSTRUÇÕES:
1. Crie um plano alimentar para uma semana completa (segunda a domingo).
2. Para cada dia, inclua 5 refeições: café da manhã, lanche da manhã, almoço, lanche da tarde e jantar.
3. Cada refeição deve ter uma lista de alimentos com porções em gramas.
4. Para cada dia, calcule os totais de calorias, proteínas, carboidratos, gorduras e fibras.
5. Inclua recomendações gerais, pré-treino e pós-treino.
6. O total de calorias diárias deve ser próximo ao valor recomendado.
7. Utilize preferencialmente os alimentos listados nas preferências alimentares.
8. Evite completamente qualquer alergia mencionada.
9. Respeite as restrições dietéticas informadas.

A resposta deve estar em formato JSON estruturado assim:

{
  "mealPlan": {
    "weeklyPlan": {
      "monday": {
        "dayName": "Segunda-feira",
        "meals": {
          "breakfast": {
            "foods": [
              {"name": "Alimento", "portion": 100, "unit": "g", "details": "Informação nutricional"}
            ],
            "calories": 400,
            "macros": {"protein": 20, "carbs": 30, "fats": 15, "fiber": 5},
            "description": "Descrição da refeição"
          },
          "morningSnack": {},
          "lunch": {},
          "afternoonSnack": {},
          "dinner": {}
        },
        "dailyTotals": {"calories": 2000, "protein": 150, "carbs": 200, "fats": 70, "fiber": 30}
      },
      "tuesday": {},
      "wednesday": {},
      "thursday": {},
      "friday": {},
      "saturday": {},
      "sunday": {}
    },
    "weeklyTotals": {
      "averageCalories": 2000,
      "averageProtein": 150,
      "averageCarbs": 200,
      "averageFats": 70,
      "averageFiber": 30
    },
    "recommendations": {
      "general": "Recomendações gerais sobre alimentação saudável",
      "preworkout": "Recomendações para alimentação pré-treino",
      "postworkout": "Recomendações para alimentação pós-treino",
      "timing": "Orientações sobre horários das refeições"
    }
  }
}

Importante: Retorne APENAS o JSON sem textos adicionais, explicações ou código markdown.`;
}
