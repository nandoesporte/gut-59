
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.24.0";

// Configurações para CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Criando cliente Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração do agente Nutri+
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const MODEL = "llama3-8b-8192";

interface NutriPlusRequest {
  userData: {
    weight: number;
    height: number;
    age: number;
    gender: string;
    activityLevel: string;
    goal: string;
    userId: string;
    dailyCalories: number;
  };
  selectedFoods: Array<{
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    portion: number;
    portionUnit: string;
    food_group_id?: number;
    nutritionix_data?: {
      serving_unit: string;
      serving_qty: number;
      serving_weight_grams: number;
    };
  }>;
  foodsByMealType: Record<string, any[]>;
  dietaryPreferences: {
    hasAllergies: boolean;
    allergies: string[];
    dietaryRestrictions: string[];
    trainingTime: string | null;
  };
  model?: string;
}

interface MealPlanStructure {
  weeklyPlan: {
    [day: string]: {
      dayName: string;
      meals: {
        breakfast: {
          description: string;
          foods: Array<{name: string; portion: number; unit: string; details: string}>;
          calories: number;
          macros: {protein: number; carbs: number; fats: number; fiber: number};
        };
        morningSnack: {
          description: string;
          foods: Array<{name: string; portion: number; unit: string; details: string}>;
          calories: number;
          macros: {protein: number; carbs: number; fats: number; fiber: number};
        };
        lunch: {
          description: string;
          foods: Array<{name: string; portion: number; unit: string; details: string}>;
          calories: number;
          macros: {protein: number; carbs: number; fats: number; fiber: number};
        };
        afternoonSnack: {
          description: string;
          foods: Array<{name: string; portion: number; unit: string; details: string}>;
          calories: number;
          macros: {protein: number; carbs: number; fats: number; fiber: number};
        };
        dinner: {
          description: string;
          foods: Array<{name: string; portion: number; unit: string; details: string}>;
          calories: number;
          macros: {protein: number; carbs: number; fats: number; fiber: number};
        };
      };
      dailyTotals: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
      };
    };
  };
  weeklyTotals: {
    averageCalories: number;
    averageProtein: number;
    averageCarbs: number;
    averageFats: number;
    averageFiber: number;
  };
  recommendations: {
    general: string;
    preworkout: string;
    postworkout: string;
    timing: string[];
  };
}

serve(async (req) => {
  console.log("Nutri+ Agent: Recebendo requisição");
  
  // Tratar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GROQ_API_KEY) {
      console.error("Nutri+ Agent: API key do Groq não configurada");
      return new Response(
        JSON.stringify({ error: "API key do Groq não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Obter dados da requisição
    const requestData = await req.json() as NutriPlusRequest;
    console.log("Nutri+ Agent: Dados recebidos para processamento");
    
    // Validar dados essenciais
    if (!requestData.userData || !requestData.selectedFoods || requestData.selectedFoods.length === 0) {
      console.error("Nutri+ Agent: Dados insuficientes para gerar o plano alimentar");
      return new Response(
        JSON.stringify({ error: "Dados insuficientes para gerar o plano alimentar" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Construir o prompt para o agente Nutri+
    const systemPrompt = `
Você é o Nutri+, um agente de nutrição especializado desenvolvido para criar planos alimentares personalizados, detalhados e cientificamente fundamentados.

IMPORTANTE: Sua saída deve ser APENAS um objeto JSON válido seguindo EXATAMENTE a estrutura que vou definir. Não inclua nenhum texto, comentário ou explicação adicional. Sua resposta completa deve ser um objeto JSON válido que possa ser parseado diretamente.

Use estas diretrizes obrigatórias:
1. Crie um plano alimentar completo para 7 dias da semana (monday a sunday) usando APENAS os alimentos na lista fornecida.
2. Distribua os alimentos de acordo com a categorização por refeição fornecida quando disponível.
3. Respeite RIGOROSAMENTE as calorias diárias especificadas (${requestData.userData.dailyCalories} kcal/dia).
4. Equilibre as refeições de acordo com o objetivo: ${requestData.userData.goal}.
5. Considere as restrições alimentares: ${requestData.dietaryPreferences.dietaryRestrictions.join(", ") || "Nenhuma"}.
6. Evite alergias declaradas: ${requestData.dietaryPreferences.allergies.join(", ") || "Nenhuma"}.
7. Faça porções realistas baseadas no peso corporal (${requestData.userData.weight} kg).
8. Otimize a distribuição de macronutrientes para o objetivo (proteínas: 1.6-2.2g/kg para ganho muscular, 1.2-1.6g/kg para manutenção, 1.8-2.2g/kg para perda de peso).
9. Considere o horário de treino: ${requestData.dietaryPreferences.trainingTime || "Não especificado"}.
10. Diversifique ao máximo o plano para todos os 7 dias da semana.
11. Forneça detalhes nutricionais precisos para cada refeição (calorias, proteínas, carboidratos, gorduras, fibras).
12. Inclua descrições realistas para cada refeição, não apenas listar alimentos.
13. Para cada alimento, especifique porções em unidades apropriadas (g, ml, unidades).
14. Inclua recomendações nutricionais baseadas em evidências científicas.
15. IMPORTANTE: No campo "details" de cada alimento, forneça informações nutricionais relevantes ou dicas de preparação.
16. Calcule com precisão os totais diários e médias semanais.

A estrutura do JSON deve seguir exatamente este formato:
\`\`\`json
{
  "weeklyPlan": {
    "monday": {
      "dayName": "Segunda-feira",
      "meals": {
        "breakfast": {
          "description": "Descrição do café da manhã",
          "foods": [
            {"name": "Nome do alimento", "portion": 100, "unit": "g", "details": "Detalhes nutricionais"}
          ],
          "calories": 500,
          "macros": {"protein": 30, "carbs": 60, "fats": 15, "fiber": 5}
        },
        "morningSnack": {
          "description": "Descrição do lanche da manhã",
          "foods": [...],
          "calories": 200,
          "macros": {"protein": 10, "carbs": 25, "fats": 5, "fiber": 3}
        },
        "lunch": {
          "description": "Descrição do almoço",
          "foods": [...],
          "calories": 700,
          "macros": {"protein": 40, "carbs": 80, "fats": 20, "fiber": 8}
        },
        "afternoonSnack": {
          "description": "Descrição do lanche da tarde",
          "foods": [...],
          "calories": 200,
          "macros": {"protein": 15, "carbs": 20, "fats": 5, "fiber": 3}
        },
        "dinner": {
          "description": "Descrição do jantar",
          "foods": [...],
          "calories": 600,
          "macros": {"protein": 35, "carbs": 60, "fats": 20, "fiber": 6}
        }
      },
      "dailyTotals": {
        "calories": 2200,
        "protein": 130,
        "carbs": 245,
        "fats": 65,
        "fiber": 25
      }
    },
    "tuesday": {...},
    "wednesday": {...},
    "thursday": {...},
    "friday": {...},
    "saturday": {...},
    "sunday": {...}
  },
  "weeklyTotals": {
    "averageCalories": 2200,
    "averageProtein": 130,
    "averageCarbs": 245,
    "averageFats": 65,
    "averageFiber": 25
  },
  "recommendations": {
    "general": "Recomendações gerais baseadas no perfil e objetivos",
    "preworkout": "Recomendações específicas para alimentação pré-treino",
    "postworkout": "Recomendações específicas para alimentação pós-treino",
    "timing": [
      "Recomendação 1 sobre tempo entre refeições",
      "Recomendação 2 sobre distribuição calórica"
    ]
  }
}
\`\`\`

Lembre-se que o JSON deve ser válido e completo, com todos os dias da semana preenchidos conforme especificado.
`;

    // Preparar os dados de usuário no formato para o prompt
    const userPrompt = `
DADOS DO USUÁRIO:
- Peso: ${requestData.userData.weight} kg
- Altura: ${requestData.userData.height} cm
- Idade: ${requestData.userData.age} anos
- Gênero: ${requestData.userData.gender}
- Nível de atividade: ${requestData.userData.activityLevel}
- Objetivo: ${requestData.userData.goal}
- Calorias diárias recomendadas: ${requestData.userData.dailyCalories} kcal

PREFERÊNCIAS DIETÉTICAS:
- Possui alergias: ${requestData.dietaryPreferences.hasAllergies ? 'Sim' : 'Não'}
- Alergias: ${requestData.dietaryPreferences.allergies.length > 0 ? requestData.dietaryPreferences.allergies.join(', ') : 'Nenhuma'}
- Restrições alimentares: ${requestData.dietaryPreferences.dietaryRestrictions.length > 0 ? requestData.dietaryPreferences.dietaryRestrictions.join(', ') : 'Nenhuma'}
- Horário de treino: ${requestData.dietaryPreferences.trainingTime || 'Não especificado'}

ALIMENTOS SELECIONADOS:
${JSON.stringify(requestData.selectedFoods, null, 2)}

ALIMENTOS POR REFEIÇÃO:
${JSON.stringify(requestData.foodsByMealType, null, 2)}

Crie um plano alimentar semanal completo conforme as instruções acima. Sua resposta DEVE ser um objeto JSON válido e completo seguindo a estrutura especificada.
`;

    console.log("Nutri+ Agent: Enviando solicitação para o modelo Llama3");

    // Chamada para a API Groq com o modelo Llama3
    const apiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Nutri+ Agent: Erro na API Groq: ${apiResponse.status} - ${errorText}`);
      throw new Error(`Erro na API Groq: ${apiResponse.status} - ${errorText}`);
    }

    const groqResponse = await apiResponse.json();
    console.log("Nutri+ Agent: Resposta recebida da API Groq");

    if (!groqResponse.choices || !groqResponse.choices[0]) {
      console.error("Nutri+ Agent: Resposta da API Groq não contém escolhas");
      throw new Error("Resposta da API Groq inválida");
    }

    // Extrair a resposta JSON do modelo
    const modelResponse = groqResponse.choices[0].message.content;
    console.log("Nutri+ Agent: Resposta do modelo extraída");

    // Tentar fazer parse do JSON da resposta
    let mealPlan: MealPlanStructure;
    try {
      // Remover possíveis caracteres de formatação Markdown que o modelo possa ter incluído
      const cleanedResponse = modelResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      mealPlan = JSON.parse(cleanedResponse);
      console.log("Nutri+ Agent: JSON parseado com sucesso");
    } catch (parseError) {
      console.error("Nutri+ Agent: Erro ao fazer parse do JSON:", parseError);
      console.error("Nutri+ Agent: Resposta do modelo:", modelResponse);
      throw new Error("Erro ao processar resposta do modelo Llama3");
    }

    // Validar a resposta
    if (!mealPlan.weeklyPlan || !mealPlan.weeklyTotals || !mealPlan.recommendations) {
      console.error("Nutri+ Agent: Estrutura do plano alimentar inválida");
      throw new Error("Estrutura do plano alimentar inválida");
    }

    // Validar cada dia da semana no plano
    const requiredDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const day of requiredDays) {
      if (!mealPlan.weeklyPlan[day]) {
        console.error(`Nutri+ Agent: Dia da semana faltando no plano: ${day}`);
        throw new Error(`Dia da semana faltando no plano: ${day}`);
      }
    }

    // Salvar o plano gerado no histórico
    try {
      const { error: saveError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: requestData.userData.userId,
          plan_data: mealPlan,
          calories: requestData.userData.dailyCalories,
          agent: "nutri-plus",
          model: MODEL,
          dietary_preferences: requestData.dietaryPreferences
        });

      if (saveError) {
        console.error("Nutri+ Agent: Erro ao salvar plano no histórico:", saveError);
        // Continuar mesmo com erro no salvamento
      } else {
        console.log("Nutri+ Agent: Plano salvo com sucesso no histórico");
      }
    } catch (dbError) {
      console.error("Nutri+ Agent: Erro de banco de dados:", dbError);
      // Continuar mesmo com erro no banco de dados
    }

    // Retornar o plano alimentar ao cliente
    console.log("Nutri+ Agent: Enviando plano alimentar para o cliente");
    return new Response(
      JSON.stringify({ mealPlan }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Nutri+ Agent: Erro crítico:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        details: error instanceof Error ? error.stack : null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
