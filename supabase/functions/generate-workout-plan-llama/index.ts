
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const groqApiKey = Deno.env.get('GROQ_API_KEY') || '';

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Function to fetch exercises from the database based on preferences
async function fetchExercises(exerciseType: string) {
  console.log(`Fetching exercises for type: ${exerciseType}`);
  
  const { data, error } = await supabaseAdmin
    .from('exercises')
    .select('*')
    .eq('exercise_type', exerciseType)
    .limit(50);
  
  if (error) {
    console.error(`Error fetching exercises: ${error.message}`);
    throw new Error(`Error fetching exercises: ${error.message}`);
  }
  
  return data || [];
}

// Main handler function
serve(async (req) => {
  console.log("Edge function invoked: generate-workout-plan-llama");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId, settings } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`Generating workout plan for user: ${userId}`);
    console.log(`Preferences received: ${JSON.stringify(preferences)}`);
    console.log(`AI settings: ${JSON.stringify(settings)}`);
    
    // Set up default dates for the workout plan
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30-day plan by default
    
    // Generate the workout plan using Groq API with Llama 3
    const workoutPlan = await generatePlanWithGroq(preferences, userId, settings);
    
    return new Response(JSON.stringify(workoutPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error(`Error in edge function: ${error.message}`);
    
    return new Response(
      JSON.stringify({ error: `Erro na geração do plano: ${error.message}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Generate workout plan using Groq API with Llama 3
async function generatePlanWithGroq(preferences: any, userId: string, settings: any) {
  try {
    console.log("Starting to generate plan using Groq API with Llama 3");
    
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not set');
    }
    
    // Fetch a sample of exercises based on preferences
    const exerciseType = preferences.preferred_exercise_types && preferences.preferred_exercise_types.length > 0 
      ? preferences.preferred_exercise_types[0] 
      : 'strength';
    
    const exercises = await fetchExercises(exerciseType);
    
    if (!exercises || exercises.length === 0) {
      throw new Error(`No exercises found for type: ${exerciseType}`);
    }
    
    console.log(`Successfully fetched ${exercises.length} exercises`);
    
    // Create a prompt that will generate a structured response
    const systemPrompt = settings?.system_prompt || 
      `Você é TRENE2025, um agente de IA especializado em educação física e nutrição esportiva. 
      Seu objetivo é criar planos de treino detalhados, personalizados e cientificamente embasados.
      Você deve fornecer um plano completo, com exercícios, séries, repetições e dicas específicas.`;
    
    const userPrompt = `
      Crie um plano de treino personalizado para um usuário com as seguintes características:
      - Idade: ${preferences.age} anos
      - Peso: ${preferences.weight} kg
      - Altura: ${preferences.height} cm
      - Gênero: ${preferences.gender === 'male' ? 'masculino' : 'feminino'}
      - Objetivo: ${preferences.goal}
      - Nível de atividade: ${preferences.activity_level}
      - Tipos de exercícios preferidos: ${preferences.preferred_exercise_types.join(', ')}
      - Equipamentos disponíveis: ${preferences.available_equipment.join(', ')}
      ${preferences.health_conditions.length > 0 ? `- Condições de saúde: ${preferences.health_conditions.join(', ')}` : ''}
      
      Crie um plano de treino estruturado para 5 dias da semana. Para cada dia, sugira exercícios específicos da lista a seguir:
      ${exercises.slice(0, 10).map(ex => `- ${ex.name}`).join('\n')}
      
      Sua resposta DEVE seguir EXATAMENTE este formato JSON, sem nenhum texto adicional antes ou depois:
      
      {
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD",
        "goal": "objetivo principal do plano",
        "workout_sessions": [
          {
            "day_number": 1,
            "warmup_description": "descrição do aquecimento",
            "cooldown_description": "descrição do retorno à calma",
            "session_exercises": [
              {
                "exercise": {
                  "id": "id do exercício (use os ids reais da lista)",
                  "name": "nome do exercício (use os nomes reais da lista)",
                  "description": "breve descrição",
                  "gif_url": "url do gif, se disponível"
                },
                "sets": 3,
                "reps": 12,
                "rest_time_seconds": 60
              }
              // mais exercícios para este dia
            ]
          }
          // mais dias de treino
        ]
      }
      
      Importante: Use SOMENTE os exercícios da lista fornecida. Responda APENAS com o JSON, sem texto adicional.
    `;
    
    console.log("Calling Groq API with Llama 3 model");
    
    // Call the Groq API with the Llama 3 model
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Groq API error: ${response.status} - ${errorData}`);
      throw new Error(`Erro na API Groq: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Invalid response from Groq API:', data);
      throw new Error('Resposta inválida da API Groq');
    }
    
    // Get the content from the response
    const content = data.choices[0].message.content;
    console.log('Raw response from Groq API:', content);
    
    // Try to extract and parse the JSON from the response
    let jsonContent = content;
    
    // If the content includes markdown code blocks, extract the JSON
    if (content.includes('```json')) {
      jsonContent = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonContent = content.split('```')[1].split('```')[0].trim();
    }
    
    try {
      // Parse the JSON content
      const workoutPlan = JSON.parse(jsonContent);
      
      // Add user_id and id to the workout plan
      const planWithIds = {
        ...workoutPlan,
        id: uuidv4(),
        user_id: userId,
      };
      
      // Add IDs to workout sessions and session exercises
      planWithIds.workout_sessions = planWithIds.workout_sessions.map(session => ({
        ...session,
        id: uuidv4(),
        session_exercises: session.session_exercises.map(exercise => ({
          ...exercise,
          id: uuidv4(),
        })),
      }));
      
      console.log('Successfully generated workout plan');
      
      // Save the workout plan to the database
      const { error: saveError } = await supabaseAdmin
        .from('workout_plans')
        .insert([planWithIds]);
      
      if (saveError) {
        console.error(`Error saving workout plan: ${saveError.message}`);
        // Continue even if saving fails, to return the plan to the user
      } else {
        console.log('Workout plan saved to database');
      }
      
      return planWithIds;
    } catch (parseError) {
      console.error('Error parsing JSON from Groq API response:', parseError);
      console.error('Raw content that failed to parse:', jsonContent);
      throw new Error('Erro ao processar a resposta do modelo. Formato inválido.');
    }
  } catch (error) {
    console.error(`Error in generatePlanWithGroq: ${error.message}`);
    throw error;
  }
}
