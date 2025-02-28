
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { calculateNutrition } from "./calculators.ts";
import { analyzeMealDistribution } from "./meal-analyzer.ts";
import { optimizeMeals } from "./meal-optimizer.ts";
import { generateRecommendations } from "./recommendations.ts";
import { validateInput } from "./validator.ts";
import { analyzeWorkoutNutrition } from "./workout-analyzer.ts";
import { calculatePortions } from "./portion-calculator.ts";
import { scoreNutritionalProfile } from "./nutritional-scorer.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const client = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

const openaiKey = Deno.env.get("OPENAI_API_KEY");
const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
const groqKey = Deno.env.get("GROQ_API_KEY");

const MODEL_PROVIDER = "groq"; // Define qual provedor usar: openai, deepseek ou groq

async function generateWithGroq(prompt: string) {
  console.log("Iniciando geração com Groq");
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: "Você é um nutricionista especializado em criar planos alimentares personalizados. Responda apenas com o JSON solicitado, sem texto adicional."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Erro na resposta do Groq:", errorData);
      throw new Error(`Groq API retornou erro: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Erro ao gerar com Groq:", error);
    throw error;
  }
}

async function generateWithDeepseek(prompt: string) {
  console.log("Iniciando geração com Deepseek");
  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Você é um nutricionista especializado em criar planos alimentares personalizados. Responda apenas com o JSON solicitado, sem texto adicional."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Erro na resposta do Deepseek:", errorData);
      throw new Error(`Deepseek API retornou erro: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Erro ao gerar com Deepseek:", error);
    throw error;
  }
}

async function generateWithOpenAI(prompt: string) {
  console.log("Iniciando geração com OpenAI");
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Você é um nutricionista especializado em criar planos alimentares personalizados. Responda apenas com o JSON solicitado, sem texto adicional."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Erro na resposta do OpenAI:", errorData);
      throw new Error(`OpenAI API retornou erro: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    try {
      // Garantir que o conteúdo é um JSON válido
      const mealPlanData = JSON.parse(data.choices[0].message.content);
      return mealPlanData;
    } catch (parseError) {
      console.error("Erro ao processar JSON da resposta do OpenAI:", parseError);
      console.error("Conteúdo problemático:", data.choices[0].message.content);
      
      // Tentativa de limpeza e re-parse
      const cleanedContent = data.choices[0].message.content
        .replace(/\\"/g, '"')  // Corrigir escape de aspas
        .replace(/\n/g, " ")   // Remover quebras de linha
        .replace(/\t/g, " ")   // Remover tabs
        .replace(/\r/g, " ")   // Remover retornos de carro
        .replace(/\\/g, "\\\\") // Escapar barras invertidas
        .replace(/"\s+"/g, '" "') // Corrigir espaços extras entre aspas
        .replace(/([^\\])\\([^\\"])/g, '$1\\\\$2') // Escapar barras invertidas não escapadas
        .replace(/([a-zA-Z0-9])"/g, '$1\\"') // Escapar aspas não escapadas
        .replace(/([^\\])"/g, '$1\\"'); // Escapar aspas não escapadas
      
      try {
        return JSON.parse(cleanedContent);
      } catch (secondParseError) {
        console.error("Falha na segunda tentativa de parse:", secondParseError);
        throw new Error("Falha ao processar o JSON do plano alimentar do OpenAI");
      }
    }
  } catch (error) {
    console.error("Erro ao gerar com OpenAI:", error);
    throw error;
  }
}

serve(async (req) => {
  // Lidar com solicitações OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Validando dados de entrada");
    const body = await req.json();
    
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences, options } = body;
    
    // Adicione validações básicas
    if (!userData || !selectedFoods || selectedFoods.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Dados incompletos para geração do plano alimentar" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validar dados de entrada avançados
    const validationResult = validateInput(userData, selectedFoods, dietaryPreferences);
    if (!validationResult.valid) {
      console.error("Erro de validação:", validationResult.errors);
      return new Response(
        JSON.stringify({ 
          error: "Dados inválidos para geração do plano alimentar",
          details: validationResult.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Calcular perfil nutricional
    const nutritionalProfile = calculateNutrition(userData, selectedFoods);
    
    // Análise de distribuição de refeições
    const mealDistribution = analyzeMealDistribution(userData, dietaryPreferences);
    
    // Ajustes baseados no treino
    const workoutAdjustments = analyzeWorkoutNutrition(userData, dietaryPreferences);
    
    // Construir o prompt para a IA
    let generationPrompt = `
    Como nutricionista, crie um plano alimentar semanal completo para uma pessoa com as seguintes características:
    
    DADOS DO USUÁRIO:
    - Sexo: ${userData.gender === "male" ? "Masculino" : "Feminino"}
    - Idade: ${userData.age} anos
    - Peso: ${userData.weight} kg
    - Altura: ${userData.height} cm
    - Nível de atividade: ${userData.activityLevel}
    - Objetivo: ${userData.goal === "lose" ? "Perda de peso" : userData.goal === "gain" ? "Ganho de massa" : "Manutenção"}
    - Necessidade calórica diária: ${userData.dailyCalories} kcal
    
    PREFERÊNCIAS E RESTRIÇÕES:
    - Alergias: ${dietaryPreferences.hasAllergies ? dietaryPreferences.allergies.join(", ") : "Nenhuma"}
    - Restrições alimentares: ${dietaryPreferences.dietaryRestrictions.length > 0 ? dietaryPreferences.dietaryRestrictions.join(", ") : "Nenhuma"}
    - Horário de treino: ${dietaryPreferences.trainingTime || "Não informado"}
    
    ALIMENTOS DISPONÍVEIS:
    ${selectedFoods.map(food => `- ${food.name} (${food.calories} kcal/porção, Proteínas: ${food.protein}g, Carboidratos: ${food.carbs}g, Gorduras: ${food.fats}g${food.fiber ? `, Fibras: ${food.fiber}g` : ''})`).join("\n")}
    
    DISTRIBUIÇÃO DE MACRONUTRIENTES RECOMENDADA:
    - Proteínas: ${nutritionalProfile.recommendedProtein}g/dia (${nutritionalProfile.proteinPercent}%)
    - Carboidratos: ${nutritionalProfile.recommendedCarbs}g/dia (${nutritionalProfile.carbsPercent}%)
    - Gorduras: ${nutritionalProfile.recommendedFats}g/dia (${nutritionalProfile.fatsPercent}%)
    - Fibras: Mínimo ${nutritionalProfile.recommendedFiber}g/dia
    
    DISTRIBUIÇÃO DE REFEIÇÕES:
    ${Object.entries(mealDistribution).map(([meal, info]) => `- ${meal}: ${info.calories} kcal (${info.percent}% das calorias diárias)`).join("\n")}
    
    AJUSTES PARA TREINO:
    ${workoutAdjustments.recommendations.join("\n")}
    
    ESTRUTURA DO PLANO:
    Crie um plano alimentar para 7 dias da semana (segunda a domingo), com 5 refeições diárias: café da manhã, lanche da manhã, almoço, lanche da tarde e jantar.
    
    Para cada refeição, especifique:
    1. Uma breve descrição da refeição
    2. Lista de alimentos com porções precisas em gramas ou unidades
    3. Valores nutricionais (calorias, proteínas, carboidratos, gorduras e fibras)
    
    Para cada dia, inclua os totais diários de calorias e macronutrientes.
    
    Ao final, inclua:
    1. Médias semanais de macronutrientes
    2. Recomendações gerais
    3. Sugestões pré e pós-treino
    4. Horários recomendados para refeições
    
    RESTRIÇÕES IMPORTANTES:
    1. Use APENAS os alimentos listados acima
    2. Respeite as restrições e alergias listadas
    3. Mantenha as calorias diárias próximas ao valor recomendado (±100 kcal)
    4. Distribua os macronutrientes conforme as recomendações
    5. Varie os alimentos ao longo da semana
    6. Considere o horário de treino para as refeições pré e pós-treino
    
    FORMATO DE RESPOSTA:
    Responda APENAS com um objeto JSON usando o seguinte formato (sem texto adicional fora do JSON):
    
    {
      "weeklyPlan": {
        "monday": {
          "dayName": "Segunda-feira",
          "meals": {
            "breakfast": {
              "description": "Descrição do café da manhã",
              "foods": [
                {"name": "Nome do alimento", "portion": 100, "unit": "g", "details": "Detalhes ou sugestão de preparo"},
                ...
              ],
              "calories": 500,
              "macros": {"protein": 30, "carbs": 40, "fats": 15, "fiber": 5}
            },
            "morningSnack": {...},
            "lunch": {...},
            "afternoonSnack": {...},
            "dinner": {...}
          },
          "dailyTotals": {"calories": 2000, "protein": 120, "carbs": 180, "fats": 60, "fiber": 25}
        },
        "tuesday": {...},
        "wednesday": {...},
        "thursday": {...},
        "friday": {...},
        "saturday": {...},
        "sunday": {...}
      },
      "weeklyTotals": {
        "averageCalories": 2000,
        "averageProtein": 120,
        "averageCarbs": 180,
        "averageFats": 60,
        "averageFiber": 25
      },
      "recommendations": {
        "general": "Recomendações gerais...",
        "preworkout": "Recomendações pré-treino...",
        "postworkout": "Recomendações pós-treino...",
        "timing": ["Café da manhã: 7h", "Lanche da manhã: 10h", ...]
      }
    }
    `;

    // Se houver alimentos organizados por tipo de refeição, adicione esta informação ao prompt
    if (foodsByMealType && Object.keys(foodsByMealType).length > 0) {
      let mealTypePrompt = "\nALIMENTOS POR TIPO DE REFEIÇÃO (PRIORIZE ESTES AGRUPAMENTOS):\n";
      
      for (const [mealType, foods] of Object.entries(foodsByMealType)) {
        if (Array.isArray(foods) && foods.length > 0) {
          let mealName = "";
          switch(mealType) {
            case "breakfast": mealName = "Café da manhã"; break;
            case "lunch": mealName = "Almoço"; break;
            case "dinner": mealName = "Jantar"; break;
            case "snack": mealName = "Lanches"; break;
            default: mealName = mealType;
          }
          
          mealTypePrompt += `- ${mealName}: ${foods.map(f => f.name).join(", ")}\n`;
        }
      }
      
      // Inserir as preferências de alimentos por refeição no prompt
      generationPrompt = generationPrompt.replace("ALIMENTOS DISPONÍVEIS:", "ALIMENTOS DISPONÍVEIS:" + mealTypePrompt);
    }

    // Opções avançadas
    if (options) {
      if (options.includeRecipes) {
        generationPrompt += "\nIncluir sugestões de preparo detalhadas para cada refeição.";
      }
      
      if (options.followNutritionalGuidelines) {
        generationPrompt += "\nSeguir rigorosamente as diretrizes nutricionais baseadas em evidências científicas.";
      }
      
      if (options.optimizeForMacros) {
        generationPrompt += "\nPriorizar a distribuição precisa de macronutrientes em cada refeição.";
      }
      
      if (options.enhanceNutritionalVariety) {
        generationPrompt += "\nMaximizar a variedade nutricional e incluir alimentos com diferentes perfis de micronutrientes.";
      }
      
      if (options.useSimplifiedTerms === false) {
        generationPrompt += "\nUtilizar terminologia nutricional técnica e precisa nas descrições.";
      }
    }

    console.log("Prompt gerado para IA:", generationPrompt.substring(0, 200) + "...");

    // Gerar o plano alimentar com o provedor selecionado
    console.log(`Gerando plano alimentar usando ${MODEL_PROVIDER}`);
    let mealPlan;
    
    try {
      if (MODEL_PROVIDER === "groq" && groqKey) {
        mealPlan = await generateWithGroq(generationPrompt);
      } else if (MODEL_PROVIDER === "deepseek" && deepseekKey) {
        mealPlan = await generateWithDeepseek(generationPrompt);
      } else if (MODEL_PROVIDER === "openai" && openaiKey) {
        mealPlan = await generateWithOpenAI(generationPrompt);
      } else {
        // Fallback para OpenAI se o provedor selecionado não estiver disponível
        console.log(`Provedor ${MODEL_PROVIDER} não disponível, usando OpenAI como fallback`);
        mealPlan = await generateWithOpenAI(generationPrompt);
      }
    } catch (generationError) {
      console.error(`Erro ao gerar plano com ${MODEL_PROVIDER}:`, generationError);
      
      // Tentar usar outro provedor como fallback
      try {
        if (MODEL_PROVIDER !== "groq" && groqKey) {
          console.log("Tentando fallback para Groq");
          mealPlan = await generateWithGroq(generationPrompt);
        } else if (MODEL_PROVIDER !== "openai" && openaiKey) {
          console.log("Tentando fallback para OpenAI");
          mealPlan = await generateWithOpenAI(generationPrompt);
        } else if (MODEL_PROVIDER !== "deepseek" && deepseekKey) {
          console.log("Tentando fallback para Deepseek");
          mealPlan = await generateWithDeepseek(generationPrompt);
        } else {
          throw new Error("Não foi possível gerar o plano alimentar com nenhum provedor");
        }
      } catch (fallbackError) {
        console.error("Erro no fallback:", fallbackError);
        
        // Se todos os provedores falharem, criar um plano alimentar básico
        mealPlan = createBasicMealPlan(userData, selectedFoods);
      }
    }

    console.log("Plano alimentar gerado com sucesso");
    
    // Otimizar porções se necessário
    if (mealPlan && mealPlan.weeklyPlan) {
      mealPlan = optimizeMeals(mealPlan, nutritionalProfile);
      mealPlan = calculatePortions(mealPlan, selectedFoods);
      
      // Adicionar pontuação nutricional
      const nutritionalScore = scoreNutritionalProfile(mealPlan, nutritionalProfile);
      mealPlan.nutritionalScore = nutritionalScore;
      
      // Gerar recomendações baseadas no plano
      if (!mealPlan.recommendations) {
        mealPlan.recommendations = generateRecommendations(userData, dietaryPreferences);
      }
    }

    // Registrar a geração do plano
    try {
      const { error } = await adminClient
        .from('meal_plans')
        .insert({
          user_id: userData.userId,
          plan_data: mealPlan,
          calories: userData.dailyCalories,
          created_at: new Date().toISOString()
        });
        
      if (error) {
        console.error("Erro ao salvar plano no banco de dados:", error);
      }
      
      // Registrar contagem de usos
      await adminClient
        .from('plan_generation_counts')
        .upsert({
          user_id: userData.userId,
          meal_plan_count: 1
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false
        });
    } catch (dbError) {
      console.error("Erro de banco de dados:", dbError);
    }

    // Retornar o plano alimentar
    return new Response(
      JSON.stringify({ mealPlan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na geração do plano alimentar:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Erro ao gerar plano alimentar", 
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

// Função para criar um plano básico de fallback
function createBasicMealPlan(userData: any, selectedFoods: any[]) {
  console.log("Criando plano alimentar básico de fallback");
  
  const dailyCalories = userData.dailyCalories || 2000;
  const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const displayNames = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  
  // Cálculo básico de macronutrientes
  const protein = Math.round(dailyCalories * 0.3 / 4); // 30% proteína (4 cal/g)
  const carbs = Math.round(dailyCalories * 0.45 / 4);  // 45% carboidratos (4 cal/g)
  const fats = Math.round(dailyCalories * 0.25 / 9);   // 25% gorduras (9 cal/g)
  const fiber = Math.round(dailyCalories / 80);        // Aproximadamente 25g para 2000 cal
  
  // Distribuição por refeição
  const breakfastCals = Math.round(dailyCalories * 0.25);
  const lunchCals = Math.round(dailyCalories * 0.35);
  const dinnerCals = Math.round(dailyCalories * 0.2);
  const snackCals = Math.round(dailyCalories * 0.1);
  
  // Função para selecionar alimentos aleatórios do array
  const getRandomFoods = (count: number) => {
    const shuffled = [...selectedFoods].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, selectedFoods.length));
  };
  
  // Criar um plano alimentar básico
  const weeklyPlan: Record<string, any> = {};
  
  dayNames.forEach((day, index) => {
    // Selecionar alimentos aleatórios para este dia
    const breakfastFoods = getRandomFoods(3);
    const morningSnackFoods = getRandomFoods(2);
    const lunchFoods = getRandomFoods(4);
    const afternoonSnackFoods = getRandomFoods(2);
    const dinnerFoods = getRandomFoods(3);
    
    // Criar o plano diário
    weeklyPlan[day] = {
      dayName: displayNames[index],
      meals: {
        breakfast: {
          description: `Café da manhã nutritivo com aproximadamente ${breakfastCals} calorias.`,
          foods: breakfastFoods.map(food => ({
            name: food.name,
            portion: food.portion || 100,
            unit: food.portionUnit || "g",
            details: "Alimento selecionado com base nas suas preferências"
          })),
          calories: breakfastCals,
          macros: {
            protein: Math.round(protein * 0.25),
            carbs: Math.round(carbs * 0.3),
            fats: Math.round(fats * 0.2),
            fiber: Math.round(fiber * 0.2)
          }
        },
        morningSnack: {
          description: `Lanche da manhã leve com aproximadamente ${snackCals} calorias.`,
          foods: morningSnackFoods.map(food => ({
            name: food.name,
            portion: food.portion || 50,
            unit: food.portionUnit || "g",
            details: "Alimento selecionado com base nas suas preferências"
          })),
          calories: snackCals,
          macros: {
            protein: Math.round(protein * 0.1),
            carbs: Math.round(carbs * 0.1),
            fats: Math.round(fats * 0.1),
            fiber: Math.round(fiber * 0.1)
          }
        },
        lunch: {
          description: `Almoço completo com aproximadamente ${lunchCals} calorias.`,
          foods: lunchFoods.map(food => ({
            name: food.name,
            portion: food.portion || 100,
            unit: food.portionUnit || "g",
            details: "Alimento selecionado com base nas suas preferências"
          })),
          calories: lunchCals,
          macros: {
            protein: Math.round(protein * 0.35),
            carbs: Math.round(carbs * 0.3),
            fats: Math.round(fats * 0.3),
            fiber: Math.round(fiber * 0.4)
          }
        },
        afternoonSnack: {
          description: `Lanche da tarde com aproximadamente ${snackCals} calorias.`,
          foods: afternoonSnackFoods.map(food => ({
            name: food.name,
            portion: food.portion || 50,
            unit: food.portionUnit || "g",
            details: "Alimento selecionado com base nas suas preferências"
          })),
          calories: snackCals,
          macros: {
            protein: Math.round(protein * 0.1),
            carbs: Math.round(carbs * 0.1),
            fats: Math.round(fats * 0.1),
            fiber: Math.round(fiber * 0.1)
          }
        },
        dinner: {
          description: `Jantar balanceado com aproximadamente ${dinnerCals} calorias.`,
          foods: dinnerFoods.map(food => ({
            name: food.name,
            portion: food.portion || 100,
            unit: food.portionUnit || "g",
            details: "Alimento selecionado com base nas suas preferências"
          })),
          calories: dinnerCals,
          macros: {
            protein: Math.round(protein * 0.2),
            carbs: Math.round(carbs * 0.2),
            fats: Math.round(fats * 0.3),
            fiber: Math.round(fiber * 0.2)
          }
        }
      },
      dailyTotals: {
        calories: dailyCalories,
        protein,
        carbs,
        fats,
        fiber
      }
    };
  });
  
  // Calcular totais semanais
  return {
    weeklyPlan,
    weeklyTotals: {
      averageCalories: dailyCalories,
      averageProtein: protein,
      averageCarbs: carbs,
      averageFats: fats,
      averageFiber: fiber
    },
    recommendations: {
      general: "Mantenha-se hidratado bebendo pelo menos 2 litros de água por dia. Tente consumir alimentos integrais em vez de processados sempre que possível. Inclua uma variedade de frutas e vegetais coloridos em sua dieta.",
      preworkout: "Consuma uma refeição rica em carboidratos e moderada em proteínas 1-2 horas antes do treino. Opções como batata doce com frango, pão integral com ovos ou banana com pasta de amendoim são boas escolhas.",
      postworkout: "Após o treino, consuma uma combinação de proteínas e carboidratos para auxiliar na recuperação muscular. Whey protein com banana, iogurte com frutas ou peito de frango com arroz são excelentes opções.",
      timing: [
        "Café da manhã: 7h-8h",
        "Lanche da manhã: 10h-11h",
        "Almoço: 12h-13h",
        "Lanche da tarde: 15h-16h",
        "Jantar: 19h-20h"
      ]
    }
  };
}
