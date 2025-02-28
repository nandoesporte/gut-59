
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { calculateDailyCalories } from "./calculators.ts";
import { validateInput } from "./validator.ts";
import { generateRecommendations } from "./recommendations.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const groqApiKey = Deno.env.get('GROQ_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando solicitação para geração de plano alimentar");
    const { userData, selectedFoods, dietaryPreferences } = await req.json();

    console.log("Validando dados de entrada");
    validateInput(userData, selectedFoods, dietaryPreferences);
    
    // Calcular calorias se não estiver definido nos dados do usuário
    if (!userData.dailyCalories || userData.dailyCalories <= 0) {
      console.log("Calculando necessidades calóricas diárias");
      userData.dailyCalories = calculateDailyCalories(
        userData.weight,
        userData.height,
        userData.age,
        userData.gender,
        userData.activityLevel,
        userData.goal
      );
      console.log(`Calorias diárias calculadas: ${userData.dailyCalories} kcal`);
    } else {
      console.log(`Calorias diárias fornecidas: ${userData.dailyCalories} kcal`);
    }

    // Gerar o plano alimentar
    console.log("Iniciando geração do plano alimentar");
    const generatedMealPlan = await generateMealPlan(userData, selectedFoods, dietaryPreferences);

    return new Response(JSON.stringify({ 
      mealPlan: generatedMealPlan 
    }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      }
    });
  } catch (error) {
    console.error("Erro no processamento da solicitação:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Erro interno no servidor" 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      }
    });
  }
});

async function generateMealPlan(userData, selectedFoods, dietaryPreferences) {
  try {
    console.log("Tentando gerar plano com o modelo Llama via Groq");
    const result = await generateWithLlama(userData, selectedFoods, dietaryPreferences);
    return result;
  } catch (llamaError) {
    console.error("Erro ao gerar plano com o modelo Llama:", llamaError);
    
    try {
      console.log("Tentando gerar plano com OpenAI como alternativa");
      const result = await generateWithOpenAI(userData, selectedFoods, dietaryPreferences);
      return result;
    } catch (openaiError) {
      console.error("Erro ao gerar plano com OpenAI:", openaiError);
      
      // Se ambos os modelos falharem, tente um plano básico
      console.log("Gerando plano básico com dados locais");
      return generateBasicMealPlan(userData, selectedFoods, dietaryPreferences);
    }
  }
}

async function generateWithLlama(userData, selectedFoods, dietaryPreferences) {
  try {
    console.log("Preparando dados para o modelo Llama");
    
    // Simplificar os alimentos para reduzir o tamanho da entrada
    const simplifiedFoods = selectedFoods.map(food => ({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      food_group_id: food.food_group_id
    }));

    // Construir o prompt para o modelo
    const prompt = generateMealPlanPrompt(userData, simplifiedFoods, dietaryPreferences);
    
    console.log("Enviando requisição para llama-completion");
    const llamaResponse = await fetch(`${req.url.split('/generate-meal-plan')[0]}/llama-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 4000,
        temperature: 0.7
      })
    });

    if (!llamaResponse.ok) {
      const errorData = await llamaResponse.json();
      throw new Error(`Erro na chamada da função llama-completion: ${JSON.stringify(errorData)}`);
    }

    const data = await llamaResponse.json();
    console.log("Resposta recebida do modelo Llama");

    if (!data.completion) {
      throw new Error("Falha ao processar a resposta do modelo");
    }

    // Processar o JSON gerado pelo modelo
    try {
      // Tente extrair o JSON da resposta
      const jsonStart = data.completion.indexOf('{');
      const jsonEnd = data.completion.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
        throw new Error("Formato JSON inválido na resposta");
      }
      
      const jsonStr = data.completion.substring(jsonStart, jsonEnd);
      const mealPlan = JSON.parse(jsonStr);
      
      // Adicionar recomendações
      mealPlan.recommendations = generateRecommendations(
        userData.dailyCalories,
        userData.goal,
        dietaryPreferences.trainingTime
      );
      
      return mealPlan;
    } catch (jsonError) {
      console.error("Erro ao processar JSON da resposta:", jsonError);
      throw new Error("Falha ao processar o JSON do plano alimentar");
    }
  } catch (error) {
    console.error("Erro ao gerar com Llama:", error);
    throw error;
  }
}

async function generateWithOpenAI(userData, selectedFoods, dietaryPreferences) {
  if (!openAIApiKey) {
    throw new Error("API key do OpenAI não configurada");
  }

  console.log("Preparando dados para o modelo OpenAI");
  
  // Simplificar os alimentos para reduzir o tamanho da entrada
  const simplifiedFoods = selectedFoods.slice(0, 40).map(food => ({
    name: food.name,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fats: food.fats,
    food_group_id: food.food_group_id
  }));

  // Construir o prompt para o modelo
  const prompt = generateMealPlanPrompt(userData, simplifiedFoods, dietaryPreferences);
  
  try {
    console.log("Enviando requisição para OpenAI");
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um nutricionista especializado em criar planos alimentares personalizados. Responda apenas com o objeto JSON conforme solicitado, sem texto adicional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro na API do OpenAI: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("Resposta recebida do modelo OpenAI");

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error("Resposta inválida do OpenAI");
    }

    // Processar o JSON gerado pelo modelo
    try {
      // Tente extrair o JSON da resposta
      const content = data.choices[0].message.content;
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
        throw new Error("Formato JSON inválido na resposta");
      }
      
      const jsonStr = content.substring(jsonStart, jsonEnd);
      const mealPlan = JSON.parse(jsonStr);
      
      // Adicionar recomendações
      mealPlan.recommendations = generateRecommendations(
        userData.dailyCalories,
        userData.goal,
        dietaryPreferences.trainingTime
      );
      
      return mealPlan;
    } catch (jsonError) {
      console.error("Erro ao processar JSON da resposta do OpenAI:", jsonError);
      throw new Error("Falha ao processar o JSON do plano alimentar do OpenAI");
    }
  } catch (error) {
    console.error("Erro ao gerar com OpenAI:", error);
    throw error;
  }
}

function generateBasicMealPlan(userData, selectedFoods, dietaryPreferences) {
  console.log("Gerando plano alimentar básico");
  
  // Função para selecionar alimentos aleatórios do grupo
  function getRandomFoods(foods, count = 3) {
    const shuffled = [...foods].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
  
  // Agrupar alimentos por categoria
  const proteinFoods = selectedFoods.filter(f => f.protein / f.calories > 0.2);
  const carbFoods = selectedFoods.filter(f => f.carbs / f.calories > 0.3);
  const fatFoods = selectedFoods.filter(f => f.fats / f.calories > 0.3);
  const vegFoods = selectedFoods.filter(f => f.food_group_id === 1 || f.food_group_id === 3);
  
  // Criar refeição básica
  function createMeal(title, calorias) {
    const proteins = getRandomFoods(proteinFoods, 1);
    const carbs = getRandomFoods(carbFoods, 1);
    const fats = getRandomFoods(fatFoods, 1);
    const veggies = getRandomFoods(vegFoods, 1);
    
    const selectedFoods = [...proteins, ...carbs, ...fats, ...veggies];
    
    const mealFoods = selectedFoods.map(food => ({
      name: food.name,
      portion: Math.round((calorias / selectedFoods.length) / (food.calories / 100)),
      unit: "g",
      details: `Fonte de ${food.protein > food.carbs && food.protein > food.fats ? 'proteína' : 
                food.carbs > food.protein && food.carbs > food.fats ? 'carboidrato' : 'gordura'}`
    }));
    
    return {
      description: `${title} balanceada com aproximadamente ${calorias} calorias.`,
      foods: mealFoods,
      calories: calorias,
      macros: {
        protein: Math.round(selectedFoods.reduce((sum, food) => sum + food.protein, 0) / selectedFoods.length * 3),
        carbs: Math.round(selectedFoods.reduce((sum, food) => sum + food.carbs, 0) / selectedFoods.length * 3),
        fats: Math.round(selectedFoods.reduce((sum, food) => sum + food.fats, 0) / selectedFoods.length * 3),
        fiber: Math.round(selectedFoods.reduce((sum, food) => sum + (food.fiber || 0), 0) / selectedFoods.length * 3)
      }
    };
  }
  
  // Distribuir calorias entre as refeições
  const totalCalorias = userData.dailyCalories;
  const breakfastCal = Math.round(totalCalorias * 0.25);
  const morningSnackCal = Math.round(totalCalorias * 0.1);
  const lunchCal = Math.round(totalCalorias * 0.3);
  const afternoonSnackCal = Math.round(totalCalorias * 0.1);
  const dinnerCal = Math.round(totalCalorias * 0.25);
  
  // Criar plano para um dia
  function createDayPlan(dayName) {
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
      dayName,
      meals: {
        breakfast,
        morningSnack,
        lunch,
        afternoonSnack,
        dinner
      },
      dailyTotals: {
        calories: totalCalorias,
        protein: totalProtein,
        carbs: totalCarbs,
        fats: totalFats,
        fiber: totalFiber
      }
    };
  }
  
  // Criar plano semanal
  const weeklyPlan = {
    monday: createDayPlan("Segunda-feira"),
    tuesday: createDayPlan("Terça-feira"),
    wednesday: createDayPlan("Quarta-feira"),
    thursday: createDayPlan("Quinta-feira"),
    friday: createDayPlan("Sexta-feira"),
    saturday: createDayPlan("Sábado"),
    sunday: createDayPlan("Domingo")
  };
  
  // Calcular médias semanais
  const days = Object.values(weeklyPlan);
  const weeklyTotals = {
    averageCalories: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.calories, 0) / days.length),
    averageProtein: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.protein, 0) / days.length),
    averageCarbs: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.carbs, 0) / days.length),
    averageFats: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.fats, 0) / days.length),
    averageFiber: Math.round(days.reduce((sum, day) => sum + day.dailyTotals.fiber, 0) / days.length)
  };
  
  // Adicionar recomendações
  const recommendations = generateRecommendations(
    userData.dailyCalories,
    userData.goal,
    dietaryPreferences.trainingTime
  );
  
  return {
    weeklyPlan,
    weeklyTotals,
    recommendations
  };
}

function generateMealPlanPrompt(userData, selectedFoods, dietaryPreferences) {
  // Mapear nome dos grupos alimentares
  const foodGroups = {
    1: "Verduras e Legumes",
    2: "Frutas",
    3: "Grãos e Cereais",
    4: "Proteínas Animais",
    5: "Proteínas Vegetais",
    6: "Laticínios",
    7: "Gorduras",
    8: "Condimentos",
    9: "Bebidas",
    10: "Outros"
  };

  // Formatar alimentos com seus grupos
  const formattedFoods = selectedFoods.map(food => {
    return {
      ...food,
      group: foodGroups[food.food_group_id] || "Outros"
    };
  });

  // Calcular macros ideais baseados nas calorias e objetivo
  const idealMacros = {
    protein: 0,
    carbs: 0,
    fats: 0
  };

  switch (userData.goal) {
    case "lose_weight":
      idealMacros.protein = Math.round(userData.weight * 2); // 2g por kg
      idealMacros.fats = Math.round(userData.weight * 1); // 1g por kg
      idealMacros.carbs = Math.round((userData.dailyCalories - (idealMacros.protein * 4 + idealMacros.fats * 9)) / 4);
      break;
    case "gain_weight":
      idealMacros.protein = Math.round(userData.weight * 2); // 2g por kg
      idealMacros.fats = Math.round(userData.weight * 1); // 1g por kg
      idealMacros.carbs = Math.round((userData.dailyCalories - (idealMacros.protein * 4 + idealMacros.fats * 9)) / 4);
      break;
    default: // maintain
      idealMacros.protein = Math.round(userData.weight * 1.8); // 1.8g por kg
      idealMacros.fats = Math.round(userData.weight * 1); // 1g por kg
      idealMacros.carbs = Math.round((userData.dailyCalories - (idealMacros.protein * 4 + idealMacros.fats * 9)) / 4);
  }

  // Construir o prompt
  return `
Você é um nutricionista especializado em criar planos alimentares personalizados.

## DADOS DO USUÁRIO:
- Peso: ${userData.weight} kg
- Altura: ${userData.height} cm
- Idade: ${userData.age} anos
- Gênero: ${userData.gender === 'male' ? 'Masculino' : 'Feminino'}
- Nível de Atividade: ${userData.activityLevel}
- Objetivo: ${userData.goal}
- Calorias Diárias: ${userData.dailyCalories} kcal

## MACRONUTRIENTES IDEAIS:
- Proteínas: ${idealMacros.protein}g
- Carboidratos: ${idealMacros.carbs}g
- Gorduras: ${idealMacros.fats}g

## PREFERÊNCIAS DIETÉTICAS:
${dietaryPreferences.hasAllergies ? `- Alergias: ${dietaryPreferences.allergies.join(', ')}` : '- Sem alergias'}
${dietaryPreferences.dietaryRestrictions?.length > 0 ? `- Restrições: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : '- Sem restrições alimentares'}
${dietaryPreferences.trainingTime ? `- Horário de Treino: ${dietaryPreferences.trainingTime}` : '- Sem treino'}

## ALIMENTOS DISPONÍVEIS POR GRUPO:
${Object.entries(foodGroups)
  .map(([groupId, groupName]) => {
    const groupFoods = formattedFoods.filter(food => food.food_group_id === parseInt(groupId));
    if (groupFoods.length === 0) return null;
    
    return `### ${groupName}:
${groupFoods.map(food => `- ${food.name}: ${food.calories} kcal, ${food.protein}g proteína, ${food.carbs}g carboidratos, ${food.fats}g gorduras`).join('\n')}`;
  })
  .filter(Boolean)
  .join('\n\n')}

## ESTRUTURA DE SAÍDA
Crie um plano alimentar semanal para 7 dias apresentado em formato JSON:

{
  "weeklyPlan": {
    "monday": {
      "dayName": "Segunda-feira",
      "meals": {
        "breakfast": {
          "description": "string",
          "foods": [
            {
              "name": "string",
              "portion": number,
              "unit": "g | ml | unidade | colher",
              "details": "string"
            }
          ],
          "calories": number,
          "macros": {
            "protein": number,
            "carbs": number,
            "fats": number,
            "fiber": number
          }
        },
        "morningSnack": { ... mesmo formato do breakfast },
        "lunch": { ... mesmo formato do breakfast },
        "afternoonSnack": { ... mesmo formato do breakfast },
        "dinner": { ... mesmo formato do breakfast }
      },
      "dailyTotals": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number,
        "fiber": number
      }
    },
    ... os outros dias da semana no mesmo formato
  },
  "weeklyTotals": {
    "averageCalories": number,
    "averageProtein": number,
    "averageCarbs": number,
    "averageFats": number,
    "averageFiber": number
  }
}

### INSTRUÇÕES IMPORTANTES:
1. Distribua as calorias diárias entre as refeições, considerando o objetivo do usuário.
2. Utilize apenas os alimentos da lista fornecida.
3. Evite alimentos aos quais o usuário tem alergia ou restrição.
4. Adeque as refeições ao horário de treino, se fornecido.
5. Varie os alimentos ao longo da semana.
6. Siga estritamente o formato JSON solicitado.
7. Inclua porções realistas para cada alimento (em gramas, ml, unidades ou colheres).
8. Adicione detalhes sobre como preparar ou combinar os alimentos.

Apenas responda com o JSON do plano alimentar, sem texto adicional.
`;
}
