import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { calculateDailyCalories } from "./calculators.ts";
import { validateInput } from "./validator.ts";
import { generateRecommendations } from "./recommendations.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const groqApiKey = Deno.env.get('GROQ_API_KEY');
// Configurar chaves da API Nutritionix
const NUTRITIONIX_APP_ID = Deno.env.get('NUTRITIONIX_APP_ID') || "75c8c0ea";
const NUTRITIONIX_API_KEY = Deno.env.get('NUTRITIONIX_API_KEY') || "636f7a3146b09d140b5353ef030fb2a4";

// Crie uma instância do cliente Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando solicitação para geração de plano alimentar");
    const requestData = await req.json();
    
    // Verificar se temos os dados necessários
    if (!requestData || !requestData.userData || !requestData.selectedFoods) {
      throw new Error("Dados de requisição incompletos. Verifique os parâmetros obrigatórios.");
    }
    
    const { userData, selectedFoods, dietaryPreferences } = requestData;

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

    // Enriquecer os dados dos alimentos com informações nutricionais mais precisas
    let enhancedFoods = [...selectedFoods];
    if (NUTRITIONIX_APP_ID && NUTRITIONIX_API_KEY) {
      try {
        console.log("Enriquecendo dados dos alimentos com a API Nutritionix");
        const enrichedFoods = await enhanceFoodsWithNutritionixData(selectedFoods);
        
        if (enrichedFoods && enrichedFoods.length > 0) {
          console.log(`Dados de ${enrichedFoods.length}/${selectedFoods.length} alimentos enriquecidos com Nutritionix`);
          // Substituir apenas os alimentos que foram enriquecidos
          const enhancedFoodsMap = new Map(enrichedFoods.map(food => [food.name.toLowerCase(), food]));
          
          enhancedFoods = selectedFoods.map(food => {
            const enhanced = enhancedFoodsMap.get(food.name.toLowerCase());
            return enhanced || food;
          });
        }
      } catch (nutritionixError) {
        console.error("Erro ao enriquecer dados com Nutritionix:", nutritionixError);
        // Continuar com os dados originais em caso de erro
      }
    } else {
      console.log("Chaves da API Nutritionix não configuradas. Usando dados originais.");
    }

    // Separar alimentos por tipo de refeição para evitar misturas inadequadas
    const foodsByMealType = organizeFoodsByMealType(enhancedFoods);
    console.log("Alimentos organizados por tipo de refeição para evitar misturas inadequadas");

    // Buscar o prompt personalizado do agente Nutri+
    console.log("Buscando prompt personalizado do agente Nutri+");
    let customPrompt = null;
    
    try {
      const { data: promptData, error } = await supabase
        .from('ai_agent_prompts')
        .select('*')
        .eq('agent_type', 'meal_plan')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error("Erro ao buscar prompt personalizado:", error);
        console.log("Usando prompt padrão devido a erro na consulta");
      } else if (promptData) {
        customPrompt = promptData.prompt;
        console.log("Prompt personalizado encontrado e será utilizado");
      } else {
        console.log("Nenhum prompt personalizado encontrado, usando prompt padrão");
      }
    } catch (promptError) {
      console.error("Erro ao buscar prompt personalizado:", promptError);
      console.log("Usando prompt padrão devido a exceção");
    }

    // Gerar o plano alimentar
    console.log("Iniciando geração do plano alimentar");
    
    // Tentar diretamente com OpenAI primeiro, já que estamos tendo problemas com Llama
    try {
      console.log("Tentando gerar plano diretamente com OpenAI");
      const result = await generateWithOpenAI(userData, foodsByMealType, dietaryPreferences, customPrompt);
      return new Response(JSON.stringify({ mealPlan: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (openaiError) {
      console.error("Erro ao gerar plano com OpenAI:", openaiError);
      
      // Se OpenAI falhar, gerar plano básico
      console.log("Gerando plano básico com dados locais");
      const basicPlan = generateBasicMealPlan(userData, foodsByMealType, dietaryPreferences);
      
      return new Response(JSON.stringify({ mealPlan: basicPlan }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Erro no processamento da solicitação:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro interno no servidor",
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      }
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
  
  // Log dos alimentos organizados
  for (const [mealType, mealFoods] of Object.entries(result)) {
    console.log(`${mealType}: ${mealFoods.length} alimentos disponíveis`);
  }
  
  return result;
}

// Função para enriquecer dados com a API Nutritionix
async function enhanceFoodsWithNutritionixData(foods) {
  if (!foods || !Array.isArray(foods) || foods.length === 0) {
    console.log("Lista de alimentos vazia ou inválida para enriquecimento");
    return [];
  }
  
  const enhancedFoods = [];
  const topFoods = foods.slice(0, 10); // Limitar para não sobrecarregar a API
  
  for (const food of topFoods) {
    if (!food || !food.name) continue;
    
    try {
      // Consultar a API Nutritionix
      const response = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-id': NUTRITIONIX_APP_ID,
          'x-app-key': NUTRITIONIX_API_KEY
        },
        body: JSON.stringify({
          query: food.name
        })
      });
      
      if (!response.ok) {
        console.warn(`Erro ao consultar Nutritionix para ${food.name}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.foods && data.foods.length > 0) {
        const nutritionData = data.foods[0];
        
        // Criar versão enriquecida do alimento
        const enhancedFood = {
          ...food,
          calories: Math.round(nutritionData.nf_calories),
          protein: Math.round(nutritionData.nf_protein),
          carbs: Math.round(nutritionData.nf_total_carbohydrate),
          fats: Math.round(nutritionData.nf_total_fat),
          fiber: nutritionData.nf_dietary_fiber ? Math.round(nutritionData.nf_dietary_fiber) : (food.fiber || 0),
          // Manter grupo alimentar original se disponível
          food_group_id: food.food_group_id,
          nutritionix_data: {
            serving_unit: nutritionData.serving_unit,
            serving_qty: nutritionData.serving_qty,
            serving_weight_grams: nutritionData.serving_weight_grams
          }
        };
        
        enhancedFoods.push(enhancedFood);
        console.log(`Dados de ${food.name} enriquecidos com Nutritionix`);
      }
    } catch (error) {
      console.error(`Erro ao processar ${food.name} com Nutritionix:`, error);
    }
    
    // Pequeno delay para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return enhancedFoods;
}

async function generateWithOpenAI(userData, foodsByMealType, dietaryPreferences, customPrompt) {
  if (!openAIApiKey) {
    throw new Error("API key do OpenAI não configurada");
  }

  console.log("Preparando dados para o modelo OpenAI");
  
  // Preparar os dados por tipo de refeição para o prompt
  const promptData = {};
  for (const [mealType, foods] of Object.entries(foodsByMealType)) {
    // Limitar número de alimentos por tipo de refeição
    promptData[mealType] = foods.slice(0, 20).map(food => ({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      food_group_id: food.food_group_id
    }));
  }

  // Construir o prompt para o modelo (usar customPrompt se disponível)
  const prompt = customPrompt 
    ? prepareCustomPrompt(customPrompt, userData, promptData, dietaryPreferences)
    : generateMealPlanPrompt(userData, promptData, dietaryPreferences);
  
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
            content: 'Você é o Dr. NutriMax, um nutricionista clínico e esportivo renomado com mais de 20 anos de experiência. Sua especialidade é criar planos alimentares altamente personalizados usando a metodologia NUTRI-PRECISION™. Você é reconhecido internacionalmente por sua abordagem científica, baseada em evidências e focada em resultados mensuráveis. Responda sempre em português do Brasil e retorne apenas o objeto JSON conforme solicitado, sem texto adicional, markdown ou explicações.'
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

// Função para preparar o prompt personalizado do admin
function prepareCustomPrompt(customPrompt, userData, foodsByMealType, dietaryPreferences) {
  // Criar variáveis para substituir no prompt
  const variables = {
    USER_WEIGHT: userData.weight,
    USER_HEIGHT: userData.height,
    USER_AGE: userData.age,
    USER_GENDER: userData.gender === 'male' ? 'Masculino' : 'Feminino',
    USER_ACTIVITY_LEVEL: userData.activityLevel,
    USER_GOAL: userData.goal,
    USER_DAILY_CALORIES: userData.dailyCalories,
    USER_ALLERGIES: dietaryPreferences?.hasAllergies 
      ? dietaryPreferences.allergies?.join(', ') 
      : 'Nenhuma alergia',
    USER_RESTRICTIONS: dietaryPreferences?.dietaryRestrictions?.length > 0 
      ? dietaryPreferences.dietaryRestrictions.join(', ') 
      : 'Nenhuma restrição',
    USER_TRAINING_TIME: dietaryPreferences?.trainingTime || 'Sem treino',
    FOODS_BY_MEAL: formatFoodsByMealForPrompt(foodsByMealType)
  };
  
  // Substituir cada variável no prompt
  let processedPrompt = customPrompt;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    processedPrompt = processedPrompt.replace(placeholder, value);
  }
  
  console.log("Prompt personalizado processado com sucesso");
  return processedPrompt;
}

// Função para formatar alimentos por refeição para o prompt personalizado
function formatFoodsByMealForPrompt(foodsByMealType) {
  return Object.entries(foodsByMealType)
    .map(([mealType, foods]) => {
      if (!foods || foods.length === 0) return `### ${mealType}: Nenhum alimento disponível`;
      
      return `### ${mealType}:
${foods.map(food => `- ${food.name}: ${food.calories} kcal, ${food.protein || 0}g proteína, ${food.carbs || 0}g carboidratos, ${food.fats || 0}g gorduras`).join('\n')}`;
    })
    .join('\n\n');
}

function generateBasicMealPlan(userData, foodsByMealType, dietaryPreferences) {
  console.log("Gerando plano alimentar básico");
  
  // Função para selecionar alimentos aleatórios do grupo
  function getRandomFoods(foods, count = 3) {
    if (!foods || foods.length === 0) return [];
    const shuffled = [...foods].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
  
  // Criar refeição básica
  function createMeal(title, calorias, mealType) {
    const availableFoods = foodsByMealType[mealType] || [];
    
    if (!availableFoods || availableFoods.length === 0) {
      console.log(`Sem alimentos disponíveis para ${mealType}, usando lista completa`);
      const allFoods = [].concat(...Object.values(foodsByMealType).filter(Array.isArray));
      const selectedFoods = getRandomFoods(allFoods, 3);
      
      if (selectedFoods.length === 0) {
        return {
          description: `${title} (Não foi possível gerar refeição - sem alimentos disponíveis)`,
          foods: [],
          calories: 0,
          macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
        };
      }
      
      const mealFoods = selectedFoods.map(food => ({
        name: food.name,
        portion: Math.round((calorias / selectedFoods.length) / (food.calories / 100 || 1)),
        unit: "g",
        details: `Fonte de ${food.protein > food.carbs && food.protein > food.fats ? 'proteína' : 
                  food.carbs > food.protein && food.carbs > food.fats ? 'carboidrato' : 'gordura'}`
      }));
      
      return {
        description: `${title} balanceada com aproximadamente ${calorias} calorias.`,
        foods: mealFoods,
        calories: calorias,
        macros: {
          protein: Math.round(selectedFoods.reduce((sum, food) => sum + (food.protein || 0), 0)),
          carbs: Math.round(selectedFoods.reduce((sum, food) => sum + (food.carbs || 0), 0)),
          fats: Math.round(selectedFoods.reduce((sum, food) => sum + (food.fats || 0), 0)),
          fiber: Math.round(selectedFoods.reduce((sum, food) => sum + (food.fiber || 0), 0))
        }
      };
    }
    
    // Selecionar alimentos apropriados para o tipo de refeição
    const selectedFoods = getRandomFoods(availableFoods, 3);
    
    if (selectedFoods.length === 0) {
      return {
        description: `${title} (Não foi possível gerar refeição - sem alimentos disponíveis)`,
        foods: [],
        calories: 0,
        macros: { protein: 0, carbs: 0, fats: 0, fiber: 0 }
      };
    }
    
    const mealFoods = selectedFoods.map(food => ({
      name: food.name,
      portion: Math.round((calorias / selectedFoods.length) / (food.calories / 100 || 1)),
      unit: "g",
      details: `Fonte de ${food.protein > food.carbs && food.protein > food.fats ? 'proteína' : 
                food.carbs > food.protein && food.carbs > food.fats ? 'carboidrato' : 'gordura'}`
    }));
    
    return {
      description: `${title} balanceada com aproximadamente ${calorias} calorias.`,
      foods: mealFoods,
      calories: calorias,
      macros: {
        protein: Math.round(selectedFoods.reduce((sum, food) => sum + (food.protein || 0), 0)),
        carbs: Math.round(selectedFoods.reduce((sum, food) => sum + (food.carbs || 0), 0)),
        fats: Math.round(selectedFoods.reduce((sum, food) => sum + (food.fats || 0), 0)),
        fiber: Math.round(selectedFoods.reduce((sum, food) => sum + (food.fiber || 0), 0))
      }
    };
  }
  
  // Distribuir calorias entre as refeições
  const totalCalorias = userData.dailyCalories || 2000;
  const breakfastCal = Math.round(totalCalorias * 0.25);
  const morningSnackCal = Math.round(totalCalorias * 0.1);
  const lunchCal = Math.round(totalCalorias * 0.3);
  const afternoonSnackCal = Math.round(totalCalorias * 0.1);
  const dinnerCal = Math.round(totalCalorias * 0.25);
  
  // Criar plano para um dia
  function createDayPlan(dayName) {
    const breakfast = createMeal("Café da manhã", breakfastCal, "breakfast");
    const morningSnack = createMeal("Lanche da manhã", morningSnackCal, "morningSnack");
    const lunch = createMeal("Almoço", lunchCal, "lunch");
    const afternoonSnack = createMeal("Lanche da tarde", afternoonSnackCal, "afternoonSnack");
    const dinner = createMeal("Jantar", dinnerCal, "dinner");
    
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
    dietaryPreferences?.trainingTime
  );
  
  return {
    weeklyPlan,
    weeklyTotals,
    recommendations
  };
}

function generateMealPlanPrompt(userData, foodsByMealType, dietaryPreferences) {
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
      if (!foods || foods.length === 0) return `### ${mealType}: Nenhum alimento disponível`;
      
      return `### ${mealType}:
${foods.map(food => `- ${food.name}: ${food.calories} kcal, ${food.protein || 0}g proteína, ${food.carbs || 0}g carboidratos, ${food.fats || 0}g gorduras`).join('\n')}`;
    })
    .join('\n\n');

  // Construir o prompt aprimorado
  return `
# DR. NUTRIMAX - CONSULTORIA NUTRICIONAL DE EXCELÊNCIA

Você é o **Dr. NutriMax**, nutricionista clínico e esportivo renomado internacionalmente, com expertise em:
- Nutrição de Precisão e Metabolismo Humano
- Otimização de Performance Atlética
- Composição Corporal e Emagrecimento Saudável
- Bioquímica Nutricional Aplicada
- Cronobiologia e Timing Nutricional

## METODOLOGIA NUTRI-PRECISION™

Você utiliza uma abordagem científica baseada em 4 pilares fundamentais:

### 1. ANÁLISE BIOMÉTRICA COMPLETA

**Perfil Antropométrico do Paciente:**
- **Peso corporal**: ${userData.weight} kg
- **Estatura**: ${userData.height} cm (${(userData.height / 100).toFixed(2)}m)
- **Índice de Massa Corporal (IMC)**: ${(userData.weight / Math.pow(userData.height / 100, 2)).toFixed(1)} kg/m²
- **Idade**: ${userData.age} anos
- **Sexo biológico**: ${userData.gender === 'male' ? 'Masculino' : 'Feminino'}
- **Nível de atividade física**: ${userData.activityLevel}

**Objetivos e Metas:**
- **Objetivo principal**: ${userData.goal}
- **Meta calórica diária**: ${userData.dailyCalories} kcal
- **Horário de treino**: ${dietaryPreferences?.trainingTime || 'Flexível / Sem treino programado'}

### 2. DISTRIBUIÇÃO ESTRATÉGICA DE MACRONUTRIENTES

**Metas Diárias de Macronutrientes:**
- **Proteínas**: ${idealMacros.protein}g (${Math.round((idealMacros.protein * 4 / userData.dailyCalories) * 100)}% das calorias)
- **Carboidratos**: ${idealMacros.carbs}g (${Math.round((idealMacros.carbs * 4 / userData.dailyCalories) * 100)}% das calorias)
- **Gorduras**: ${idealMacros.fats}g (${Math.round((idealMacros.fats * 9 / userData.dailyCalories) * 100)}% das calorias)
- **Fibras**: 25-35g por dia (essencial para saúde intestinal)

### 3. CONSIDERAÇÕES MÉDICAS E PREFERÊNCIAS

**Restrições e Alergias:**
${dietaryPreferences?.hasAllergies ? `- ⚠️ **ALERGIAS ALIMENTARES**: ${dietaryPreferences.allergies?.join(', ')} (CRÍTICO: NUNCA incluir estes alimentos)` : '- ✓ Sem alergias alimentares conhecidas'}
${dietaryPreferences?.dietaryRestrictions?.length > 0 ? `- 🚫 **RESTRIÇÕES**: ${dietaryPreferences.dietaryRestrictions.join(', ')} (respeitar rigorosamente)` : '- ✓ Sem restrições alimentares'}

### 4. ARSENAL NUTRICIONAL DISPONÍVEL

**Alimentos Selecionados e Organizados por Tipo de Refeição:**
${mealTypesSection}

---

## SUA MISSÃO PROFISSIONAL

Criar um plano alimentar semanal EXCEPCIONAL que seja:

✅ **Cientificamente Embasado**: Cada escolha baseada em evidências nutricionais
✅ **Altamente Personalizado**: Adaptado ao perfil único do paciente
✅ **Metabolicamente Otimizado**: Maximizar resultados com as calorias disponíveis
✅ **Nutricionalmente Completo**: Cobrir todas as necessidades de micro e macronutrientes
✅ **Praticamente Viável**: Receitas e porções realistas para o dia a dia
✅ **Cronobiologicamente Inteligente**: Timing correto de nutrientes ao longo do dia

---

## DIRETRIZES PROFISSIONAIS OBRIGATÓRIAS

### Distribuição Calórica Estratégica:
- **Café da manhã**: 25-30% das calorias diárias (iniciar metabolismo)
- **Lanche da manhã**: 5-10% das calorias (manter energia)
- **Almoço**: 30-35% das calorias (refeição principal)
- **Lanche da tarde**: 10-15% das calorias (preparar para treino ou jantar)
- **Jantar**: 20-25% das calorias (recuperação e saciedade noturna)

### Timing Nutricional Pré-Treino:
- **60-90min antes**: Refeição mista com carboidratos complexos + proteína
- **30-45min antes**: Carboidratos de rápida absorção + proteína leve
- **Hidratação**: 400-600ml de água 2h antes do treino

### Timing Nutricional Pós-Treino:
- **Janela anabólica (0-30min)**: Proteína de rápida absorção + carboidratos simples
- **2h após**: Refeição completa para recuperação muscular
- **Hidratação**: Repor 150% do peso perdido em suor

### Princípios de Combinação Alimentar:
- Proteína + Fibra em todas as refeições (controle glicêmico)
- Gorduras saudáveis para absorção de vitaminas lipossolúveis
- Variedade de cores nos vegetais (amplo espectro de fitonutrientes)
- Alimentos integrais > processados sempre que possível

### Estratégias Avançadas por Objetivo:

**Para PERDA DE PESO:**
- Priorizar proteínas e fibras para saciedade
- Carboidratos concentrados ao redor do treino
- Distribuição calórica decrescente ao longo do dia
- Alimentos termogênicos quando apropriado

**Para GANHO DE MASSA MUSCULAR:**
- Proteína distribuída em todas as refeições (mínimo 20-30g)
- Carboidratos abundantes pré e pós-treino
- Superávit calórico controlado (+300-500 kcal)
- Timing preciso de nutrientes para anabolismo

**Para MANUTENÇÃO:**
- Equilíbrio balanceado de macronutrientes
- Foco em qualidade nutricional e bem-estar
- Flexibilidade para sustentabilidade de longo prazo
- Variedade alimentar maximizada

---

## ESTRUTURA DE SAÍDA (FORMATO JSON OBRIGATÓRIO)

Retorne APENAS o JSON abaixo (sem markdown, sem explicações adicionais):

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

---

## CHECKLIST FINAL DE QUALIDADE PROFISSIONAL

Antes de finalizar o plano, verifique:

✅ **Precisão Calórica**: Cada dia deve ter ${userData.dailyCalories} kcal (±5% de variação aceitável)
✅ **Balanço de Macros**: Respeitar as metas de proteínas (${idealMacros.protein}g), carboidratos (${idealMacros.carbs}g), gorduras (${idealMacros.fats}g)
✅ **Variedade Semanal**: Nenhum dia deve ser exatamente igual a outro
✅ **Adequação de Porções**: Porções realistas e praticáveis (em gramas, ml, unidades ou colheres)
✅ **Segurança Alimentar**: ZERO tolerância com alergias e respeito absoluto às restrições
✅ **Timing Otimizado**: Refeições estrategicamente posicionadas conforme horário de treino
✅ **Densidade Nutricional**: Priorizar alimentos ricos em micronutrientes
✅ **Praticidade Real**: Receitas e preparos viáveis para o dia a dia do paciente
✅ **Completude Semanal**: Todos os 7 dias (segunda a domingo) devem estar completos e detalhados
✅ **Descrições Úteis**: Campo "details" com informações sobre preparo, combinações ou substituições

---

## INSTRUÇÕES FINAIS CRÍTICAS

1. **USE EXCLUSIVAMENTE** os alimentos listados para cada tipo de refeição
2. **NÃO MISTURE** alimentos de diferentes categorias de refeição
3. **JAMAIS INCLUA** alimentos que causam alergia ou violam restrições
4. **VARIE AS COMBINAÇÕES** entre os dias da semana para evitar monotonia
5. **AJUSTE O TIMING** das refeições conforme horário de treino informado
6. **CALCULE COM PRECISÃO** todas as calorias e macronutrientes
7. **INCLUA FIBRAS** adequadas em cada refeição (total 25-35g/dia)
8. **ADICIONE DETALHES** práticos sobre preparo e combinações no campo "details"
9. **MANTENHA O FORMATO** JSON rigorosamente conforme especificado
10. **RESPONDA APENAS** com o JSON válido, sem texto adicional ou markdown

**LEMBRE-SE**: Você é o Dr. NutriMax. Cada detalhe importa. Excelência não é negociável.

`;
}
