
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  preferences: any;
  userId: string;
  agentName?: string; // Optional parameter for agent name
  settings?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: RequestBody = await req.json();
    
    // Extract data from request
    const { preferences, userId, agentName = "TRENE2025", settings } = requestData;
    
    if (!preferences || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: preferences and userId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const startTime = Date.now();
    console.log(`🏋️ Starting workout plan generation for user ${userId} with ${agentName}`);
    console.log(`Preferences: ${JSON.stringify(preferences)}`);

    // Determine which model to use
    const useGroq = !settings || settings.active_model === "llama3" || settings.active_model === "groq";
    const groqApiKey = settings?.groq_api_key || Deno.env.get("GROQ_API_KEY");
    
    if (useGroq && (!groqApiKey || groqApiKey.trim() === "")) {
      console.error("Groq API key is missing or invalid");
      // Fall back to OpenAI if Groq API key is not available
      console.log("Falling back to OpenAI due to missing Groq API key");
      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      
      if (!openaiApiKey || openaiApiKey.trim() === "") {
        return new Response(
          JSON.stringify({ error: "No valid API keys available. Please configure Groq or OpenAI API keys." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    // Step 1: Fetch exercises based on preferences
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("*")
      .order("name");

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch exercises" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Filter exercises based on preferences
    const filteredExercises = filterExercisesByPreferences(exercises, preferences);
    console.log(`Filtered ${filteredExercises.length} exercises from ${exercises.length} total exercises`);

    // Step 2: Generate the workout plan using LLM
    let workoutPlan;
    let generationError = null;
    
    try {
      if (useGroq && groqApiKey && groqApiKey.trim() !== "") {
        // Use Groq with Llama 3
        console.log("Attempting to generate workout plan with Groq (Llama 3)");
        workoutPlan = await generateWorkoutPlanWithGroq(
          filteredExercises, 
          preferences,
          settings?.system_prompt,
          settings?.use_custom_prompt === true,
          groqApiKey,
          agentName
        );
      } else {
        // Fallback to OpenAI
        console.log("Using OpenAI for workout plan generation");
        const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
        workoutPlan = await generateWorkoutPlanWithOpenAI(
          filteredExercises, 
          preferences,
          settings?.system_prompt,
          settings?.use_custom_prompt === true,
          openaiApiKey,
          agentName
        );
      }
    } catch (error) {
      console.error("Error during workout plan generation:", error);
      generationError = error.message || "Unknown error during generation";
    }

    if (generationError) {
      return new Response(
        JSON.stringify({ error: `Failed to generate workout plan: ${generationError}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!workoutPlan) {
      return new Response(
        JSON.stringify({ error: "Failed to generate workout plan" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Log execution time
    const executionTime = Date.now() - startTime;
    console.log(`✅ Workout plan generated successfully in ${executionTime / 1000} seconds`);

    // Return the workout plan
    return new Response(
      JSON.stringify({ workoutPlan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating workout plan:", error);
    return new Response(
      JSON.stringify({ error: `Failed to generate workout plan: ${error.message}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function filterExercisesByPreferences(exercises: any[], preferences: any) {
  let filteredExercises = [...exercises];

  // Filter by exercise types if specified
  if (preferences.preferred_exercise_types && preferences.preferred_exercise_types.length > 0) {
    filteredExercises = filteredExercises.filter(exercise => 
      preferences.preferred_exercise_types.includes(exercise.exercise_type)
    );
  }

  // Filter by equipment availability based on training location
  if (preferences.available_equipment && preferences.available_equipment.length > 0) {
    // If "all" is included, no need to filter by equipment
    if (!preferences.available_equipment.includes("all")) {
      filteredExercises = filteredExercises.filter(exercise => {
        // If exercise doesn't require equipment, include it
        if (!exercise.equipment_needed || exercise.equipment_needed.length === 0) {
          return true;
        }
        
        // Check if at least one of the exercise's required equipment is available
        return exercise.equipment_needed.some((equipment: string) => 
          preferences.available_equipment.includes(equipment)
        );
      });
    }
  }

  // Additional filtering logic can be added here

  // Ensure we have enough exercises (minimum 30)
  if (filteredExercises.length < 30) {
    console.log(`Warning: Only ${filteredExercises.length} exercises match the criteria. Adding more exercises...`);
    
    // Add more exercises that match at least the exercise type
    const additionalExercises = exercises.filter(exercise => 
      !filteredExercises.includes(exercise) && 
      preferences.preferred_exercise_types.includes(exercise.exercise_type)
    );
    
    filteredExercises = [...filteredExercises, ...additionalExercises];
    
    // If still not enough, add any exercises
    if (filteredExercises.length < 30) {
      const remainingExercises = exercises.filter(exercise => 
        !filteredExercises.includes(exercise)
      );
      
      filteredExercises = [...filteredExercises, ...remainingExercises.slice(0, 30 - filteredExercises.length)];
    }
    
    console.log(`Added additional exercises. Now using ${filteredExercises.length} exercises.`);
  }

  return filteredExercises;
}

async function generateWorkoutPlanWithGroq(
  exercises: any[],
  preferences: any,
  customSystemPrompt?: string,
  useCustomPrompt = false,
  apiKey?: string,
  agentName = "TRENE2025"
) {
  const groqApiKey = apiKey || Deno.env.get("GROQ_API_KEY");
  
  if (!groqApiKey) {
    throw new Error("Groq API key is required but not provided");
  }

  // Prepare the system prompt
  const defaultSystemPrompt = `Você é ${agentName}, um agente de IA especializado em educação física e ciência do exercício. 
Sua tarefa é criar um plano de treino personalizado com base nas preferências e necessidades do usuário. 
Você deve utilizar apenas os exercícios fornecidos na lista de exercícios disponíveis. 
Crie um plano de treino semanal detalhado, com dias específicos, séries, repetições e descrições.`;

  const systemPrompt = useCustomPrompt && customSystemPrompt ? customSystemPrompt : defaultSystemPrompt;

  // Prepare the exercises in a condensed format
  const exerciseList = exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    muscle_group: ex.muscle_group,
    exercise_type: ex.exercise_type,
    difficulty: ex.difficulty,
    equipment_needed: ex.equipment_needed,
    description: ex.description,
    gif_url: ex.gif_url
  }));

  // Construct the prompt for the workout plan generation
  const userPrompt = `
Com base nas preferências do usuário a seguir, crie um plano de treino personalizado dividido por dias da semana.

PREFERÊNCIAS DO USUÁRIO:
- Idade: ${preferences.age} anos
- Sexo: ${preferences.gender === 'male' ? 'Masculino' : 'Feminino'}
- Peso: ${preferences.weight} kg
- Altura: ${preferences.height} cm
- Objetivo: ${translateGoal(preferences.goal)}
- Nível de atividade física: ${translateActivityLevel(preferences.activity_level)}
- Tipos de exercícios preferidos: ${translateExerciseTypes(preferences.preferred_exercise_types)}
- Local de treino: ${translateTrainingLocation(preferences)}
${preferences.health_conditions && preferences.health_conditions.length > 0 ? 
  `- Condições de saúde: ${preferences.health_conditions.join(', ')}` : ''}

EXERCÍCIOS DISPONÍVEIS:
${JSON.stringify(exerciseList).substring(0, 14000)}

INSTRUÇÕES:
1. Crie um plano de treino para 7 dias, com descanso nos dias apropriados dependendo do nível do usuário.
2. Para cada dia, inclua:
   - Um aquecimento breve mas efetivo
   - Lista de exercícios com séries e repetições específicas
   - Tempo de descanso entre séries
   - Uma volta à calma
3. Escolha apenas exercícios da lista fornecida acima.
4. As séries e repetições devem ser adequadas ao objetivo e nível do usuário.
5. Respeite quaisquer condições de saúde mencionadas.

FORMATO DE RESPOSTA: 
Responda APENAS com um objeto JSON válido no seguinte formato sem nenhum texto adicional:

{
  "goal": "objetivo traduzido",
  "start_date": "data de início no formato YYYY-MM-DD",
  "end_date": "data de fim no formato YYYY-MM-DD",
  "workout_sessions": [
    {
      "day_number": número do dia (1-7),
      "warmup_description": "descrição do aquecimento",
      "cooldown_description": "descrição da volta à calma",
      "session_exercises": [
        {
          "exercise": {
            "id": "id do exercício da lista",
            "name": "nome do exercício",
            "description": "descrição do exercício",
            "gif_url": "url do gif do exercício",
            "muscle_group": "grupo muscular",
            "exercise_type": "tipo de exercício"
          },
          "sets": número de séries,
          "reps": número de repetições,
          "rest_time_seconds": tempo de descanso em segundos
        }
      ]
    }
  ]
}

Lembre-se: sua resposta deve ser APENAS o objeto JSON válido, nada mais.`;

  try {
    console.log("Calling Groq API with Llama 3...");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Groq API Error:", errorData);
      throw new Error(`Groq API Error: ${response.status} ${response.statusText}\n${errorData}`);
    }

    const data = await response.json();
    console.log("Groq API response received:", data);

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from Groq API");
    }

    // Extract and parse the workout plan from the response
    const content = data.choices[0].message.content;
    let workoutPlan;

    try {
      // Attempt to extract JSON if it's wrapped in code blocks or other text
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) || 
                        content.match(/({[\s\S]*})/);
      
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      workoutPlan = JSON.parse(jsonString);
      
      console.log("Successfully parsed workout plan JSON");
    } catch (parseError) {
      console.error("Error parsing workout plan JSON:", parseError);
      console.log("Raw content:", content);
      throw new Error(`Failed to parse workout plan: ${parseError.message}`);
    }

    return workoutPlan;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw new Error(`Failed to generate workout plan with Groq: ${error.message}`);
  }
}

async function generateWorkoutPlanWithOpenAI(
  exercises: any[],
  preferences: any,
  customSystemPrompt?: string,
  useCustomPrompt = false,
  apiKey?: string,
  agentName = "TRENE2025"
) {
  const openaiApiKey = apiKey || Deno.env.get("OPENAI_API_KEY");
  
  if (!openaiApiKey) {
    throw new Error("OpenAI API key is required but not provided");
  }

  // Prepare the system prompt
  const defaultSystemPrompt = `Você é ${agentName}, um agente de IA especializado em educação física e ciência do exercício. 
Sua tarefa é criar um plano de treino personalizado com base nas preferências e necessidades do usuário. 
Você deve utilizar apenas os exercícios fornecidos na lista de exercícios disponíveis. 
Crie um plano de treino semanal detalhado, com dias específicos, séries, repetições e descrições.`;

  const systemPrompt = useCustomPrompt && customSystemPrompt ? customSystemPrompt : defaultSystemPrompt;

  // Prepare the exercises in a condensed format
  const exerciseList = exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    muscle_group: ex.muscle_group,
    exercise_type: ex.exercise_type,
    difficulty: ex.difficulty,
    equipment_needed: ex.equipment_needed,
    description: ex.description,
    gif_url: ex.gif_url
  }));

  // Construct the prompt for the workout plan generation
  const userPrompt = `
Com base nas preferências do usuário a seguir, crie um plano de treino personalizado dividido por dias da semana.

PREFERÊNCIAS DO USUÁRIO:
- Idade: ${preferences.age} anos
- Sexo: ${preferences.gender === 'male' ? 'Masculino' : 'Feminino'}
- Peso: ${preferences.weight} kg
- Altura: ${preferences.height} cm
- Objetivo: ${translateGoal(preferences.goal)}
- Nível de atividade física: ${translateActivityLevel(preferences.activity_level)}
- Tipos de exercícios preferidos: ${translateExerciseTypes(preferences.preferred_exercise_types)}
- Local de treino: ${translateTrainingLocation(preferences)}
${preferences.health_conditions && preferences.health_conditions.length > 0 ? 
  `- Condições de saúde: ${preferences.health_conditions.join(', ')}` : ''}

EXERCÍCIOS DISPONÍVEIS:
${JSON.stringify(exerciseList).substring(0, 14000)}

INSTRUÇÕES:
1. Crie um plano de treino para 7 dias, com descanso nos dias apropriados dependendo do nível do usuário.
2. Para cada dia, inclua:
   - Um aquecimento breve mas efetivo
   - Lista de exercícios com séries e repetições específicas
   - Tempo de descanso entre séries
   - Uma volta à calma
3. Escolha apenas exercícios da lista fornecida acima.
4. As séries e repetições devem ser adequadas ao objetivo e nível do usuário.
5. Respeite quaisquer condições de saúde mencionadas.

FORMATO DE RESPOSTA: 
Responda APENAS com um objeto JSON válido no seguinte formato sem nenhum texto adicional:

{
  "goal": "objetivo traduzido",
  "start_date": "data de início no formato YYYY-MM-DD",
  "end_date": "data de fim no formato YYYY-MM-DD",
  "workout_sessions": [
    {
      "day_number": número do dia (1-7),
      "warmup_description": "descrição do aquecimento",
      "cooldown_description": "descrição da volta à calma",
      "session_exercises": [
        {
          "exercise": {
            "id": "id do exercício da lista",
            "name": "nome do exercício",
            "description": "descrição do exercício",
            "gif_url": "url do gif do exercício",
            "muscle_group": "grupo muscular",
            "exercise_type": "tipo de exercício"
          },
          "sets": número de séries,
          "reps": número de repetições,
          "rest_time_seconds": tempo de descanso em segundos
        }
      ]
    }
  ]
}

Lembre-se: sua resposta deve ser APENAS o objeto JSON válido, nada mais.`;

  try {
    console.log("Calling OpenAI API...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API Error:", errorData);
      throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}\n${errorData}`);
    }

    const data = await response.json();
    console.log("OpenAI API response received");

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from OpenAI API");
    }

    // Extract and parse the workout plan from the response
    const content = data.choices[0].message.content;
    let workoutPlan;

    try {
      // Attempt to extract JSON if it's wrapped in code blocks or other text
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) || 
                        content.match(/({[\s\S]*})/);
      
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      workoutPlan = JSON.parse(jsonString);
      
      console.log("Successfully parsed workout plan JSON");
    } catch (parseError) {
      console.error("Error parsing workout plan JSON:", parseError);
      console.log("Raw content:", content);
      throw new Error(`Failed to parse workout plan: ${parseError.message}`);
    }

    return workoutPlan;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new Error(`Failed to generate workout plan with OpenAI: ${error.message}`);
  }
}

function translateGoal(goal: string): string {
  switch (goal) {
    case "lose_weight":
      return "Perder Peso";
    case "maintain":
      return "Manter Peso";
    case "gain_mass":
      return "Ganhar Massa";
    default:
      return goal;
  }
}

function translateActivityLevel(level: string): string {
  switch (level) {
    case "sedentary":
      return "Sedentário";
    case "light":
      return "Leve";
    case "moderate":
      return "Moderado";
    case "intense":
      return "Intenso";
    default:
      return level;
  }
}

function translateExerciseTypes(types: string[]): string {
  if (!types || types.length === 0) {
    return "Todos";
  }
  
  return types.map(type => {
    switch (type) {
      case "strength":
        return "Força";
      case "cardio":
        return "Cardio";
      case "mobility":
        return "Mobilidade";
      default:
        return type;
    }
  }).join(", ");
}

function translateTrainingLocation(preferences: any): string {
  if (!preferences.available_equipment) {
    return "Não especificado";
  }
  
  if (preferences.available_equipment.includes("all")) {
    return "Academia";
  }
  
  if (preferences.available_equipment.includes("dumbbells")) {
    return "Casa";
  }
  
  if (preferences.available_equipment.includes("bodyweight") && !preferences.available_equipment.includes("dumbbells")) {
    return "Ar Livre";
  }
  
  return "Sem Equipamentos";
}
