
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from "../_shared/cors.ts"

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface Preferences {
  age: number
  weight: number
  height: number
  gender: string
  goal: string
  activity_level: string
  preferred_exercise_types: string[]
  available_equipment: string[]
  health_conditions?: string[]
}

interface ModelSettings {
  active_model: string
  system_prompt: string
  use_custom_prompt: boolean
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY not found in environment variables')
      throw new Error('GROQ_API_KEY not configured. Please set the environment variable.')
    }

    // Parse request body
    const requestData = await req.json()
    console.log('Request data received:', JSON.stringify(requestData))

    // Validate that we have all required parameters
    const { preferences, userId, settings } = requestData
    
    if (!preferences || !userId) {
      throw new Error('Missing required parameters: preferences or userId')
    }

    // Validate preferences
    const requiredFields = ['age', 'weight', 'height', 'gender', 'goal', 'activity_level', 'preferred_exercise_types']
    for (const field of requiredFields) {
      if (preferences[field] === undefined) {
        throw new Error(`Missing required preference field: ${field}`)
      }
    }

    // Get model settings
    const modelSettings: ModelSettings = settings || {
      active_model: 'llama3',
      system_prompt: null,
      use_custom_prompt: false
    }

    // Create system prompt
    let systemPrompt = modelSettings.use_custom_prompt && modelSettings.system_prompt 
      ? modelSettings.system_prompt 
      : `Você é TRENE2025, um agente de IA especializado em educação física e nutrição esportiva. 
Seu objetivo é criar planos de treino detalhados, personalizados e cientificamente embasados.
Você deve fornecer um plano completo, com exercícios, séries, repetições e dicas específicas.`
    
    console.log('Using system prompt:', systemPrompt)

    // Create user prompt
    const userPrompt = createUserPrompt(preferences)
    console.log('User prompt created')

    // Generate plan using Groq API with llama3-8b-8192 model
    console.log('Calling Groq API with llama3-8b-8192 model')
    const workoutPlan = await generatePlanWithGroq(systemPrompt, userPrompt)
    console.log('Received response from Groq API')

    // Save the workout plan to the database
    console.log('Saving workout plan to database')
    const savedPlan = await saveWorkoutPlan(workoutPlan, userId)
    console.log('Workout plan saved to database')

    return new Response(JSON.stringify(savedPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error generating workout plan:', error)
    
    return new Response(
      JSON.stringify({ error: `Erro na geração do plano: ${error.message}` }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function createUserPrompt(preferences: Preferences): string {
  const { 
    age, 
    weight, 
    height, 
    gender, 
    goal, 
    activity_level, 
    preferred_exercise_types = [], 
    available_equipment = [], 
    health_conditions = [] 
  } = preferences

  // Map goals to more descriptive text
  const goalMap: Record<string, string> = {
    lose_weight: "perder peso",
    maintain: "manter o peso e tonificar o corpo",
    gain_mass: "ganhar massa muscular"
  }

  // Map activity levels to descriptive text
  const activityMap: Record<string, string> = {
    sedentary: "sedentário (pouca ou nenhuma atividade física)",
    light: "levemente ativo (atividade física leve 1-3 dias por semana)",
    moderate: "moderadamente ativo (atividade física moderada 3-5 dias por semana)",
    intense: "muito ativo (atividade física intensa 6-7 dias por semana)"
  }

  // Ensure arrays are handled properly
  const exerciseTypes = Array.isArray(preferred_exercise_types) ? preferred_exercise_types.join(', ') : preferred_exercise_types
  const equipment = Array.isArray(available_equipment) ? available_equipment.join(', ') : available_equipment
  const healthIssues = Array.isArray(health_conditions) && health_conditions.length > 0 
    ? `Condições de saúde a considerar: ${health_conditions.join(', ')}.` 
    : "Sem condições de saúde especiais a considerar."

  return `Crie um plano de treino personalizado para uma pessoa com as seguintes características:
- Idade: ${age} anos
- Peso: ${weight} kg
- Altura: ${height} cm
- Gênero: ${gender === 'male' ? 'masculino' : 'feminino'}
- Objetivo: ${goalMap[goal] || goal}
- Nível de atividade: ${activityMap[activity_level] || activity_level}
- Tipos de exercícios preferidos: ${exerciseTypes}
- Equipamentos disponíveis: ${equipment}
- ${healthIssues}

Forneça um plano completo para 5 dias de treino, com cada dia focando em grupos musculares diferentes.
Para cada dia de treino, especifique:
1. Exercícios detalhados (4-6 exercícios por dia)
2. Número de séries para cada exercício
3. Número de repetições para cada exercício
4. Tempo de descanso entre séries
5. Descrição do aquecimento adequado
6. Descrição da volta à calma

O plano deve ser cientificamente embasado e adequado ao perfil da pessoa. Inclua dicas para melhorar o desempenho durante os exercícios.

A resposta deve estar em formato JSON seguindo esta estrutura exata:
{
  "id": "string (uuid)",
  "user_id": "string (uuid)",
  "goal": "string",
  "start_date": "string (YYYY-MM-DD)",
  "end_date": "string (YYYY-MM-DD)",
  "workout_sessions": [
    {
      "id": "string (uuid)",
      "day_number": number,
      "warmup_description": "string",
      "cooldown_description": "string",
      "session_exercises": [
        {
          "id": "string (uuid)",
          "sets": number,
          "reps": number,
          "rest_time_seconds": number,
          "exercise": {
            "id": "string (uuid)",
            "name": "string",
            "description": "string",
            "gif_url": null
          }
        }
      ]
    }
  ]
}

Não inclua nenhum texto adicional na resposta, apenas o JSON.`
}

async function generatePlanWithGroq(systemPrompt: string, userPrompt: string): Promise<any> {
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions'
  
  try {
    console.log('Making request to Groq API')
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Groq API error:', response.status, errorData)
      throw new Error(`Erro na API Groq: ${response.status} ${errorData}`)
    }

    const data = await response.json()
    console.log('Groq API response received')

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('Resposta inválida da API Groq')
    }

    const content = data.choices[0].message.content
    
    try {
      // Extract JSON from the response if needed
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : content
      return JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Error parsing JSON from Groq response:', parseError)
      console.log('Raw response content:', content)
      throw new Error('Erro ao processar a resposta do modelo. Formato inválido.')
    }
  } catch (error) {
    console.error('Error calling Groq API:', error)
    throw error
  }
}

async function saveWorkoutPlan(workoutPlan: any, userId: string): Promise<any> {
  try {
    // Add user_id to the workout plan if not present
    if (!workoutPlan.user_id) {
      workoutPlan.user_id = userId
    }

    // Generate start and end dates if not present
    if (!workoutPlan.start_date) {
      const startDate = new Date()
      workoutPlan.start_date = startDate.toISOString().split('T')[0]
    }

    if (!workoutPlan.end_date) {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30) // 30 days plan
      workoutPlan.end_date = endDate.toISOString().split('T')[0]
    }

    // Insert workout plan
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        id: workoutPlan.id,
        user_id: workoutPlan.user_id,
        goal: workoutPlan.goal,
        start_date: workoutPlan.start_date,
        end_date: workoutPlan.end_date
      })
      .select()
      .single()

    if (planError) {
      console.error('Error inserting workout plan:', planError)
      throw planError
    }

    // For each workout session
    for (const session of workoutPlan.workout_sessions) {
      // Insert workout session
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          id: session.id,
          plan_id: workoutPlan.id,
          day_number: session.day_number,
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error inserting workout session:', sessionError)
        throw sessionError
      }

      // For each exercise in the session
      for (const exerciseSession of session.session_exercises) {
        // Check if exercise exists
        let exerciseId = exerciseSession.exercise.id
        const { data: existingExercise } = await supabase
          .from('exercises')
          .select('id')
          .eq('id', exerciseId)
          .maybeSingle()

        // If exercise doesn't exist, create it
        if (!existingExercise) {
          const { data: newExercise, error: exerciseError } = await supabase
            .from('exercises')
            .insert({
              id: exerciseId,
              name: exerciseSession.exercise.name,
              description: exerciseSession.exercise.description,
              gif_url: exerciseSession.exercise.gif_url,
              exercise_type: 'strength',
              muscle_group: 'weight_training',
              difficulty: 'beginner',
              min_sets: 3,
              max_sets: 5,
              min_reps: 8,
              max_reps: 12,
              rest_time_seconds: 60
            })
            .select()
            .single()

          if (exerciseError) {
            console.error('Error inserting exercise:', exerciseError)
            throw exerciseError
          }
        }

        // Insert session exercise
        const { error: sessionExerciseError } = await supabase
          .from('session_exercises')
          .insert({
            id: exerciseSession.id,
            session_id: session.id,
            exercise_id: exerciseId,
            sets: exerciseSession.sets,
            reps: exerciseSession.reps,
            rest_time_seconds: exerciseSession.rest_time_seconds,
            order_in_session: 0
          })

        if (sessionExerciseError) {
          console.error('Error inserting session exercise:', sessionExerciseError)
          throw sessionExerciseError
        }
      }
    }

    return workoutPlan
  } catch (error) {
    console.error('Error saving workout plan to database:', error)
    throw error
  }
}
