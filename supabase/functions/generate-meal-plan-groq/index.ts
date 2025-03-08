
// generate-meal-plan-groq: Função Edge alternativa para geração de planos alimentares quando o método principal falha
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const requestData = await req.json();
    
    if (!requestData.userInput) {
      return new Response(
        JSON.stringify({ error: "Dados de entrada ausentes" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { userData, selectedFoods, preferences } = requestData.userInput;
    const userId = requestData.user_id || 'não autenticado';
    
    console.log(`[GROQ-FALLBACK] Gerando plano alimentar para usuário ${userId}`);
    console.log(`[GROQ-FALLBACK] Perfil: ${userData.age} anos, ${userData.gender}, ${userData.weight}kg, ${userData.height}cm`);
    console.log(`[GROQ-FALLBACK] Objetivo: ${userData.goal}, Calorias: ${userData.dailyCalories}kcal`);
    
    // Prepare for Groq API call
    if (!GROQ_API_KEY) {
      console.error("[GROQ-FALLBACK] Erro: GROQ_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Erro de configuração da API" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Simplified system message for better JSON generation
    const systemMessage = `Você é um especialista em nutrição que cria planos alimentares personalizados.
Gere um plano alimentar semanal válido em formato JSON. O formato DEVE ser o seguinte, com EXATAMENTE estes nomes de propriedades:

{
  "weeklyPlan": {
    "segunda": { "dayName": "Segunda-feira", "meals": { "cafeDaManha": { ... }, ... }, "dailyTotals": { ... } },
    "terca": { ... },
    ...
  },
  "weeklyTotals": { "averageCalories": X, "averageProtein": X, ... },
  "recommendations": { "general": "...", "preworkout": "...", "postworkout": "...", "timing": ["...", "..."] }
}

Os macronutrientes devem ser NÚMEROS INTEIROS sem unidades. Arredonde todos os valores.`;

    // User message with essential data
    const userMessage = `Crie um plano alimentar que atenda:
- Perfil: ${userData.age} anos, ${userData.gender}, ${userData.weight}kg, ${userData.height}cm
- Nível de atividade: ${userData.activityLevel}
- Objetivo: ${userData.goal}
- Meta: ${userData.dailyCalories} calorias/dia
- ${preferences?.hasAllergies ? `Alergias: ${preferences.allergies.join(', ')}` : 'Sem alergias'}
- ${preferences?.dietaryRestrictions?.length ? `Restrições: ${preferences.dietaryRestrictions.join(', ')}` : 'Sem restrições'}
- ${preferences?.trainingTime ? `Horário de treino: ${preferences.trainingTime}` : 'Sem horário específico de treino'}
- Alimentos disponíveis: ${selectedFoods?.join(', ') || 'Todos os alimentos comuns'}

O plano deve ter 7 dias, com 5 refeições por dia (cafeDaManha, lancheDaManha, almoco, lancheDaTarde, jantar).`;

    // Call Groq API with optimized settings
    console.log("[GROQ-FALLBACK] Chamando API Groq para gerar plano alimentar alternativo");
    
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // Usar um modelo mais potente para o fallback
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        temperature: 0.2,         // Temperatura menor para mais consistência
        max_tokens: 4000,
        top_p: 0.95,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GROQ-FALLBACK] Erro da API (${response.status}):`, errorText);
      return new Response(
        JSON.stringify({ error: `Erro na API Groq: ${response.status}`, details: errorText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Process the API response
    const groqResponse = await response.json();
    
    if (!groqResponse.choices || !groqResponse.choices[0] || !groqResponse.choices[0].message) {
      console.error("[GROQ-FALLBACK] Resposta inválida da API Groq");
      return new Response(
        JSON.stringify({ error: "Resposta inválida da API" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Parse the meal plan from the API response
    try {
      const mealPlanContent = groqResponse.choices[0].message.content;
      console.log(`[GROQ-FALLBACK] Resposta recebida (${mealPlanContent.length} caracteres)`);
      
      // Parse the meal plan JSON
      const mealPlan = JSON.parse(mealPlanContent);
      
      // Validate the structure
      if (!mealPlan.weeklyPlan) {
        throw new Error("Estrutura do plano alimentar inválida: weeklyPlan ausente");
      }
      
      // Process all values to ensure they're integers
      const processValues = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === 'number') {
            obj[key] = Math.round(obj[key]);
          } else if (typeof obj[key] === 'string' && !isNaN(obj[key])) {
            obj[key] = Math.round(parseFloat(obj[key]));
          } else if (Array.isArray(obj[key])) {
            obj[key].forEach(item => {
              if (typeof item === 'object' && item !== null) {
                processValues(item);
              }
            });
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            processValues(obj[key]);
          }
        });
        return obj;
      };
      
      const processedMealPlan = processValues(mealPlan);
      
      // Add metadata
      processedMealPlan.userCalories = userData.dailyCalories;
      processedMealPlan.modelUsed = "llama3-70b-fallback";
      processedMealPlan.generatedAt = new Date().toISOString();
      
      console.log("[GROQ-FALLBACK] Plano alimentar gerado com sucesso");
      
      return new Response(
        JSON.stringify({ mealPlan: processedMealPlan }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (jsonError) {
      console.error("[GROQ-FALLBACK] Erro ao processar JSON:", jsonError.message);
      return new Response(
        JSON.stringify({ error: "Falha ao processar o plano alimentar", details: jsonError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("[GROQ-FALLBACK] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
