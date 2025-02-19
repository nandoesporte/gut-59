
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { WorkoutPreferences } from '../_shared/types.ts'

const openAiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

interface GenerateWorkoutRequest {
  preferences: WorkoutPreferences;
  userId: string;
}

// Função para traduzir o texto para português usando a API do OpenAI
async function translateToPortuguese(text: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um tradutor especializado em exercícios físicos. Traduza o nome do exercício para português do Brasil, mantendo termos técnicos quando necessário.'
          },
          {
            role: 'user',
            content: `Translate to Brazilian Portuguese: "${text}"`
          }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content.replace(/"/g, '').trim();
  } catch (error) {
    console.error('Error translating:', error);
    return text;
  }
}

// Função para buscar GIFs demonstrativos
async function fetchExerciseGif(exerciseName: string): Promise<string | null> {
  try {
    // Tenta primeiro no Giphy
    const giphyResponse = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=P5EDHjFx7h4TfqB4JsGX8JBvGa4V3p1K&q=${encodeURIComponent(exerciseName + " exercise")}&limit=1&rating=g`
    );
    const giphyData = await giphyResponse.json();
    
    if (giphyData.data && giphyData.data.length > 0) {
      return giphyData.data[0].images.fixed_height.url;
    }

    // Se não encontrar no Giphy, tenta na API do wger
    const wgerResponse = await fetch(
      `https://wger.de/api/v2/exerciseimage/?exercise_name=${encodeURIComponent(exerciseName)}`
    );
    const wgerData = await wgerResponse.json();
    
    if (wgerData.results && wgerData.results.length > 0) {
      return wgerData.results[0].image;
    }

    return null;
  } catch (error) {
    console.error('Error fetching exercise gif:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { preferences, userId } = await req.json() as GenerateWorkoutRequest

    if (!preferences || !userId) {
      throw new Error('Missing required parameters')
    }

    const healthConditions = preferences.healthConditions || [];

    // Fetch available exercises from the database
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .filter('difficulty', 'eq', preferences.activityLevel === 'sedentary' ? 'beginner' : preferences.activityLevel === 'light' ? 'beginner' : preferences.activityLevel === 'moderate' ? 'intermediate' : 'advanced')
      .in('exercise_type', preferences.preferredExerciseTypes || [])

    if (exercisesError) throw exercisesError
    if (!exercises || exercises.length === 0) {
      throw new Error('No exercises found matching the criteria')
    }

    // Organiza exercícios por grupo muscular para melhor distribuição
    const exercisesByMuscleGroup = exercises.reduce((acc, exercise) => {
      if (!acc[exercise.muscle_group]) {
        acc[exercise.muscle_group] = [];
      }
      acc[exercise.muscle_group].push(exercise);
      return acc;
    }, {} as Record<string, typeof exercises>);

    // Traduz os exercícios
    const translatedExercises = await Promise.all(
      exercises.map(async (exercise) => ({
        ...exercise,
        name: await translateToPortuguese(exercise.name),
      }))
    );

    // Gera um prompt mais detalhado para criar treinos robustos
    const prompt = `
      Create a comprehensive and engaging workout plan based on:
      - Gender: ${preferences.gender}
      - Age: ${preferences.age}
      - Weight: ${preferences.weight}kg
      - Height: ${preferences.height}cm
      - Activity Level: ${preferences.activityLevel}
      - Goal: ${preferences.goal}
      - Health Conditions: ${healthConditions.join(', ') || 'None'}
      - Available Equipment: ${preferences.availableEquipment?.join(', ') || 'None'}
      - Training Location: ${preferences.trainingLocation}

      IMPORTANT GUIDELINES:
      1. Create a varied and comprehensive plan targeting all major muscle groups
      2. Include a balanced mix of:
         - Compound exercises for overall strength
         - Isolation exercises for specific muscle development
         - Functional movements for daily activities
      3. Structure each workout with:
         - Progressive warmup targeting the day's muscle groups
         - Main exercises in optimal order (compound first, then isolation)
         - Proper rest periods based on exercise intensity
         - Appropriate cooldown and stretching
      4. Include periodization elements:
         - Vary intensity and volume across weeks
         - Progressive overload principles
         - Deload periods when necessary

      Available exercises by muscle group:
      ${Object.entries(exercisesByMuscleGroup).map(([group, exs]) => 
        `${group}:\n${exs.map(e => `- ID: "${e.id}" - ${e.name}`).join('\n')}`
      ).join('\n\n')}

      Create a detailed 4-week plan with 3-4 sessions per week. For each session, include:
      1. Comprehensive warmup description in Portuguese
      2. Main exercises (ONLY use exerciseIds from the list above)
         - Include sufficient exercises for a complete workout
         - Proper exercise order and combinations
         - Progressive overload recommendations
      3. Detailed sets, reps, and rest times
      4. Thorough cooldown description in Portuguese
      
      Format the response as a JSON object with:
      {
        "plan": {
          "startDate": "YYYY-MM-DD",
          "endDate": "YYYY-MM-DD",
          "sessions": [{
            "dayNumber": number,
            "warmupDescription": string,
            "exercises": [{
              "exerciseId": string,
              "sets": number,
              "reps": number,
              "restTimeSeconds": number,
              "orderInSession": number
            }],
            "cooldownDescription": string
          }]
        }
      }

      IMPORTANT RULES:
      1. Use ONLY the exact exercise IDs provided above
      2. Write warmupDescription and cooldownDescription in Portuguese
      3. Create comprehensive sessions with appropriate exercise volume
      4. Include clear progression patterns across the weeks
      5. Ensure proper exercise distribution and muscle group balance
    `;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'Você é um personal trainer profissional especializado em criar planos de treino personalizados. Escreva em português do Brasil e use apenas os IDs de exercícios fornecidos.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const aiResponse = await response.json()
    const workoutPlan = JSON.parse(aiResponse.choices[0].message.content)

    // Validate exercise IDs
    for (const session of workoutPlan.plan.sessions) {
      for (const exercise of session.exercises) {
        if (!exercises.some(e => e.id === exercise.exerciseId)) {
          throw new Error(`Invalid exercise ID: ${exercise.exerciseId}`)
        }
      }
    }

    // Save workout plan
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        start_date: workoutPlan.plan.startDate,
        end_date: workoutPlan.plan.endDate,
        goal: preferences.goal
      })
      .select()
      .single()

    if (planError) throw planError

    // Save sessions and exercises
    for (const session of workoutPlan.plan.sessions) {
      const { data: workoutSession, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          plan_id: plan.id,
          day_number: session.dayNumber,
          warmup_description: session.warmupDescription,
          cooldown_description: session.cooldownDescription
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      for (const exercise of session.exercises) {
        const { error: exerciseError } = await supabase
          .from('session_exercises')
          .insert({
            session_id: workoutSession.id,
            exercise_id: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_time_seconds: exercise.restTimeSeconds,
            order_in_session: exercise.orderInSession
          })

        if (exerciseError) throw exerciseError
      }
    }

    // Return plan with exercises mapped to names and GIFs
    const transformedSessions = await Promise.all(workoutPlan.plan.sessions.map(async (session) => {
      const exerciseDetails = await Promise.all(session.exercises.map(async (exercise) => {
        const exerciseData = translatedExercises.find(e => e.id === exercise.exerciseId)
        const gifUrl = exerciseData?.gif_url || await fetchExerciseGif(exerciseData?.name || '');
        
        return {
          name: exerciseData?.name || 'Exercício Desconhecido',
          sets: exercise.sets,
          reps: exercise.reps,
          rest_time_seconds: exercise.restTimeSeconds,
          gifUrl: gifUrl
        }
      }))

      return {
        day_number: session.dayNumber,
        warmup_description: session.warmupDescription,
        exercises: exerciseDetails,
        cooldown_description: session.cooldownDescription
      }
    }))

    return new Response(
      JSON.stringify({
        id: plan.id,
        created_at: plan.created_at,
        start_date: workoutPlan.plan.startDate,
        end_date: workoutPlan.plan.endDate,
        goal: preferences.goal,
        workout_sessions: transformedSessions
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error generating workout plan:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
