
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Obter chaves de API dos ambientes
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const llamaAPIKey = Deno.env.get('LLAMA_API_KEY');
const groqAPIKey = Deno.env.get('GROQ_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando agente Nutri+");
    const requestData = await req.json();
    
    if (!requestData || !requestData.userData || !requestData.selectedFoods) {
      throw new Error("Dados de requisição incompletos. Verifique os parâmetros obrigatórios.");
    }
    
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences, modelConfig } = requestData;
    
    console.log("Dados recebidos:", {
      userData: {
        weight: userData.weight,
        height: userData.height,
        age: userData.age,
        gender: userData.gender,
        goal: userData.goal
      },
      selectedFoodsCount: selectedFoods.length,
      hasFoodsByMealType: !!foodsByMealType,
      dietaryPreferencesProvided: !!dietaryPreferences
    });

    // Tradução para os nomes dos dias da semana em português
    const dayTranslations = {
      monday: "Segunda-feira",
      tuesday: "Terça-feira",
      wednesday: "Quarta-feira",
      thursday: "Quinta-feira",
      friday: "Sexta-feira",
      saturday: "Sábado",
      sunday: "Domingo"
    };

    // Tradução para os tipos de refeição em português
    const mealTypeTranslations = {
      breakfast: "Café da Manhã",
      morningSnack: "Lanche da Manhã",
      lunch: "Almoço",
      afternoonSnack: "Lanche da Tarde",
      dinner: "Jantar"
    };

    // Organizar alimentos por tipo de refeição se não foram fornecidos
    const organizedFoodsByMealType = foodsByMealType || organizeFoodsByMealType(selectedFoods);
    
    console.log("Alimentos organizados por tipo de refeição");
    for (const [mealType, foods] of Object.entries(organizedFoodsByMealType)) {
      console.log(`${mealType}: ${Array.isArray(foods) ? foods.length : 0} alimentos`);
    }

    // Verificar modelo solicitado e chamar a API correspondente
    let result;
    let modelUsed;
    
    if (modelConfig?.model?.toLowerCase().includes('llama')) {
      console.log("Usando modelo Llama para geração do plano alimentar");
      try {
        result = await generateWithLlama(userData, organizedFoodsByMealType, dietaryPreferences, modelConfig);
        modelUsed = modelConfig.model;
      } catch (llamaError) {
        console.error("Erro ao gerar com Llama:", llamaError);
        throw new Error(`Erro ao gerar com modelo Llama: ${llamaError.message}`);
      }
    } else if (modelConfig?.model?.toLowerCase().includes('groq') || modelConfig?.model?.toLowerCase().includes('mixtral')) {
      console.log("Usando modelo Groq para geração do plano alimentar");
      try {
        result = await generateWithGroq(userData, organizedFoodsByMealType, dietaryPreferences, modelConfig);
        modelUsed = modelConfig.model;
      } catch (groqError) {
        console.error("Erro ao gerar com Groq:", groqError);
        throw new Error(`Erro ao gerar com modelo Groq: ${groqError.message}`);
      }
    } else {
      // Usar OpenAI como padrão
      console.log("Usando modelo OpenAI para geração do plano alimentar");
      try {
        result = await generateWithOpenAI(userData, organizedFoodsByMealType, dietaryPreferences, modelConfig);
        modelUsed = modelConfig?.model || "gpt-4o-mini";
      } catch (openaiError) {
        console.error("Erro ao gerar com OpenAI:", openaiError);
        throw new Error(`Erro ao gerar com modelo OpenAI: ${openaiError.message}`);
      }
    }

    // Processar resultado e traduzir nomes dos dias
    if (result && result.weeklyPlan) {
      for (const [dayKey, dayPlan] of Object.entries(result.weeklyPlan)) {
        // Traduzir nome do dia
        if (dayTranslations[dayKey]) {
          dayPlan.dayName = dayTranslations[dayKey];
        }

        // Traduzir nomes das refeições e adicionar mais detalhes de preparação
        if (dayPlan.meals) {
          Object.entries(dayPlan.meals).forEach(([mealType, meal]) => {
            // Verificar se a refeição existe e tem alimentos
            if (meal && meal.foods && Array.isArray(meal.foods)) {
              // Adicionar detalhes adicionais de preparação para cada alimento
              meal.foods = meal.foods.map(food => enhanceFoodPreparation(food, mealType));
            }
          });
        }
      }
    }

    console.log("Plano alimentar gerado com sucesso");

    return new Response(JSON.stringify({ 
      mealPlan: result, 
      modelUsed 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Erro no agente Nutri+:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro interno no servidor",
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Função para organizar alimentos por tipo de refeição
function organizeFoodsByMealType(foods) {
  // Definir grupos de alimentos por tipo de refeição
  const mealTypeGroups = {
    breakfast: [1, 2, 3, 6], // Vegetais, frutas, grãos, laticínios
    morningSnack: [2, 6, 7], // Frutas, laticínios, gorduras saudáveis
    lunch: [1, 3, 4, 5], // Vegetais, grãos, proteínas animais e vegetais
    afternoonSnack: [2, 6, 7], // Similar ao lanche da manhã
    dinner: [1, 3, 4, 5] // Similar ao almoço
  };

  const result = {};
  
  // Organizar alimentos por tipo de refeição
  for (const [mealType, groupIds] of Object.entries(mealTypeGroups)) {
    result[mealType] = foods.filter(food => 
      groupIds.includes(food.food_group_id) || 
      // Incluir alimentos sem grupo definido em todas as refeições
      !food.food_group_id || food.food_group_id === 10
    );
  }
  
  return result;
}

// Função para melhorar detalhes de preparação dos alimentos
function enhanceFoodPreparation(food, mealType) {
  const updatedFood = { ...food };
  
  if (!updatedFood.details || updatedFood.details.length < 10) {
    const foodName = updatedFood.name.toLowerCase();
    
    if (foodName.includes("arroz")) {
      updatedFood.details = "Cozinhe o arroz na proporção de 2 partes de água para 1 de arroz. Refogue com um pouco de azeite e alho antes de adicionar a água. Cozinhe em fogo baixo com tampa por aproximadamente 15-20 minutos.";
    } else if (foodName.includes("feijão")) {
      updatedFood.details = "Deixe o feijão de molho por pelo menos 4 horas antes do preparo. Cozinhe na panela de pressão por aproximadamente 25-30 minutos. Tempere com cebola, alho e uma folha de louro para dar sabor.";
    } else if (foodName.includes("frango") || foodName.includes("peito de frango")) {
      updatedFood.details = "Tempere o frango com sal, pimenta e ervas de sua preferência. Grelhe em uma frigideira antiaderente com um fio de azeite por cerca de 6-7 minutos de cada lado até dourar. Deixe descansar por 5 minutos antes de servir.";
    } else if (foodName.includes("peixe") || foodName.includes("salmão") || foodName.includes("tilápia")) {
      updatedFood.details = "Tempere o peixe com sal, limão e ervas. Cozinhe em uma frigideira com azeite em fogo médio-alto por 3-4 minutos de cada lado. Verifique se está cozido quando a carne estiver opaca e se desfazendo facilmente.";
    } else if (foodName.includes("ovo") || foodName.includes("ovos")) {
      updatedFood.details = "Para ovos mexidos: bata os ovos em uma tigela com uma pitada de sal. Cozinhe em fogo baixo, mexendo constantemente. Para ovos cozidos: cozinhe em água fervente por 6 minutos (gema mole) ou 9 minutos (gema dura).";
    } else if (foodName.includes("aveia") || foodName.includes("mingau")) {
      updatedFood.details = "Misture a aveia com leite ou água na proporção de 1:2. Aqueça em fogo baixo por 3-5 minutos, mexendo constantemente. Adicione canela ou frutas para dar sabor.";
    } else if (foodName.includes("salada")) {
      updatedFood.details = "Lave bem todos os vegetais. Corte em pedaços do tamanho desejado. Misture com um molho simples de azeite, limão e sal. Consuma imediatamente para preservar os nutrientes e a textura.";
    } else if (foodName.includes("batata") || foodName.includes("batata-doce")) {
      updatedFood.details = "Cozinhe a batata em água fervente até que esteja macia (cerca de 15-20 minutos). Para assar, corte em cubos, tempere com azeite, sal e ervas, e asse a 200°C por 25-30 minutos.";
    } else if (foodName.includes("iogurte")) {
      updatedFood.details = "Consuma o iogurte gelado. Para torná-lo mais nutritivo, adicione frutas frescas, granola ou sementes.";
    } else if (foodName.includes("maçã") || foodName.includes("banana") || foodName.includes("fruta")) {
      updatedFood.details = "Lave bem a fruta antes de consumir. Pode ser consumida in natura ou cortada em pedaços para facilitar o consumo.";
    } else {
      // Instruções de preparo específicas para cada tipo de refeição
      if (mealType === "breakfast") {
        updatedFood.details = "Prepare este alimento de forma leve e nutritiva para o café da manhã. Consuma pela manhã para garantir energia para o início do dia.";
      } else if (mealType === "morningSnack") {
        updatedFood.details = "Prepare como um lanche leve da manhã. Ideal para manter os níveis de energia entre o café da manhã e o almoço.";
      } else if (mealType === "lunch") {
        updatedFood.details = "Prepare de acordo com suas preferências culinárias para o almoço. Utilize temperos naturais como ervas frescas e limão para realçar o sabor sem adicionar sódio em excesso.";
      } else if (mealType === "afternoonSnack") {
        updatedFood.details = "Preparação rápida e simples para o lanche da tarde. Consuma entre o almoço e o jantar para manter o metabolismo ativo.";
      } else if (mealType === "dinner") {
        updatedFood.details = "Prepare para o jantar de forma leve. Evite o uso excessivo de sal e óleo. Consuma pelo menos 2 horas antes de dormir para melhor digestão.";
      }
    }
  }
  
  return updatedFood;
}

// Função para gerar com OpenAI
async function generateWithOpenAI(userData, foodsByMealType, dietaryPreferences, modelConfig) {
  if (!openAIApiKey) {
    throw new Error("API key da OpenAI não configurada");
  }

  console.log("Preparando dados para o modelo OpenAI");
  
  // Preparar os dados para envio
  const prompt = generateNutriPlusPrompt(userData, foodsByMealType, dietaryPreferences);
  
  try {
    console.log("Enviando requisição para OpenAI");
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`
      },
      body: JSON.stringify({
        model: modelConfig?.model || 'gpt-4o-mini',
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
        temperature: modelConfig?.temperature || 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro na resposta da OpenAI:", errorData);
      throw new Error(`Erro na API do OpenAI: ${response.status} ${response.statusText}`);
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
        console.error("Formato JSON inválido na resposta:", content);
        throw new Error("Formato JSON inválido na resposta");
      }
      
      const jsonStr = content.substring(jsonStart, jsonEnd);
      console.log("JSON extraído:", jsonStr.substring(0, 200) + "...");
      const mealPlan = JSON.parse(jsonStr);
      
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

// Função para gerar com Llama
async function generateWithLlama(userData, foodsByMealType, dietaryPreferences, modelConfig) {
  if (!llamaAPIKey) {
    throw new Error("API key do Llama não configurada");
  }

  console.log("Preparando dados para o modelo Llama");
  
  // Preparar os dados para envio
  const prompt = generateNutriPlusPrompt(userData, foodsByMealType, dietaryPreferences);
  
  try {
    console.log("Enviando requisição para Llama");
    const response = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llamaAPIKey}`
      },
      body: JSON.stringify({
        model: modelConfig?.model || 'llama3-8b-8192',
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
        temperature: modelConfig?.temperature || 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro na resposta do Llama:", errorData);
      throw new Error(`Erro na API do Llama: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Resposta recebida do modelo Llama");

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error("Resposta inválida do Llama");
    }

    // Processar o JSON gerado pelo modelo
    try {
      // Tente extrair o JSON da resposta
      const content = data.choices[0].message.content;
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
        console.error("Formato JSON inválido na resposta:", content);
        throw new Error("Formato JSON inválido na resposta");
      }
      
      const jsonStr = content.substring(jsonStart, jsonEnd);
      console.log("JSON extraído:", jsonStr.substring(0, 200) + "...");
      const mealPlan = JSON.parse(jsonStr);
      
      return mealPlan;
    } catch (jsonError) {
      console.error("Erro ao processar JSON da resposta do Llama:", jsonError);
      throw new Error("Falha ao processar o JSON do plano alimentar do Llama");
    }
  } catch (error) {
    console.error("Erro ao gerar com Llama:", error);
    throw error;
  }
}

// Função para gerar com Groq
async function generateWithGroq(userData, foodsByMealType, dietaryPreferences, modelConfig) {
  if (!groqAPIKey) {
    throw new Error("API key do Groq não configurada");
  }

  console.log("Preparando dados para o modelo Groq");
  
  // Preparar os dados para envio
  const prompt = generateNutriPlusPrompt(userData, foodsByMealType, dietaryPreferences);
  
  try {
    console.log("Enviando requisição para Groq");
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqAPIKey}`
      },
      body: JSON.stringify({
        model: modelConfig?.model || 'mixtral-8x7b-32768',
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
        temperature: modelConfig?.temperature || 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro na resposta do Groq:", errorData);
      throw new Error(`Erro na API do Groq: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Resposta recebida do modelo Groq");

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error("Resposta inválida do Groq");
    }

    // Processar o JSON gerado pelo modelo
    try {
      // Tente extrair o JSON da resposta
      const content = data.choices[0].message.content;
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
        console.error("Formato JSON inválido na resposta:", content);
        throw new Error("Formato JSON inválido na resposta");
      }
      
      const jsonStr = content.substring(jsonStart, jsonEnd);
      console.log("JSON extraído:", jsonStr.substring(0, 200) + "...");
      const mealPlan = JSON.parse(jsonStr);
      
      return mealPlan;
    } catch (jsonError) {
      console.error("Erro ao processar JSON da resposta do Groq:", jsonError);
      throw new Error("Falha ao processar o JSON do plano alimentar do Groq");
    }
  } catch (error) {
    console.error("Erro ao gerar com Groq:", error);
    throw error;
  }
}

// Função para gerar o prompt para o NutriPlus
function generateNutriPlusPrompt(userData, foodsByMealType, dietaryPreferences) {
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

  // Montar texto de alimentos organizados por tipo de refeição
  const mealTypesSection = Object.entries(foodsByMealType)
    .map(([mealType, foods]) => {
      if (!foods || !Array.isArray(foods) || foods.length === 0) return `### ${mealType}: Nenhum alimento disponível`;
      
      return `### ${mealType}:
${foods.map(food => `- ${food.name}: ${food.calories || 0} kcal, ${food.protein || 0}g proteína, ${food.carbs || 0}g carboidratos, ${food.fats || 0}g gorduras`).join('\n')}`;
    })
    .join('\n\n');

  // Construir o prompt em português
  return `
Você é um nutricionista especializado em criar planos alimentares personalizados em português.

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
${dietaryPreferences?.hasAllergies ? `- Alergias: ${dietaryPreferences.allergies?.join(', ')}` : '- Sem alergias'}
${dietaryPreferences?.dietaryRestrictions?.length > 0 ? `- Restrições: ${dietaryPreferences.dietaryRestrictions.join(', ')}` : '- Sem restrições alimentares'}
${dietaryPreferences?.trainingTime ? `- Horário de Treino: ${dietaryPreferences.trainingTime}` : '- Sem treino'}

## ALIMENTOS DISPONÍVEIS POR TIPO DE REFEIÇÃO:
${mealTypesSection}

## ESTRUTURA DE SAÍDA
Crie um plano alimentar semanal para 7 dias apresentado em formato JSON, totalmente em português:

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
    "tuesday": { ... mesmo formato de monday },
    "wednesday": { ... mesmo formato de monday },
    "thursday": { ... mesmo formato de monday },
    "friday": { ... mesmo formato de monday },
    "saturday": { ... mesmo formato de monday },
    "sunday": { ... mesmo formato de monday }
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
2. Utilize apenas os alimentos da lista fornecida para cada tipo de refeição.
3. NÃO MISTURE alimentos entre os diferentes tipos de refeição (use apenas os alimentos listados em cada seção para aquela refeição).
4. Evite alimentos aos quais o usuário tem alergia ou restrição.
5. Adeque as refeições ao horário de treino, se fornecido.
6. Varie os alimentos ao longo da semana.
7. Siga estritamente o formato JSON solicitado.
8. Use o português brasileiro para todos os textos e descrições.
9. Inclua porções realistas para cada alimento (em gramas, ml, unidades ou colheres).
10. Adicione detalhes sobre como preparar ou combinar os alimentos em português.

Apenas responda com o JSON do plano alimentar, sem texto adicional ou explicações.
`;
}
