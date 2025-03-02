
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkoutPreferences {
  age: number;
  weight: number;
  height: number;
  gender: "male" | "female";
  goal: "lose_weight" | "maintain" | "gain_mass";
  activity_level: "sedentary" | "light" | "moderate" | "intense";
  preferred_exercise_types: string[];
  available_equipment: string[];
  health_conditions?: string[];
}

interface ExerciseData {
  id: string;
  name: string;
  description: string;
  gif_url?: string;
}

interface SessionExercise {
  exercise: ExerciseData;
  sets: number;
  reps: number;
  rest_time_seconds: number;
}

interface WorkoutSession {
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  session_exercises: SessionExercise[];
}

interface WorkoutPlan {
  goal: string;
  start_date?: string;
  end_date?: string;
  workout_sessions: WorkoutSession[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId, settings } = await req.json();
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Generate workout plan called with preferences:", JSON.stringify(preferences));
    console.log("AI model settings:", JSON.stringify(settings));

    // Construct the system prompt for the AI
    const systemPrompt = settings.use_custom_prompt 
      ? settings.system_prompt 
      : `You are TRENE2025, an AI specialized in creating personalized workout plans.
Create a detailed 7-day workout plan based on the user's information and preferences.
Focus on exercises that match their goals, equipment availability, and fitness level.
Each day should include a complete workout with specific exercises, sets, reps, and rest periods.
Be motivational and provide clear instructions.`;

    // Format user preferences for the prompt
    const userPreferencesText = `
Age: ${preferences.age}
Weight: ${preferences.weight} kg
Height: ${preferences.height} cm
Gender: ${preferences.gender === 'male' ? 'Masculino' : 'Feminino'}
Goal: ${formatGoal(preferences.goal)}
Activity Level: ${formatActivityLevel(preferences.activity_level)}
Preferred Exercise Types: ${formatExerciseTypes(preferences.preferred_exercise_types)}
Training Location: ${formatEquipment(preferences.available_equipment)}
${preferences.health_conditions && preferences.health_conditions.length > 0 
  ? `Health Conditions: ${preferences.health_conditions.join(', ')}` 
  : ''}
`;

    // Call Groq API to generate workout plan using LLaMA 3-8B-8192
    const workoutPlan = await generateWorkoutPlanWithGroq(
      systemPrompt,
      userPreferencesText,
      settings.active_model
    );

    if (!workoutPlan) {
      throw new Error("Failed to generate workout plan");
    }

    // Get relevant exercises from database that match the plan
    const enhancedPlan = await enhanceWorkoutPlanWithExerciseData(supabase, workoutPlan);
    
    // Return the generated workout plan
    return new Response(
      JSON.stringify({ 
        workoutPlan: enhancedPlan
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error("Error generating workout plan:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Error generating workout plan" }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to format goal for prompt
function formatGoal(goal: string): string {
  switch (goal) {
    case 'lose_weight': return 'Perder Peso';
    case 'maintain': return 'Manter Peso';
    case 'gain_mass': return 'Ganhar Massa';
    default: return goal;
  }
}

// Helper function to format activity level for prompt
function formatActivityLevel(level: string): string {
  switch (level) {
    case 'sedentary': return 'Sedentário (pouco ou nenhum exercício)';
    case 'light': return 'Leve (1-3 dias por semana)';
    case 'moderate': return 'Moderado (3-5 dias por semana)';
    case 'intense': return 'Intenso (6-7 dias por semana)';
    default: return level;
  }
}

// Helper function to format exercise types for prompt
function formatExerciseTypes(types: string[]): string {
  return types.map(type => {
    switch (type) {
      case 'strength': return 'Força';
      case 'cardio': return 'Cardio';
      case 'mobility': return 'Mobilidade';
      default: return type;
    }
  }).join(', ');
}

// Helper function to format equipment availability for prompt
function formatEquipment(equipment: string[]): string {
  if (equipment.includes('all')) {
    return 'Academia (todos equipamentos disponíveis)';
  } else if (equipment.includes('bodyweight')) {
    if (equipment.includes('dumbbells')) {
      return 'Casa (peso corporal e halteres)';
    } else if (equipment.includes('resistance-bands')) {
      return 'Casa/Ao ar livre (peso corporal e bandas elásticas)';
    }
    return 'Sem equipamentos (apenas peso corporal)';
  }
  return equipment.join(', ');
}

// Function to call Groq API to generate workout plan
async function generateWorkoutPlanWithGroq(
  systemPrompt: string,
  userPreferencesText: string,
  modelName: string = 'llama3'
): Promise<WorkoutPlan> {
  console.log("Calling Groq API with model:", modelName);
  
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
  }

  // Select the right model based on settings
  let model = "llama3-8b-8192";
  if (modelName === 'gpt4') {
    model = "mixtral-8x7b-32768";
  }

  // Construct the user message
  const userMessage = `Por favor, crie um plano de treino personalizado para um usuário com os seguintes dados:
${userPreferencesText}

O plano deve ser para 7 dias, com exercícios específicos para cada dia que se alinham com os objetivos, preferências e nível de atividade do usuário.
Para cada dia, inclua:
1. Um breve aquecimento
2. 4-6 exercícios principais com sets, reps e tempo de descanso
3. Um breve cooldown

Forneça a resposta em formato JSON seguindo esta estrutura exata:
{
  "goal": "objetivo do treino",
  "start_date": "data de início (YYYY-MM-DD)",
  "end_date": "data final (YYYY-MM-DD)",
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "descrição do aquecimento",
      "cooldown_description": "descrição do cooldown",
      "session_exercises": [
        {
          "exercise": {
            "name": "nome do exercício",
            "description": "descrição do exercício"
          },
          "sets": 3,
          "reps": 12,
          "rest_time_seconds": 60
        }
      ]
    }
  ]
}

Certifique-se que os exercícios são adequados para o nível do usuário e os equipamentos disponíveis.`;

  try {
    const apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      throw new Error(`Groq API returned error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Groq API response:", JSON.stringify(data));
    
    const content = data.choices[0].message.content;
    
    // Extract the JSON from the response
    try {
      // Find JSON in the response content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        const workoutPlan = JSON.parse(jsonString);
        return workoutPlan;
      } else {
        console.error("No JSON found in response:", content);
        throw new Error("Failed to extract workout plan from response");
      }
    } catch (parseError) {
      console.error("Error parsing workout plan:", parseError, "Content:", content);
      throw new Error("Failed to parse workout plan response");
    }
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw error;
  }
}

// Function to enhance workout plan with real exercise data from database
async function enhanceWorkoutPlanWithExerciseData(supabase, workoutPlan: WorkoutPlan): Promise<WorkoutPlan> {
  // Set start and end dates if not provided
  if (!workoutPlan.start_date) {
    const today = new Date();
    workoutPlan.start_date = today.toISOString().split('T')[0];
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    workoutPlan.end_date = endDate.toISOString().split('T')[0];
  }

  // Process each workout session
  for (const session of workoutPlan.workout_sessions) {
    // Ensure warmup and cooldown descriptions exist
    if (!session.warmup_description) {
      session.warmup_description = "Aquecimento geral de 5-10 minutos com exercícios de mobilidade.";
    }
    
    if (!session.cooldown_description) {
      session.cooldown_description = "Alongamento leve de 5 minutos focando nos músculos trabalhados.";
    }

    // Process each exercise in the session
    for (let i = 0; i < session.session_exercises.length; i++) {
      const sessionExercise = session.session_exercises[i];
      const exerciseName = sessionExercise.exercise.name;
      
      // Find a matching exercise in the database
      const { data: exerciseData, error } = await supabase
        .from('exercises')
        .select('id, name, description, gif_url')
        .ilike('name', `%${exerciseName}%`)
        .limit(1);
      
      if (error) {
        console.error("Error fetching exercise data:", error);
        continue;
      }
      
      // If we found a matching exercise, use its data
      if (exerciseData && exerciseData.length > 0) {
        sessionExercise.exercise = {
          id: exerciseData[0].id,
          name: exerciseData[0].name,
          description: exerciseData[0].description || sessionExercise.exercise.description,
          gif_url: exerciseData[0].gif_url || ""
        };
      } else {
        // If no matching exercise found, create a generic placeholder
        sessionExercise.exercise = {
          id: `generated-${i}`,
          name: exerciseName,
          description: sessionExercise.exercise.description || `Exercício: ${exerciseName}`,
          gif_url: ""
        };
      }
    }
  }
  
  return workoutPlan;
}
