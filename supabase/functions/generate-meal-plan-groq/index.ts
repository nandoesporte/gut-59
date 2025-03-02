
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseClient } from "../_shared/supabase-client.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userData, 
      selectedFoods, 
      foodsByMealType,
      preferences
    } = await req.json();

    console.log("Gerando plano alimentar com llama3-8b-8192 via Groq");
    console.log("Dados do usuário:", JSON.stringify(userData));
    console.log("Preferências:", JSON.stringify(preferences));
    
    // Validate required data
    if (!userData || !selectedFoods || !preferences) {
      throw new Error("Dados insuficientes para gerar o plano alimentar");
    }

    // Prepare food information grouped by meal types
    const formattedFoodsByMealType = Object.entries(foodsByMealType || {}).map(([mealType, foods]) => {
      return `${mealType.charAt(0).toUpperCase() + mealType.slice(1)}: ${foods.join(', ')}`;
    }).join('\n');

    // Build the list of all selected foods with their nutritional info
    const selectedFoodsDetails = selectedFoods.map(food => {
      return `- ${food.name}: ${food.calories} calorias, Proteínas: ${food.protein}g, Carboidratos: ${food.carbs}g, Gorduras: ${food.fats}g, Fibras: ${food.fiber || 0}g`;
    }).join('\n');

    // Allergies and dietary restrictions
    const allergies = preferences.hasAllergies ? 
      `Alergias: ${preferences.allergies.join(', ')}` : 
      'Sem alergias';
      
    const restrictions = preferences.dietaryRestrictions?.length > 0 ? 
      `Restrições alimentares: ${preferences.dietaryRestrictions.join(', ')}` : 
      'Sem restrições alimentares';

    // Training time
    const trainingTime = preferences.trainingTime ? 
      `Horário de treino: ${preferences.trainingTime}` : 
      'Sem horário de treino específico';

    // Format prompt for the meal plan generation
    const prompt = `
# Instrução
Crie um plano alimentar personalizado de 7 dias baseado nos seguintes dados:

## Informações do Usuário
- Peso: ${userData.weight}kg
- Altura: ${userData.height}cm
- Idade: ${userData.age} anos
- Gênero: ${userData.gender === 'male' ? 'Masculino' : 'Feminino'}
- Nível de Atividade: ${userData.activityLevel}
- Objetivo: ${userData.goal}
- Calorias Diárias Necessárias: ${userData.dailyCalories} kcal

## Alimentos Preferidos por Refeição
${formattedFoodsByMealType}

## Alimentos Selecionados e Informações Nutricionais
${selectedFoodsDetails}

## Restrições e Preferências
- ${allergies}
- ${restrictions}
- ${trainingTime}

## Estrutura do Plano Alimentar
Crie um plano alimentar para 7 dias (segunda a domingo), com as seguintes refeições diárias:
1. Café da manhã
2. Lanche da manhã
3. Almoço
4. Lanche da tarde
5. Jantar

Para cada dia:
- Especifique os alimentos para cada refeição
- Detalhe as porções em gramas ou unidades
- Calcule as calorias e macronutrientes (proteínas, carboidratos, gorduras, fibras) de cada refeição
- Calcule o total diário de calorias e macronutrientes
- O total diário deve estar próximo das calorias diárias necessárias (${userData.dailyCalories} kcal)

## Recomendações Adicionais
Inclua:
1. Recomendações gerais para o plano alimentar
2. Sugestões específicas para refeições pré-treino
3. Sugestões específicas para refeições pós-treino
4. Dicas sobre timing alimentar

## Formato de Resposta
Responda APENAS com um objeto JSON válido com a seguinte estrutura:
{
  "userCalories": número,
  "weeklyPlan": {
    "monday": {
      "dayName": "Segunda",
      "meals": {
        "breakfast": {
          "description": "Café da Manhã",
          "foods": [{"name": string, "portion": número, "unit": string, "details": string}],
          "calories": número,
          "macros": {"protein": número, "carbs": número, "fats": número, "fiber": número}
        },
        "morningSnack": {},
        "lunch": {},
        "afternoonSnack": {},
        "dinner": {}
      },
      "dailyTotals": {"calories": número, "protein": número, "carbs": número, "fats": número, "fiber": número}
    },
    "tuesday": {},
    "wednesday": {},
    "thursday": {},
    "friday": {},
    "saturday": {},
    "sunday": {}
  },
  "weeklyTotals": {
    "averageCalories": número,
    "averageProtein": número,
    "averageCarbs": número,
    "averageFats": número,
    "averageFiber": número
  },
  "recommendations": {
    "general": string,
    "preworkout": string,
    "postworkout": string,
    "timing": [string]
  }
}

Certifique-se de que os números são números (e não strings). O JSON deve ser válido e todos os campos listados devem estar preenchidos.
`;

    console.log("Enviando prompt para o modelo llama3-8b-8192");

    // Call Groq API to generate the meal plan
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { 
            role: "system", 
            content: "Você é um nutricionista especializado em criar planos alimentares personalizados. Você sempre responde apenas com JSON válido, sem explicações ou texto adicional."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na chamada da API do Groq (${response.status}):`, errorText);
      throw new Error(`Erro na API: ${response.status} ${errorText}`);
    }

    const groqResponse = await response.json();
    console.log("Resposta recebida da API do Groq");

    if (!groqResponse.choices || !groqResponse.choices[0] || !groqResponse.choices[0].message) {
      console.error("Formato de resposta inesperado:", groqResponse);
      throw new Error("Formato de resposta inesperado");
    }

    let mealPlanJson = groqResponse.choices[0].message.content;
    console.log("Conteúdo da resposta:", mealPlanJson);

    // Try to parse the JSON response
    let mealPlan;
    try {
      // First, check if the response is already a string or if it's an object
      if (typeof mealPlanJson === 'string') {
        // Clean up the response if it contains markdown code blocks
        if (mealPlanJson.includes('```json')) {
          mealPlanJson = mealPlanJson.replace(/```json\n|\n```/g, '');
        }
        
        mealPlan = JSON.parse(mealPlanJson);
      } else if (typeof mealPlanJson === 'object') {
        mealPlan = mealPlanJson;
      } else {
        throw new Error("Formato de resposta inválido");
      }
    } catch (parseError) {
      console.error("Erro ao analisar JSON:", parseError);
      console.error("Conteúdo JSON problemático:", mealPlanJson);
      throw new Error("Erro ao processar resposta: " + parseError.message);
    }

    // Save the meal plan to the database if user is authenticated
    if (userData.id) {
      const supabase = supabaseClient();
      
      // Check if the user has reached the plan generation limit
      const { data: planCount, error: countError } = await supabase
        .from('plan_generation_counts')
        .select('count, last_reset_date')
        .eq('user_id', userData.id)
        .eq('plan_type', 'meal_plan')
        .maybeSingle();
        
      if (countError) {
        console.error("Erro ao verificar contagem de planos:", countError);
      }

      // Save the meal plan
      const { error: insertError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: userData.id,
          plan_data: mealPlan,
          calories: userData.dailyCalories,
          preferences: {
            weight: userData.weight,
            height: userData.height,
            age: userData.age,
            gender: userData.gender,
            activity_level: userData.activityLevel,
            goal: userData.goal,
            dietary_restrictions: preferences.dietaryRestrictions,
            allergies: preferences.allergies,
            selected_foods: selectedFoods.map(food => food.id)
          }
        });

      if (insertError) {
        console.error("Erro ao salvar plano alimentar:", insertError);
      } else {
        console.log("Plano alimentar salvo com sucesso!");
      
        // Update the plan generation count
        const now = new Date().toISOString();
        if (planCount) {
          await supabase
            .from('plan_generation_counts')
            .update({
              count: planCount.count + 1,
              last_generated_date: now
            })
            .eq('user_id', userData.id)
            .eq('plan_type', 'meal_plan');
        } else {
          await supabase
            .from('plan_generation_counts')
            .insert({
              user_id: userData.id,
              plan_type: 'meal_plan',
              count: 1,
              last_generated_date: now,
              last_reset_date: now
            });
        }
      }
    }

    return new Response(
      JSON.stringify(mealPlan),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erro completo:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Ocorreu um erro ao gerar o plano alimentar"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
