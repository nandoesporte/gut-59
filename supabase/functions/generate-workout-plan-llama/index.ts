
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    // Initialize tracking of when the edge function fully starts
    console.log("✅ Edge function initialized and running");
    
    // Get API key from environment variables
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    
    // Parse request body
    const { exercises, preferences, customPrompt, requestId } = await req.json();
    
    // Validate the input
    if (!preferences) {
      throw new Error("Preferences must be provided");
    }
    
    if (!exercises || !Array.isArray(exercises)) {
      throw new Error("Exercises must be provided as an array");
    }
    
    // Validate that we have the required preferences for the workout plan
    const requiredFields = ["age", "weight", "height", "gender", "goal", "activity_level", "preferred_exercise_types"];
    
    for (const field of requiredFields) {
      if (!preferences[field]) {
        throw new Error(`Missing required preference: ${field}`);
      }
    }
    
    if (!GROQ_API_KEY) {
      throw new Error("GROQ API key is required but not configured in environment variables");
    }

    console.log("Sorting exercises by relevance to user goal...");
    const sortedExercises = sortExercisesByGoal(exercises, preferences);
    console.log(`Exercises sorted by relevance to user goal: ${preferences.goal}`);

    console.log("Generating workout plan with Trenner2025 agent...");
    const startTime = performance.now();
    const workoutPlan = await generateWorkoutPlanWithTrenner2025(
      sortedExercises,
      preferences,
      undefined,
      false,
      GROQ_API_KEY
    );
    const endTime = performance.now();
    console.log(`✅ Workout plan generated successfully in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    
    // Return the successful response with CORS headers
    return new Response(
      JSON.stringify({ 
        workoutPlan: workoutPlan,
        rawResponse: workoutPlan
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error("Error in edge function:", error);
    
    // Format error message
    let errorMessage = error.message || "An unknown error occurred";
    
    // Check for specific error types and format accordingly
    if (errorMessage.includes("GROQ_API_KEY") || errorMessage.includes("api_key")) {
      errorMessage = "API key configuration error: " + errorMessage;
    }
    
    // Return error response with CORS headers
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

// Function to sort exercises by relevance to user's goal
function sortExercisesByGoal(exercises, preferences) {
  console.log(`Sorting ${exercises.length} exercises by relevance to user goal: ${preferences.goal}`);
  
  // Priority map based on exercise type and user goal
  const priorityMap = {
    "strength": preferences.goal === "gain_mass" ? 10 : 5,
    "cardio": preferences.goal === "lose_weight" ? 10 : 5,
    "mobility": 3
  };

  // Make a copy of the exercises array to avoid modifying the original
  const sortedExercises = [...exercises];
  
  // Sort exercises by relevance
  sortedExercises.sort((a, b) => {
    // First prioritize exercises with GIFs
    if (a.gif_url && !b.gif_url) return -1;
    if (!a.gif_url && b.gif_url) return 1;
    
    // Then prioritize by exercise type relevance to goal
    const aScore = priorityMap[a.exercise_type] || 0;
    const bScore = priorityMap[b.exercise_type] || 0;
    
    // If scores are equal, prioritize by description completeness
    if (aScore === bScore) {
      const aHasDescription = a.description && a.description.length > 10;
      const bHasDescription = b.description && b.description.length > 10;
      
      if (aHasDescription && !bHasDescription) return -1;
      if (!aHasDescription && bHasDescription) return 1;
    }
    
    return bScore - aScore; // Higher scores first
  });
  
  console.log(`Successfully sorted exercises by relevance to goal: ${preferences.goal}`);
  console.log(`Top 3 exercise types after sorting: ${sortedExercises.slice(0, 3).map(ex => ex.exercise_type).join(', ')}`);
  
  return sortedExercises;
}

async function generateWorkoutPlanWithTrenner2025(
  exercises,
  preferences,
  customSystemPrompt,
  useCustomPrompt = false,
  apiKey,
  agentName = "TRENNER2025"
) {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Invalid API Key for Groq");
  }

  // Define the default system prompt based on the Trenner2025 agent requirements
  const defaultSystemPrompt = `
  Você é o Trenner2025, um agente especializado em criar planos de treino personalizados. 
  Seu trabalho é criar planos detalhados baseados nas informações do usuário.
  
  REGRAS DE DECISÃO:
  
  1. OBJETIVO:
     - Perder Peso: Prioriza cardio e treinos de alta intensidade (HIIT).
     - Manter Peso: Combina cardio e força com intensidade moderada.
     - Ganhar Massa: Foca em treinos de força com cargas progressivas.
  
  2. NÍVEL DE ATIVIDADE FÍSICA:
     - Sedentário: Treinos mais curtos e de baixa intensidade.
     - Leve: 1-3 dias de treino com foco em adaptação.
     - Moderado: 3-5 dias de treino com intensidade média.
     - Intenso: 6-7 dias de treino com alta intensidade.
  
  3. LOCAL DE TREINO:
     - Academia: Inclui exercícios com equipamentos profissionais.
     - Casa: Usa equipamentos básicos (halteres, elásticos, etc.).
     - Ar Livre: Foca em exercícios funcionais e cardio.
     - Sem Equipamentos: Utiliza apenas peso corporal.
  
  4. TIPOS DE EXERCÍCIOS PREFERIDOS:
     - Força: Prioriza exercícios com pesos e resistência.
     - Cardio: Inclui corrida, bicicleta, HIIT, etc.
     - Mobilidade: Foca em alongamentos, yoga e exercícios de flexibilidade.
  
  FORMATO DE SAÍDA:
  {
    "id": "UUID",
    "user_id": "UUID",
    "goal": "objetivo_do_treino",
    "start_date": "data_inicio",
    "end_date": "data_fim",
    "workout_sessions": [
      {
        "id": "UUID",
        "day_number": 1,
        "day_name": "Nome do treino (ex: Peito e Tríceps)",
        "focus": "Foco do treino",
        "warmup_description": "Descrição do aquecimento",
        "cooldown_description": "Descrição do desaquecimento",
        "session_exercises": [
          {
            "id": "UUID",
            "sets": 4,
            "reps": 10,
            "rest_time_seconds": 60,
            "intensity": "Moderada/Alta/Máxima",
            "exercise": {
              "id": "UUID",
              "name": "Nome do exercício",
              "gif_url": "URL_GIF",
              "description": "Descrição do exercício",
              "muscle_group": "grupo_muscular",
              "exercise_type": "tipo_exercicio"
            }
          }
        ],
        "training_load": {
          "intensity": "Descrição da intensidade",
          "volume": "Descrição do volume",
          "progression": "Descrição da progressão"
        }
      }
    ],
    "critique": {
      "strengths": [
        "Ponto forte 1",
        "Ponto forte 2"
      ],
      "suggestions": [
        "Sugestão 1",
        "Sugestão 2"
      ],
      "notes": "Notas adicionais sobre o plano"
    }
  }
  
  Gere um plano completo com 4-6 dias de treino baseado no objetivo e nível da pessoa.
  `;

  const systemPrompt = useCustomPrompt && customSystemPrompt ? customSystemPrompt : defaultSystemPrompt;

  // Use the sorted exercises
  const exerciseList = exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    description: ex.description,
    gif_url: ex.gif_url,
    muscle_group: ex.muscle_group,
    exercise_type: ex.exercise_type,
    difficulty: ex.difficulty
  }));

  // Calculate the BMI
  const bmi = preferences.weight / ((preferences.height / 100) ** 2);
  
  // Get the weight range for the exercises based on user gender, weight, and goal
  let suggestedWeightRange;
  
  if (preferences.gender === "male") {
    if (preferences.goal === "gain_mass") {
      suggestedWeightRange = `${Math.round(preferences.weight * 0.6)} - ${Math.round(preferences.weight * 0.8)} kg`;
    } else if (preferences.goal === "lose_weight") {
      suggestedWeightRange = `${Math.round(preferences.weight * 0.3)} - ${Math.round(preferences.weight * 0.5)} kg`;
    } else {
      suggestedWeightRange = `${Math.round(preferences.weight * 0.4)} - ${Math.round(preferences.weight * 0.6)} kg`;
    }
  } else {
    if (preferences.goal === "gain_mass") {
      suggestedWeightRange = `${Math.round(preferences.weight * 0.5)} - ${Math.round(preferences.weight * 0.7)} kg`;
    } else if (preferences.goal === "lose_weight") {
      suggestedWeightRange = `${Math.round(preferences.weight * 0.2)} - ${Math.round(preferences.weight * 0.4)} kg`;
    } else {
      suggestedWeightRange = `${Math.round(preferences.weight * 0.3)} - ${Math.round(preferences.weight * 0.5)} kg`;
    }
  }

  try {
    console.log("Calling Groq API with Llama 3 70B model...");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `
            Por favor, crie um plano de treino personalizado para um usuário com as seguintes características:
            
            Peso: ${preferences.weight} kg
            Altura: ${preferences.height} cm
            Idade: ${preferences.age} anos
            Sexo: ${preferences.gender === "male" ? "Masculino" : "Feminino"}
            Objetivo: ${preferences.goal === "lose_weight" ? "Perder Peso" : preferences.goal === "maintain" ? "Manter Peso" : "Ganhar Massa"}
            Nível de Atividade Física: ${preferences.activity_level === "sedentary" ? "Sedentário" : 
                                     preferences.activity_level === "light" ? "Leve" : 
                                     preferences.activity_level === "moderate" ? "Moderado" : "Intenso"}
            Tipos de Exercícios Preferidos: ${preferences.preferred_exercise_types.join(", ")}
            Local de Treino: ${preferences.available_equipment.includes("all") ? "Academia" : 
                             preferences.available_equipment.includes("dumbbells") ? "Casa" : 
                             preferences.available_equipment.includes("resistance-bands") ? "Ar Livre" : "Sem Equipamentos"}
            
            BMI: ${bmi.toFixed(1)}
            Peso sugerido para exercícios: ${suggestedWeightRange}
            
            Você tem acesso a ${exerciseList.length} exercícios. Adicione para cada sessão apenas os exercícios relevantes para aquele dia de treino.
            Não invente exercícios. Use apenas os exercícios que estão na lista fornecida.
            `
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq API Error:", errorData);
      throw new Error(`Groq API Error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    let generatedPlan;
    
    try {
      // Try to extract and parse the JSON from the completion
      const content = data.choices[0].message.content;
      
      // Look for a JSON object in the content
      const jsonMatch = content.match(/```json\s*({[\s\S]*?})\s*```/) || 
                        content.match(/{[\s\S]*"workout_sessions"[\s\S]*}/);
      
      if (jsonMatch) {
        generatedPlan = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        // If no JSON pattern is found, try to parse the whole content
        generatedPlan = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse JSON from response:", parseError);
      console.log("Raw response content:", data.choices[0].message.content);
      
      // Create a basic structure with the raw content to avoid breaking the UI
      generatedPlan = {
        id: crypto.randomUUID(),
        user_id: "system",
        goal: `${preferences.goal}`,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        workout_sessions: [],
        raw_content: data.choices[0].message.content,
        parse_error: parseError.message
      };
    }
    
    // Ensure the plan has the required structure
    if (!generatedPlan.id) generatedPlan.id = crypto.randomUUID();
    if (!generatedPlan.user_id) generatedPlan.user_id = "system";
    if (!generatedPlan.start_date) generatedPlan.start_date = new Date().toISOString();
    if (!generatedPlan.end_date) generatedPlan.end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Add raw content for reference
    generatedPlan.raw_assistant_response = data.choices[0].message.content;
    
    return generatedPlan;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw new Error(`Failed to generate workout plan: ${error.message}`);
  }
}
