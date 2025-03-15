import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

const apiKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

serve(async (req) => {
  // Handle CORS pre-flight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(supabaseUrl ?? '', apiKey ?? '', {
      auth: {
        persistSession: false,
      },
    });

    const { body } = await req.json();

    console.log('Received workout preferences:', body.preferences);
    console.log('User ID:', body.userId);
    console.log('AI Settings:', body.settings);
    console.log('Exercises:', body.exercises);

    // Validate request body
    if (!body || !body.preferences || !body.userId) {
      console.error('Invalid request body:', body);
      return new Response(JSON.stringify({ message: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { preferences, userId, settings, exercises } = body;

    // Fetch user profile to get additional information
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(JSON.stringify({ message: 'Error fetching user profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enrich preferences with user profile data
    const enrichedPreferences = { ...preferences, ...userProfile };

    // Construct user prompt
    const userPrompt = constructUserPrompt(enrichedPreferences, exercises);
    console.log('User Prompt:', userPrompt);

    // Determine which AI model to use
    const activeModel = settings?.activeModel || 'llama3';
    const useCustomPrompt = settings?.useCustomPrompt || false;
    const systemPrompt = useCustomPrompt ? settings?.systemPrompt : getDefaultPrompt();
    const groqApiKey = settings?.groqApiKey || Deno.env.get('GROQ_API_KEY');

    console.log(`Using AI model: ${activeModel}`);

    let workoutPlan;
    let rawResponse;

    // Call the appropriate function based on the active model
    if (activeModel === 'gpt4') {
      console.log('Calling GPT-4 to generate workout plan...');
      const gpt4Response = await generatePlanWithGPT4(systemPrompt, userPrompt, openAiApiKey);
      workoutPlan = gpt4Response;
      rawResponse = gpt4Response;
    } else {
      console.log('Calling Groq API to generate workout plan...');
      const groqResponse = await generatePlanWithGroq(systemPrompt, userPrompt, groqApiKey);
      workoutPlan = groqResponse;
      rawResponse = groqResponse;
    }

    // Check if workoutPlan is already a JSON object
    let parsedWorkoutPlan;
    if (typeof workoutPlan === 'string') {
      try {
        parsedWorkoutPlan = JSON.parse(workoutPlan);
      } catch (e) {
        console.error('Failed to parse workout plan JSON:', e);
        return new Response(JSON.stringify({ message: 'Failed to parse workout plan JSON' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      parsedWorkoutPlan = workoutPlan;
    }

    // Check if parsedWorkoutPlan has the expected structure
    if (!parsedWorkoutPlan || typeof parsedWorkoutPlan !== 'object' || !parsedWorkoutPlan.workoutPlan) {
      console.error('Invalid workout plan format:', parsedWorkoutPlan);
      return new Response(JSON.stringify({ message: 'Invalid workout plan format' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return the workout plan
    return new Response(JSON.stringify(parsedWorkoutPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-workout-plan-llama:', error);
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function callGroqWithRetry(payload, apiKey, retryCount = 0) {
  try {
    console.log(`Calling Groq API (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Check for rate limit error
      if (data.error && 
          data.error.code === 'rate_limit_exceeded' && 
          retryCount < MAX_RETRIES) {
        
        // Extract retry time if available or use exponential backoff
        let retryAfter = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        
        if (data.error.message) {
          const match = data.error.message.match(/try again in (\d+(\.\d+)?)s/i);
          if (match && match[1]) {
            // Use the suggested retry time from the error message plus a small buffer
            retryAfter = Math.ceil(parseFloat(match[1]) * 1000) + 500;
          }
        }
        
        console.log(`Rate limit hit. Retrying in ${retryAfter/1000} seconds...`);
        
        // Wait for the specified time
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        
        // Retry the call
        return callGroqWithRetry(payload, apiKey, retryCount + 1);
      }
      
      // For non-rate limit errors or if we've exceeded retries, throw the error
      throw new Error(`Groq API Error: ${JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    if (retryCount < MAX_RETRIES && 
        error.message && 
        error.message.includes('rate_limit_exceeded')) {
      
      const retryAfter = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Error with rate limit. Retrying in ${retryAfter/1000} seconds...`);
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      return callGroqWithRetry(payload, apiKey, retryCount + 1);
    }
    
    // If we've hit max retries or it's not a rate limit error, rethrow
    throw error;
  }
}

async function generatePlanWithGroq(systemPrompt, userPrompt, groqApiKey) {
  try {
    const payload = {
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 8000
    };
    
    // Use our new retry function instead of direct fetch
    const data = await callGroqWithRetry(payload, groqApiKey);
    
    if (!data.choices || !data.choices[0]) {
      throw new Error("Unexpected response format from Groq API");
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating plan with Groq:", error);
    
    // If we still hit errors after retries, try falling back to a simpler plan generation
    console.log("Attempting to create fallback workout plan...");
    return createFallbackWorkoutPlan(userPrompt);
  }
}

async function generatePlanWithGPT4(systemPrompt, userPrompt, openAiApiKey) {
  try {
    const payload = {
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${JSON.stringify(data)}`);
    }

    if (!data.choices || !data.choices[0]) {
      throw new Error('Unexpected response format from OpenAI API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating plan with GPT-4:', error);
    throw error;
  }
}

function constructUserPrompt(preferences, exercises) {
  // Start with basic details
  let prompt = `
  Objetivo: ${preferences.goal}
  Idade: ${preferences.age}
  Peso: ${preferences.weight} kg
  Altura: ${preferences.height} cm
  Sexo: ${preferences.gender}
  Nível de atividade: ${preferences.activity_level}
  Dias por semana: ${preferences.days_per_week}
  Tipos de exercício preferidos: ${preferences.preferred_exercise_types.join(', ')}
  Equipamento disponível: ${preferences.available_equipment.join(', ')}
  `;

  // Add health conditions if available
  if (preferences.health_conditions && preferences.health_conditions.length > 0) {
    prompt += `Condições de saúde: ${preferences.health_conditions.join(', ')}\n`;
  }

  // Include a list of available exercises
  if (exercises && exercises.length > 0) {
    prompt += `
    Lista de exercícios disponíveis:
    ${exercises.map(exercise => `- ${exercise.name} (${exercise.muscle_group}, ${exercise.exercise_type})`).join('\n')}
    `;
  } else {
    prompt += `Nenhuma lista de exercícios fornecida. Por favor, use os exercícios mais comuns.`;
  }

  // Add instructions for the AI
  prompt += `
  Com base nas informações acima, crie um plano de treino detalhado.
  O plano deve incluir:
  - Um objetivo claro e alcançável.
  - Uma programação semanal com exercícios específicos para cada dia.
  - Descrições detalhadas de cada exercício, incluindo séries, repetições e tempo de descanso.
  - Recomendações de peso para cada exercício, se aplicável.
  - Instruções de aquecimento e resfriamento.
  - Dicas de nutrição e estilo de vida para apoiar o objetivo.
  
  Formate a resposta como um objeto JSON com as seguintes propriedades:
  - goal: string
  - start_date: string (YYYY-MM-DD)
  - end_date: string (YYYY-MM-DD)
  - workout_sessions: array de objetos com as seguintes propriedades:
    - day_number: number (1-7)
    - day_name: string
    - focus: string
    - warmup_description: string
    - cooldown_description: string
    - session_exercises: array de objetos com as seguintes propriedades:
      - exercise: objeto com as seguintes propriedades:
        - id: string
        - name: string
        - description: string
        - gif_url: string
        - muscle_group: string
        - exercise_type: string
      - sets: number
      - reps: number
      - rest_time_seconds: number
      - weight_recommendations: objeto com as seguintes propriedades:
        - beginner: string
        - moderate: string
        - advanced: string
  `;

  // Return the complete prompt
  return prompt;
}

function getDefaultPrompt() {
  return `Você é Trenner2025, um agente de IA especializado em educação física e nutrição esportiva. 
Seu objetivo é criar planos de treino detalhados, personalizados e cientificamente embasados.
Você deve fornecer um plano completo, com exercícios, séries, repetições e dicas específicas.`;
}

function createFallbackWorkoutPlan(promptText) {
  try {
    console.log("Creating fallback workout plan based on preferences...");
    
    // Parse the user preferences from the prompt if possible
    let preferences = {};
    try {
      // Try to extract JSON-like structures from the prompt
      const match = promptText.match(/\{[\s\S]*\}/);
      if (match) {
        const jsonStr = match[0];
        preferences = JSON.parse(jsonStr);
      }
    } catch (e) {
      console.log("Could not parse preferences from prompt, using defaults");
      // Continue with empty preferences
    }
    
    // Generate a basic template for a workout plan
    const daysPerWeek = preferences.days_per_week || 3;
    const goal = preferences.goal || "maintain";
    
    // Create basic workout schedule
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 28); // 4 weeks plan
    
    const dayNames = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
    const workoutFocus = [
      ["chest", "triceps", "shoulders"], // Push day
      ["back", "biceps", "core"],       // Pull day
      ["legs", "core", "arms"],         // Legs day
      ["chest", "shoulders", "triceps"], // Push variation
      ["back", "biceps", "core"],       // Pull variation
      ["legs", "core", "arms"],         // Legs variation
      []                                // Rest day
    ];
    
    // Map days based on activity level
    const getDaysForActivityLevel = (daysPerWeek) => {
      switch(daysPerWeek) {
        case 2: return [1, 3]; // Tuesday and Thursday
        case 3: return [0, 2, 4]; // Monday, Wednesday, Friday
        case 5: return [0, 1, 2, 3, 4]; // Monday through Friday
        case 6: return [0, 1, 2, 3, 4, 5]; // Monday through Saturday
        default: return Array.from({length: daysPerWeek}, (_, i) => i);
      }
    };
    
    const activeDays = getDaysForActivityLevel(daysPerWeek);
    
    // Create a simple workout plan structure
    const workoutPlan = {
      goal: getGoalDescription(goal),
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      workout_sessions: Array(7).fill(null).map((_, i) => {
        const isActiveDay = activeDays.includes(i);
        
        return {
          day_number: i + 1,
          day_name: isActiveDay ? dayNames[i] : `${dayNames[i]} (Descanso)`,
          focus: isActiveDay ? 
            `${workoutFocus[i].map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(' + ')}` :
            "Recuperação",
          warmup_description: isActiveDay ? 
            "Aquecimento geral de 5-10 minutos com exercícios leves e alongamentos dinâmicos." :
            "Dia de descanso. Foque em recuperação e alongamentos leves.",
          cooldown_description: isActiveDay ?
            "Alongamentos estáticos para os músculos trabalhados, 15-30 segundos cada." :
            "Realize atividades de lazer e recuperação.",
          session_exercises: isActiveDay ? 
            generateBasicExercises(workoutFocus[i]) : 
            []
        };
      })
    };
    
    // Return the plan as a JSON string to match the expected format
    return JSON.stringify({ workoutPlan });
  } catch (error) {
    console.error("Error creating fallback workout plan:", error);
    throw new Error("Failed to create workout plan. Please try again later.");
  }
}

function getGoalDescription(goal) {
  switch(goal) {
    case "lose_weight": 
      return "Perda de peso e condicionamento";
    case "gain_mass":
      return "Hipertrofia e ganho de massa muscular";
    case "maintain":
    default:
      return "Manutenção da saúde e condicionamento físico";
  }
}

function generateBasicExercises(muscleGroups) {
  // Map of basic exercises for each muscle group
  const exercisesByMuscleGroup = {
    chest: [
      { name: "Flexão de braço", sets: 3, reps: 12, rest_time_seconds: 60 },
      { name: "Supino com halteres", sets: 3, reps: 10, rest_time_seconds: 90 },
      { name: "Crucifixo", sets: 3, reps: 12, rest_time_seconds: 60 }
    ],
    back: [
      { name: "Remada curvada", sets: 3, reps: 12, rest_time_seconds: 60 },
      { name: "Puxada na máquina", sets: 3, reps: 10, rest_time_seconds: 90 },
      { name: "Remada sentada", sets: 3, reps: 12, rest_time_seconds: 60 }
    ],
    legs: [
      { name: "Agachamento", sets: 3, reps: 12, rest_time_seconds: 90 },
      { name: "Leg press", sets: 3, reps: 10, rest_time_seconds: 120 },
      { name: "Extensão de joelhos", sets: 3, reps: 15, rest_time_seconds: 60 }
    ],
    shoulders: [
      { name: "Elevação lateral", sets: 3, reps: 12, rest_time_seconds: 60 },
      { name: "Desenvolvimento com halteres", sets: 3, reps: 10, rest_time_seconds: 90 }
    ],
    arms: [
      { name: "Rosca direta", sets: 3, reps: 12, rest_time_seconds: 60 },
      { name: "Tríceps corda", sets: 3, reps: 12, rest_time_seconds: 60 }
    ],
    core: [
      { name: "Abdominal tradicional", sets: 3, reps: 15, rest_time_seconds: 45 },
      { name: "Prancha", sets: 3, reps: "30s", rest_time_seconds: 30 }
    ],
    triceps: [
      { name: "Tríceps francês", sets: 3, reps: 12, rest_time_seconds: 60 },
      { name: "Tríceps no banco", sets: 3, reps: 10, rest_time_seconds: 60 }
    ],
    biceps: [
      { name: "Rosca alternada", sets: 3, reps: 12, rest_time_seconds: 60 },
      { name: "Rosca martelo", sets: 3, reps: 10, rest_time_seconds: 60 }
    ]
  };
  
  // Generate exercises for the muscle groups of the day
  let dayExercises = [];
  const usedExerciseNames = new Set();
  
  muscleGroups.forEach(group => {
    const groupExercises = exercisesByMuscleGroup[group] || [];
    
    // Add 2 exercises per muscle group, ensuring no duplicates
    groupExercises.slice(0, 2).forEach((ex, i) => {
      if (!usedExerciseNames.has(ex.name)) {
        usedExerciseNames.add(ex.name);
        
        // Create a proper session exercise object
        dayExercises.push({
          id: `exercise_${group}_${i}`,
          exercise: {
            id: `${group}_${i}_ex`,
            name: ex.name,
            description: `Exercício para ${group}`,
            muscle_group: group,
            exercise_type: "strength"
          },
          sets: ex.sets,
          reps: ex.reps,
          rest_time_seconds: ex.rest_time_seconds,
          weight_recommendations: generateWeightRecommendations(group)
        });
      }
    });
  });
  
  // Ensure at least 6 exercises per workout
  if (dayExercises.length < 6) {
    // Add exercises from other muscle groups to reach 6
    Object.keys(exercisesByMuscleGroup).forEach(group => {
      if (dayExercises.length >= 6) return;
      
      if (!muscleGroups.includes(group)) {
        const groupExercises = exercisesByMuscleGroup[group] || [];
        
        groupExercises.forEach((ex, i) => {
          if (dayExercises.length >= 6) return;
          if (!usedExerciseNames.has(ex.name)) {
            usedExerciseNames.add(ex.name);
            
            dayExercises.push({
              id: `exercise_${group}_${i}`,
              exercise: {
                id: `${group}_${i}_ex`,
                name: ex.name,
                description: `Exercício complementar para ${group}`,
                muscle_group: group,
                exercise_type: "strength"
              },
              sets: ex.sets,
              reps: ex.reps,
              rest_time_seconds: ex.rest_time_seconds,
              weight_recommendations: generateWeightRecommendations(group)
            });
          }
        });
      }
    });
  }
  
  return dayExercises;
}

function generateWeightRecommendations(muscleGroup) {
  // Basic weight recommendations based on muscle group
  const baseWeights = {
    chest: { beginner: "5-10kg", moderate: "15-20kg", advanced: "25-30kg+" },
    back: { beginner: "5-10kg", moderate: "15-20kg", advanced: "25-35kg+" },
    legs: { beginner: "10-20kg", moderate: "30-50kg", advanced: "60-100kg+" },
    shoulders: { beginner: "2-5kg", moderate: "7-12kg", advanced: "15-20kg+" },
    arms: { beginner: "2-5kg", moderate: "7-10kg", advanced: "12-18kg+" },
    core: { beginner: "Peso corporal", moderate: "2-5kg", advanced: "7-10kg" },
    triceps: { beginner: "2-5kg", moderate: "7-10kg", advanced: "12-15kg+" },
    biceps: { beginner: "2-5kg", moderate: "7-12kg", advanced: "15-20kg+" }
  };
  
  return baseWeights[muscleGroup] || 
    { beginner: "Peso corporal ou leve", moderate: "Moderado", advanced: "Pesado" };
}
