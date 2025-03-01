
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Definindo os tipos para o payload
interface UserData {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  userId: string;
  dailyCalories: number;
}

interface FoodData {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  portion: number;
  portionUnit: string;
  food_group_id: number;
  nutritionix_data?: any;
}

interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

interface RequestPayload {
  userData: UserData;
  selectedFoods: FoodData[];
  foodsByMealType: Record<string, FoodData[]>;
  dietaryPreferences: DietaryPreferences;
  modelConfig: {
    model: string;
    provider: string;
  };
}

interface NutriPlusConfig {
  useAdvancedNutrition: boolean;
  includeMealTimings: boolean;
  generateGroceryList: boolean;
  includeNutritionalAnalysis: boolean;
  optimizeForPerformance: boolean;
}

const LLAMA_API_KEY = Deno.env.get("LLAMA_API_KEY") || "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";

console.log("Starting generate-meal-plan-nutri-plus edge function");

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: RequestPayload = await req.json();
    const { userData, selectedFoods, foodsByMealType, dietaryPreferences } = payload;
    
    console.log(`Processando requisição Nutri+ para usuário: ${userData.userId}`);
    console.log(`Calorias diárias: ${userData.dailyCalories}, Objetivo: ${userData.goal}`);
    console.log(`Alimentos selecionados: ${selectedFoods.length}`);
    
    const nutriPlusConfig: NutriPlusConfig = {
      useAdvancedNutrition: true,
      includeMealTimings: true,
      generateGroceryList: true,
      includeNutritionalAnalysis: true,
      optimizeForPerformance: dietaryPreferences.trainingTime !== null
    };
    
    console.log("Configuração Nutri+:", nutriPlusConfig);

    // Decidindo qual modelo usar com base na complexidade
    const useGroq = selectedFoods.length > 15 || 
                    dietaryPreferences.allergies.length > 3 || 
                    dietaryPreferences.dietaryRestrictions.length > 2;
    
    const modelEndpoint = useGroq 
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.llama-api.com/chat/completions";
    
    const modelApiKey = useGroq ? GROQ_API_KEY : LLAMA_API_KEY;
    const modelName = useGroq ? "mixtral-8x7b-32768" : "llama3:8b";
    
    console.log(`Usando modelo ${modelName} via ${useGroq ? 'Groq' : 'Llama API'}`);

    // Construir o prompt para o agente Nutri+
    const systemPrompt = `Você é o Nutri+, um assistente especializado em nutrição que cria planos alimentares completos e detalhados. 
Seu papel é utilizar informações sobre necessidades calóricas, alimentos disponíveis, restrições alimentares e objetivos do usuário para criar um plano alimentar abrangente.

INSTRUÇÕES CRÍTICAS PARA O PLANO ALIMENTAR:
1. Crie um plano alimentar semanal completo (7 dias) baseado em informações fornecidas.
2. Distribua ${userData.dailyCalories} calorias diárias entre cinco refeições: café da manhã, lanche da manhã, almoço, lanche da tarde e jantar.
3. Use APENAS os alimentos listados em "selectedFoods".
4. Siga a categorização de alimentos por refeição em "foodsByMealType" quando disponível.
5. Atenda às restrições dietéticas e alergias informadas em "dietaryPreferences".
6. Equilibre macronutrientes para o objetivo de "${userData.goal}" adaptado a uma pessoa de ${userData.gender}, ${userData.age} anos com nível de atividade "${userData.activityLevel}".
7. As refeições devem ser variadas e não repetitivas ao longo da semana.
8. Especifique porções precisas para cada alimento.
9. Calcule nutrientes totais para cada refeição e dia.
10. Forneça recomendações personalizadas para otimizar resultados.

Todas as estatísticas nutricionais DEVEM ser precisamente calculadas com base nas informações dos alimentos fornecidos.

Retorne APENAS um objeto JSON seguindo exatamente este formato:
{
  "userCalories": número,
  "weeklyPlan": {
    "monday": {
      "dayName": "Segunda",
      "meals": {
        "breakfast": {
          "description": "Café da Manhã",
          "foods": [{"name": "string", "portion": número, "unit": "string", "details": "string"}],
          "calories": número,
          "macros": {"protein": número, "carbs": número, "fats": número, "fiber": número}
        },
        "morningSnack": { ... },
        "lunch": { ... },
        "afternoonSnack": { ... },
        "dinner": { ... }
      },
      "dailyTotals": {"calories": número, "protein": número, "carbs": número, "fats": número, "fiber": número}
    },
    "tuesday": { ... },
    "wednesday": { ... },
    "thursday": { ... },
    "friday": { ... },
    "saturday": { ... },
    "sunday": { ... }
  },
  "weeklyTotals": {
    "averageCalories": número,
    "averageProtein": número,
    "averageCarbs": número,
    "averageFats": número,
    "averageFiber": número
  },
  "recommendations": {
    "general": "string",
    "preworkout": "string",
    "postworkout": "string",
    "timing": ["string", "string", ...]
  }
}`;

    // Criar a requisição para o modelo LLM
    const llmRequest = {
      model: modelName,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify({
            userData,
            selectedFoods,
            foodsByMealType,
            dietaryPreferences,
            nutriPlusConfig
          })
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    };

    console.log("Enviando requisição para o modelo LLM...");
    
    // Definir timeout para a requisição
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 150000); // 2.5 minutos de timeout
    
    try {
      const llmResponse = await fetch(modelEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${modelApiKey}`
        },
        body: JSON.stringify(llmRequest),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        console.error(`Erro na API do modelo: ${llmResponse.status} - ${errorText}`);
        throw new Error(`Erro na API do modelo: ${llmResponse.status}`);
      }

      const llmData = await llmResponse.json();
      
      if (!llmData.choices || llmData.choices.length === 0) {
        console.error("Resposta inválida do modelo:", llmData);
        throw new Error("Resposta inválida do modelo");
      }

      // Extrair o conteúdo JSON da resposta do modelo
      let mealPlanJson;
      try {
        const content = llmData.choices[0].message.content;
        // Remover marcadores de código se presentes
        const jsonContent = content.replace(/```json|```/g, '').trim();
        mealPlanJson = JSON.parse(jsonContent);
        
        console.log("Plano alimentar gerado com sucesso!");
      } catch (parseError) {
        console.error("Erro ao processar resposta JSON:", parseError);
        console.log("Conteúdo recebido:", llmData.choices[0].message.content);
        throw new Error("Falha ao processar resposta do modelo");
      }

      // Validação básica do plano gerado
      const requiredDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const missingDays = requiredDays.filter(day => !mealPlanJson.weeklyPlan[day]);
      
      if (missingDays.length > 0) {
        console.warn(`Dias ausentes no plano: ${missingDays.join(', ')}`);
        throw new Error("Plano incompleto gerado pelo modelo");
      }

      return new Response(
        JSON.stringify({ mealPlan: mealPlanJson }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          },
          status: 200
        }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("Erro na chamada do modelo:", fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error(`Erro na Edge Function Nutri+: ${error.message}`);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        detail: "Falha ao gerar plano alimentar Nutri+"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 500
      }
    );
  }
});
