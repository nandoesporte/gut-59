
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Obter chaves de API dos ambientes
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const groqAPIKey = Deno.env.get('GROQ_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[NUTRI+] Iniciando agente Nutri+");
    const requestData = await req.json();
    
    if (!requestData || !requestData.userData || !requestData.selectedFoods) {
      throw new Error("Dados de requisição incompletos. Verifique os parâmetros obrigatórios.");
    }
    
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences, modelConfig } = requestData;
    
    console.log("[NUTRI+] Dados recebidos:", {
      userData: {
        weight: userData.weight,
        height: userData.height,
        age: userData.age,
        gender: userData.gender,
        goal: userData.goal
      },
      selectedFoodsCount: selectedFoods.length,
      hasFoodsByMealType: !!foodsByMealType,
      dietaryPreferencesProvided: !!dietaryPreferences,
      modelConfig: modelConfig
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
    
    console.log("[NUTRI+] Alimentos organizados por tipo de refeição");
    for (const [mealType, foods] of Object.entries(organizedFoodsByMealType)) {
      console.log(`[NUTRI+] ${mealType}: ${Array.isArray(foods) ? foods.length : 0} alimentos`);
    }

    // Verificar modelo solicitado e chamar a API correspondente
    let result;
    let modelUsed;
    
    console.log(`[NUTRI+] Modelo solicitado: ${modelConfig?.model || 'não especificado'}`);
    
    if (modelConfig?.model?.toLowerCase().includes('llama')) {
      console.log("[NUTRI+] Usando modelo Llama via Groq API para geração do plano alimentar");
      try {
        const llamaModel = modelConfig.model || 'llama3-8b-8192';
        console.log(`[NUTRI+] Chamando Groq API com modelo: ${llamaModel}`);
        result = await generateWithGroq(userData, organizedFoodsByMealType, dietaryPreferences, {
          ...modelConfig,
          model: llamaModel
        });
        modelUsed = llamaModel;
        console.log("[NUTRI+] Resposta da Groq API com modelo Llama recebida com sucesso");
      } catch (llamaError) {
        console.error("[NUTRI+] Erro ao gerar com Llama (via Groq):", llamaError);
        
        // Tentar com OpenAI como fallback
        console.log("[NUTRI+] Tentando fallback para OpenAI após erro com Llama");
        try {
          const openaiModel = "gpt-4o-mini";
          result = await generateWithOpenAI(userData, organizedFoodsByMealType, dietaryPreferences, {
            model: openaiModel,
            temperature: modelConfig?.temperature || 0.7
          });
          modelUsed = `${openaiModel} (fallback após erro em ${modelConfig?.model})`;
          console.log("[NUTRI+] Fallback para OpenAI concluído com sucesso");
        } catch (fallbackError) {
          console.error("[NUTRI+] Erro também no fallback:", fallbackError);
          throw new Error(`Erro ao gerar com Llama e no fallback: ${llamaError.message}. Erro no fallback: ${fallbackError.message}`);
        }
      }
    } else if (modelConfig?.model?.toLowerCase().includes('groq') || modelConfig?.model?.toLowerCase().includes('mixtral')) {
      console.log("[NUTRI+] Usando modelo Groq para geração do plano alimentar");
      try {
        const groqModel = modelConfig.model || 'mixtral-8x7b-32768';
        console.log(`[NUTRI+] Chamando Groq API com modelo: ${groqModel}`);
        result = await generateWithGroq(userData, organizedFoodsByMealType, dietaryPreferences, {
          ...modelConfig,
          model: groqModel
        });
        modelUsed = groqModel;
        console.log("[NUTRI+] Resposta da Groq API recebida com sucesso");
      } catch (groqError) {
        console.error("[NUTRI+] Erro ao gerar com Groq:", groqError);
        
        // Tentar com OpenAI como fallback
        console.log("[NUTRI+] Tentando fallback para OpenAI após erro com Groq");
        try {
          const openaiModel = "gpt-4o-mini";
          result = await generateWithOpenAI(userData, organizedFoodsByMealType, dietaryPreferences, {
            model: openaiModel,
            temperature: modelConfig?.temperature || 0.7
          });
          modelUsed = `${openaiModel} (fallback após erro em ${modelConfig?.model})`;
          console.log("[NUTRI+] Fallback para OpenAI concluído com sucesso");
        } catch (fallbackError) {
          console.error("[NUTRI+] Erro também no fallback:", fallbackError);
          throw new Error(`Erro ao gerar com Groq e no fallback: ${groqError.message}. Erro no fallback: ${fallbackError.message}`);
        }
      }
    } else {
      // Usar OpenAI como padrão
      console.log("[NUTRI+] Usando modelo OpenAI para geração do plano alimentar");
      try {
        const openaiModel = modelConfig?.model || "gpt-4o-mini";
        console.log(`[NUTRI+] Chamando OpenAI API com modelo: ${openaiModel}`);
        result = await generateWithOpenAI(userData, organizedFoodsByMealType, dietaryPreferences, {
          ...modelConfig,
          model: openaiModel
        });
        modelUsed = openaiModel;
        console.log("[NUTRI+] Resposta da OpenAI API recebida com sucesso");
      } catch (openaiError) {
        console.error("[NUTRI+] Erro ao gerar com OpenAI:", openaiError);
        throw new Error(`Erro ao gerar com modelo OpenAI: ${openaiError.message}`);
      }
    }

    // Processar resultado e traduzir nomes dos dias
    if (result && result.weeklyPlan) {
      console.log("[NUTRI+] Processando e traduzindo plano alimentar gerado");
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

    // Verificar que o plano tem a estrutura esperada
    if (!result || !result.weeklyPlan) {
      console.error("[NUTRI+] Plano gerado incompleto ou inválido", result);
      throw new Error("O plano alimentar gerado está incompleto ou em formato inválido");
    }

    if (!result.weeklyTotals) {
      console.warn("[NUTRI+] Plano sem totais semanais, calculando...");
      result.weeklyTotals = calculateWeeklyTotals(result.weeklyPlan);
    }

    console.log("[NUTRI+] Plano alimentar gerado com sucesso");
    console.log("[NUTRI+] Modelo utilizado:", modelUsed);

    return new Response(JSON.stringify({ 
      mealPlan: result, 
      modelUsed 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("[NUTRI+] Erro no agente Nutri+:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro interno no servidor",
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Função para calcular totais semanais
function calculateWeeklyTotals(weeklyPlan) {
  console.log("[NUTRI+] Calculando totais semanais");
  
  if (!weeklyPlan || typeof weeklyPlan !== 'object') {
    console.error("[NUTRI+] weeklyPlan inválido para cálculo de totais:", weeklyPlan);
    return {
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFats: 0,
      averageFiber: 0
    };
  }
  
  const days = Object.values(weeklyPlan);
  const validDays = days.filter((day: any) => 
    day && day.dailyTotals && 
    !isNaN(Number(day.dailyTotals.calories)) && 
    !isNaN(Number(day.dailyTotals.protein))
  );
  
  const dayCount = validDays.length || 1;
  
  let caloriesTotal = 0;
  let proteinTotal = 0;
  let carbsTotal = 0;
  let fatsTotal = 0;
  let fiberTotal = 0;
  
  for (const day of validDays as any[]) {
    caloriesTotal += Number(day.dailyTotals?.calories || 0);
    proteinTotal += Number(day.dailyTotals?.protein || 0);
    carbsTotal += Number(day.dailyTotals?.carbs || 0);
    fatsTotal += Number(day.dailyTotals?.fats || 0);
    fiberTotal += Number(day.dailyTotals?.fiber || 0);
  }
  
  return {
    averageCalories: Math.round(caloriesTotal / dayCount),
    averageProtein: Math.round(proteinTotal / dayCount),
    averageCarbs: Math.round(carbsTotal / dayCount),
    averageFats: Math.round(fatsTotal / dayCount),
    averageFiber: Math.round(fiberTotal / dayCount)
  };
}

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

  console.log("[NUTRI+] Preparando dados para o modelo OpenAI");
  
  // Preparar os dados para envio
  const prompt = generateNutriPlusPrompt(userData, foodsByMealType, dietaryPreferences);
  
  try {
    console.log("[NUTRI+] Enviando requisição para OpenAI");
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
            content: 'Você é um nutricionista especializado em criar planos alimentares personalizados. Responda apenas com o objeto JSON conforme solicitado, sem texto adicional. Use português brasileiro para todos os textos.'
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
      console.error("[NUTRI+] Erro na resposta da OpenAI:", errorData);
      throw new Error(`Erro na API do OpenAI: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[NUTRI+] Resposta recebida do modelo OpenAI");

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error("Resposta inválida do OpenAI");
    }

    // Processar o JSON gerado pelo modelo
    try {
      // Tente extrair o JSON da resposta
      const content = data.choices[0].message.content;
      console.log("[NUTRI+] Conteúdo da resposta bruta (OpenAI):", content.substring(0, 200) + "...");
      
      // Detectar e reparar problemas comuns de JSON
      const jsonData = extractJSON(content, "OpenAI");
      console.log("[NUTRI+] JSON parseado com sucesso (OpenAI)");
      
      return jsonData;
    } catch (jsonError) {
      console.error("[NUTRI+] Erro ao processar JSON da resposta do OpenAI:", jsonError);
      throw new Error("Falha ao processar o JSON do plano alimentar do OpenAI");
    }
  } catch (error) {
    console.error("[NUTRI+] Erro ao gerar com OpenAI:", error);
    throw error;
  }
}

// Função para gerar com Groq
async function generateWithGroq(userData, foodsByMealType, dietaryPreferences, modelConfig) {
  if (!groqAPIKey) {
    throw new Error("API key do Groq não configurada");
  }

  console.log("[NUTRI+] Preparando dados para o modelo Groq");
  
  // Usar modelo do parâmetro ou definir padrão
  const modelToUse = modelConfig?.model || 'llama3-8b-8192';
  console.log(`[NUTRI+] Usando modelo Groq: ${modelToUse}`);
  
  // Preparar os dados para envio
  const prompt = generateNutriPlusPrompt(userData, foodsByMealType, dietaryPreferences);
  
  try {
    console.log(`[NUTRI+] Enviando requisição para Groq com modelo ${modelToUse}`);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqAPIKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          {
            role: 'system',
            content: 'Você é um nutricionista especializado em criar planos alimentares personalizados. Responda apenas com o objeto JSON conforme solicitado, sem texto adicional. Use português brasileiro para todos os textos.'
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
      const errorText = await response.text();
      console.error(`[NUTRI+] Erro na resposta da Groq API (${response.status}):`, errorText);
      let errorObj;
      try {
        errorObj = JSON.parse(errorText);
      } catch (e) {
        errorObj = { error: errorText };
      }
      throw new Error(`Erro na API da Groq: ${response.status} ${response.statusText} - ${JSON.stringify(errorObj)}`);
    }

    const data = await response.json();
    console.log("[NUTRI+] Resposta recebida do modelo Groq");

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error("Resposta inválida da Groq API");
    }

    // Processar o JSON gerado pelo modelo
    try {
      // Tente extrair o JSON da resposta
      const content = data.choices[0].message.content;
      console.log("[NUTRI+] Conteúdo da resposta bruta (Groq):", content.substring(0, 200) + "...");
      
      // Extrair e processar o JSON
      const jsonData = extractJSON(content, "Groq");
      console.log("[NUTRI+] JSON parseado com sucesso (Groq)");
      
      return jsonData;
    } catch (jsonError) {
      console.error("[NUTRI+] Erro ao processar JSON da resposta da Groq:", jsonError);
      throw new Error("Falha ao processar o JSON do plano alimentar da Groq API");
    }
  } catch (error) {
    console.error("[NUTRI+] Erro ao gerar com Groq:", error);
    throw error;
  }
}

// Função para extrair e corrigir JSON da resposta do modelo
function extractJSON(content, modelName) {
  console.log(`[NUTRI+] Extraindo JSON da resposta do ${modelName}`);
  
  try {
    // Primeiro, tenta parsear diretamente
    try {
      return JSON.parse(content);
    } catch (e) {
      console.log(`[NUTRI+] Parse direto falhou, tentando extrair JSON válido`);
    }
    
    // Determinar o início e fim do JSON
    let jsonStr = content;
    
    // Remover texto antes do primeiro '{'
    const jsonStart = content.indexOf('{');
    if (jsonStart > 0) {
      jsonStr = content.substring(jsonStart);
      console.log(`[NUTRI+] Removido ${jsonStart} caracteres antes do início do JSON`);
    }
    
    // Remover texto após o último '}'
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonEnd >= 0 && jsonEnd < jsonStr.length - 1) {
      jsonStr = jsonStr.substring(0, jsonEnd + 1);
      console.log(`[NUTRI+] Removido texto após o final do JSON`);
    }
    
    // Verificar se o JSON possui chaves de abertura e fechamento
    if (!jsonStr.trim().startsWith('{') || !jsonStr.trim().endsWith('}')) {
      console.error(`[NUTRI+] Formato de resposta inesperado (${modelName}):`, jsonStr);
      
      // Tentar extrair usando regex como último recurso
      const jsonMatch = content.match(/{[\s\S]*}/);
      if (jsonMatch && jsonMatch[0]) {
        jsonStr = jsonMatch[0];
        console.log(`[NUTRI+] Extraído JSON via regex: ${jsonStr.substring(0, 50)}...`);
      } else {
        throw new Error("Não foi possível extrair um objeto JSON válido da resposta");
      }
    }
    
    // Tentar reparar JSON
    jsonStr = jsonStr
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ');
    
    // Tentar parsear JSON reparado
    try {
      const result = JSON.parse(jsonStr);
      return result;
    } catch (parseError) {
      console.error(`[NUTRI+] Erro ao parsear JSON reparado:`, parseError);
      
      // Logging mais detalhado para diagnóstico
      for (let i = 0; i < jsonStr.length; i += 5000) {
        const chunk = jsonStr.substring(i, i + 5000);
        console.log(`[NUTRI+] Chunk ${i}-${i+5000} do JSON:`, chunk);
      }
      
      throw new Error(`Falha ao parsear JSON: ${parseError.message}`);
    }
  } catch (error) {
    console.error(`[NUTRI+] Erro ao extrair JSON:`, error);
    throw new Error(`Erro ao extrair e processar JSON: ${error.message}`);
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
Você é um nutricionista especializado em criar planos alimentares personalizados em português do Brasil.

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
Crie um plano alimentar semanal para 7 dias apresentado em formato JSON, totalmente em português do Brasil:

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
10. Adicione detalhes sobre como preparar ou combinar os alimentos em português do Brasil.
11. MUITO IMPORTANTE: Não adicione nenhum texto, comentário ou formatação markdown antes ou depois do objeto JSON.
12. Sua resposta deve conter APENAS o objeto JSON válido, nada mais.

Apenas responda com o JSON do plano alimentar, sem texto adicional ou explicações.
`;
}
