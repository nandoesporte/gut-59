import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
  preferred_exercise_types: ("strength" | "cardio" | "mobility")[];
  available_equipment: string[];
  health_conditions?: string[];
}

interface WorkoutPlan {
  id?: string;
  user_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  workout_sessions: WorkoutSession[];
}

interface WorkoutSession {
  id?: string;
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  session_exercises: SessionExercise[];
}

interface SessionExercise {
  id?: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  exercise: {
    id: string;
    name: string;
    description?: string;
    gif_url?: string;
  };
}

async function generateWorkoutPlanWithGroq(
  apiKey: string, 
  preferences: WorkoutPreferences,
  systemPrompt: string
): Promise<WorkoutPlan> {
  console.log("Generating workout plan with Groq API...");
  
  const userPreferencesText = `
  - Idade: ${preferences.age} anos
  - Peso: ${preferences.weight} kg
  - Altura: ${preferences.height} cm
  - Sexo: ${preferences.gender === 'male' ? 'Masculino' : 'Feminino'}
  - Objetivo: ${
    preferences.goal === 'lose_weight' ? 'Perder Peso' : 
    preferences.goal === 'maintain' ? 'Manter Peso' : 
    'Ganhar Massa'
  }
  - Nível de Atividade: ${
    preferences.activity_level === 'sedentary' ? 'Sedentário' : 
    preferences.activity_level === 'light' ? 'Leve' : 
    preferences.activity_level === 'moderate' ? 'Moderado' : 
    'Intenso'
  }
  - Tipos de Exercícios Preferidos: ${preferences.preferred_exercise_types.map(type => 
    type === 'strength' ? 'Força' : 
    type === 'cardio' ? 'Cardio' : 
    'Mobilidade'
  ).join(', ')}
  - Equipamentos Disponíveis: ${preferences.available_equipment.join(', ')}
  ${preferences.health_conditions && preferences.health_conditions.length > 0 ? 
    `- Condições de Saúde: ${preferences.health_conditions.join(', ')}` : 
    '- Sem condições de saúde específicas'
  }`;

  const userPrompt = `
  Com base nas seguintes preferências de treino:
  
  ${userPreferencesText}
  
  Crie um plano de treino semanal detalhado seguindo estas diretrizes:
  
  1. O plano deve ter 7 dias, com cada dia focando em grupos musculares específicos
  2. Para cada dia, descreva:
     - Um aquecimento apropriado (warmup_description)
     - De 3 a 6 exercícios específicos
     - Para cada exercício, especifique:
       * Nome exato do exercício (em português)
       * Número de séries (sets)
       * Número de repetições (reps)
       * Tempo de descanso em segundos (rest_time_seconds)
     - Um desaquecimento apropriado (cooldown_description)
  3. Considere o objetivo do usuário, nível de experiência e equipamentos disponíveis
  4. Os dias de descanso também devem ser indicados
  
  Responda ESTRITAMENTE no formato JSON a seguir, sem texto introdutório, explicações ou conclusões adicionais:
  {
    "workoutPlan": {
      "goal": "String descrevendo o objetivo do plano",
      "start_date": "YYYY-MM-DD (data de hoje)",
      "end_date": "YYYY-MM-DD (7 dias a partir de hoje)",
      "workout_sessions": [
        {
          "day_number": 1,
          "warmup_description": "Descrição do aquecimento para o dia 1",
          "cooldown_description": "Descrição do desaquecimento para o dia 1",
          "session_exercises": [
            {
              "exercise": {
                "name": "Nome do exercício"
              },
              "sets": número_de_séries,
              "reps": número_de_repetições,
              "rest_time_seconds": tempo_de_descanso
            }
          ]
        }
      ]
    }
  }
  `;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
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
        top_p: 0.9,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Groq API error response:", errorData);
      throw new Error(`Groq API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Groq API response received");
    
    const content = data.choices[0].message.content;
    
    try {
      const parsedContent = JSON.parse(content);
      return parsedContent.workoutPlan;
    } catch (parseError) {
      console.error("Error parsing JSON from response:", parseError);
      
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          const extractedJson = JSON.parse(jsonMatch[1]);
          return extractedJson.workoutPlan;
        } catch (extractError) {
          throw new Error("Failed to parse JSON from response: " + extractError.message);
        }
      } else {
        throw new Error("Response is not in the expected JSON format");
      }
    }
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw error;
  }
}

async function findMatchingExercises(
  supabase: any,
  workoutPlan: WorkoutPlan
): Promise<WorkoutPlan> {
  console.log("Finding matching exercises in database...");
  
  const enhancedWorkoutPlan = { ...workoutPlan };
  
  for (const session of enhancedWorkoutPlan.workout_sessions) {
    const enhancedExercises = [];
    
    for (const sessionExercise of session.session_exercises) {
      const { data: matchingExercises, error } = await supabase
        .from('exercises')
        .select('id, name, description, gif_url')
        .ilike('name', `%${sessionExercise.exercise.name}%`)
        .limit(1);
      
      if (error) {
        console.error("Error finding matching exercise:", error);
      }
      
      if (matchingExercises && matchingExercises.length > 0) {
        enhancedExercises.push({
          ...sessionExercise,
          exercise: matchingExercises[0]
        });
      } else {
        const { data: randomExercise, error: randError } = await supabase
          .from('exercises')
          .select('id, name, description, gif_url')
          .limit(1);
          
        if (randError) {
          console.error("Error finding random exercise:", randError);
          enhancedExercises.push(sessionExercise);
        } else if (randomExercise && randomExercise.length > 0) {
          enhancedExercises.push({
            ...sessionExercise,
            exercise: randomExercise[0]
          });
        } else {
          enhancedExercises.push(sessionExercise);
        }
      }
    }
    
    session.session_exercises = enhancedExercises;
  }
  
  return enhancedWorkoutPlan;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY environment variable not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not set');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { preferences, userId, settings } = await req.json();
    
    if (!preferences || !userId) {
      throw new Error('Missing required parameters: preferences or userId');
    }

    console.log("Received request for user:", userId);
    console.log("Workout preferences:", JSON.stringify(preferences));

    const systemPrompt = settings?.system_prompt || 
      "Você é o TREINE2025, um assistente especializado na criação de planos de treino personalizados. Analise cuidadosamente as informações do usuário e crie um plano de treino detalhado com base nas necessidades e objetivos específicos.";

    let workoutPlan = await generateWorkoutPlanWithGroq(
      groqApiKey,
      preferences,
      systemPrompt
    );
    
    workoutPlan.user_id = userId;
    
    if (!workoutPlan.start_date) {
      workoutPlan.start_date = new Date().toISOString().split('T')[0];
    }
    
    if (!workoutPlan.end_date) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      workoutPlan.end_date = endDate.toISOString().split('T')[0];
    }
    
    const enhancedWorkoutPlan = await findMatchingExercises(supabase, workoutPlan);
    
    console.log("Enhanced workout plan ready");

    return new Response(
      JSON.stringify({ workoutPlan: enhancedWorkoutPlan }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-workout-plan-llama:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
