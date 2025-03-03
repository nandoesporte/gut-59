
// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.deno.com/runtime/manual/getting_started/

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const groqApiKey = Deno.env.get("GROQ_API_KEY") || "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const requestData = await req.json();
    const { preferences, userId, settings, forceTrene2025 = false, forceGroqApi = false } = requestData;

    console.log("Processing workout plan generation request");
    console.log("User preferences:", JSON.stringify(preferences));
    console.log("Using Groq API for Llama 3 model integration");
    
    // API Key validation
    const apiKey = settings?.groq_api_key || groqApiKey;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Chave API Groq não configurada. Configure nas configurações de AI Model Settings ou nos segredos da função Edge.");
    }

    // Determine which model to use (always using Llama 3 model via Groq)
    const model = "llama3-8b-8192";
    const apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";
    
    console.log(`Generating plan with model ${model} via Groq API`);
    
    // Prepare system prompt
    const systemPrompt = getSystemPrompt(settings, forceTrene2025);
    
    // Generate workout plan using Groq API
    const workoutPlan = await generatePlanWithGroq(apiEndpoint, apiKey, model, systemPrompt, preferences);
    
    if (!workoutPlan) {
      throw new Error("Falha ao gerar o plano de treino");
    }

    console.log("Workout plan generated successfully:", JSON.stringify(workoutPlan).substring(0, 200) + "...");

    // Return the generated workout plan
    return new Response(JSON.stringify({ 
      workoutPlan: workoutPlan 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating workout plan:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Function to get system prompt
function getSystemPrompt(settings: any, forceTrene2025: boolean) {
  // If settings specify to use custom prompt and one is provided, use it
  if (settings?.use_custom_prompt && settings?.system_prompt) {
    return settings.system_prompt;
  }
  
  // Default prompt
  return `Você é TRENE2025, um agente de IA especializado em educação física e nutrição esportiva.
Seu objetivo é criar planos de treino detalhados, personalizados e cientificamente embasados.
Você deve fornecer um plano completo, com exercícios, séries, repetições e dicas específicas.

Formato do plano de treino:
{
  "goal": "objetivo_do_treino",
  "start_date": "data_inicio",
  "end_date": "data_fim",
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "descrição do aquecimento",
      "cooldown_description": "descrição da volta à calma",
      "session_exercises": [
        {
          "sets": 3,
          "reps": 12,
          "rest_time_seconds": 60,
          "exercise": {
            "id": "ID_DO_EXERCICIO",
            "name": "Nome do Exercício",
            "description": "Descrição detalhada",
            "gif_url": "URL da animação",
            "muscle_group": "grupo_muscular",
            "exercise_type": "tipo_exercicio"
          }
        }
      ]
    }
  ]
}`;
}

// Function to generate workout plan with Groq API
async function generatePlanWithGroq(apiEndpoint: string, apiKey: string, model: string, systemPrompt: string, preferences: any) {
  console.log(`Generating plan with model ${model}`);
  
  // Create a detailed user prompt based on preferences
  const userPrompt = createUserPrompt(preferences);
  
  try {
    console.log("Sending request to Groq API...");
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("API Error Response:", errorData);
      throw new Error(`API error: ${response.status} - ${errorData}`);
    }
    
    console.log("Received response from Groq API");
    const result = await response.json();
    
    // Extract the assistant's message
    const assistantMessage = result.choices[0].message.content;
    
    // Try to parse the JSON response
    try {
      // Find JSON object in the response
      const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("No JSON object found in the response");
        console.log("Raw response:", assistantMessage);
        throw new Error("No JSON object found in the response");
      }
      
      const jsonString = jsonMatch[0];
      console.log("Extracted JSON:", jsonString.substring(0, 200) + "...");
      
      const workoutPlan = JSON.parse(jsonString);
      return workoutPlan;
    } catch (parseError) {
      console.error("Error parsing workout plan JSON:", parseError);
      console.log("Raw response:", assistantMessage);
      throw new Error("Erro ao processar o plano de treino gerado");
    }
  } catch (error) {
    console.error("Error generating plan with Groq:", error.message);
    throw new Error(`Falha ao gerar plano via API Groq: ${error.message}`);
  }
}

// Function to create a detailed user prompt based on preferences
function createUserPrompt(preferences: any) {
  return `Crie um plano de treino detalhado baseado nas seguintes preferências:

Informações básicas:
- Idade: ${preferences.age || "Não informada"}
- Sexo: ${preferences.gender || "Não informado"}
- Peso: ${preferences.weight || "Não informado"} kg
- Altura: ${preferences.height || "Não informada"} cm
- Nível de atividade: ${preferences.activity_level || "Moderado"}
- Objetivo: ${preferences.goal || "Ganho de massa muscular"}
- Local de treinamento: ${preferences.training_location || "Academia"}
- Equipamentos disponíveis: ${(preferences.available_equipment || []).join(', ') || "Todos os equipamentos padrão de academia"}
- Preferência de exercícios: ${(preferences.preferred_exercise_types || []).join(', ') || "Variados"}
- Condições de saúde: ${(preferences.health_conditions || []).join(', ') || "Nenhuma"}
- Frequência de treino por semana: ${preferences.days_per_week || 3}

Crie um plano de treino completo com 3 dias, respeitando as preferências acima. 
Retorne apenas o objeto JSON com o plano completo, sem texto adicional.`;
}
