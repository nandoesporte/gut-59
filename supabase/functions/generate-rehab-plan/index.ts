
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface RehabPlanPayload {
  preferences: {
    age: number
    weight: number
    height: number
    gender: "male" | "female"
    joint_area: string
    condition: string
    pain_level: number
    mobility_level: "limited" | "moderate" | "good"
    previous_treatment: boolean
    activity_level: "sedentary" | "light" | "moderate" | "active"
  }
  userId: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { preferences, userId }: RehabPlanPayload = await req.json()
    console.log('Generating rehab plan for:', { preferences, userId })

    // Determinar o objetivo da reabilitação com base nos dados
    const goal = determineRehabGoal(preferences)

    // Criar o plano de reabilitação na base de dados
    const { data: rehabPlan, error: planError } = await supabase
      .from('rehab_plans')
      .insert({
        user_id: userId,
        goal,
        condition: preferences.condition,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
      })
      .select()
      .single()

    if (planError) throw planError

    // Gerar sessões de reabilitação
    const sessions = generateRehabSessions(preferences)
    
    // Inserir as sessões
    for (const session of sessions) {
      const { data: rehabSession, error: sessionError } = await supabase
        .from('rehab_sessions')
        .insert({
          plan_id: rehabPlan.id,
          day_number: session.day_number,
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Inserir os exercícios para cada sessão
      for (const exercise of session.exercises) {
        // Primeiro, verificar se o exercício já existe ou criar um novo
        const { data: existingExercise, error: exerciseQueryError } = await supabase
          .from('exercises')
          .select()
          .eq('name', exercise.name)
          .single()

        if (exerciseQueryError && exerciseQueryError.code !== 'PGRST116') {
          throw exerciseQueryError
        }

        const exerciseId = existingExercise?.id

        // Se não encontrou o exercício, vamos criar um novo
        if (!exerciseId) {
          const { data: newExercise, error: exerciseError } = await supabase
            .from('exercises')
            .insert({
              name: exercise.name,
              description: exercise.notes,
              difficulty: 'beginner',
              exercise_type: 'rehabilitation',
              muscle_group: preferences.joint_area,
            })
            .select()
            .single()

          if (exerciseError) throw exerciseError

          await supabase.from('rehab_session_exercises').insert({
            session_id: rehabSession.id,
            exercise_id: newExercise.id,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_time_seconds: exercise.rest_time_seconds
          })
        } else {
          await supabase.from('rehab_session_exercises').insert({
            session_id: rehabSession.id,
            exercise_id: exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_time_seconds: exercise.rest_time_seconds
          })
        }
      }
    }

    // Buscar o plano completo com todas as sessões e exercícios
    const { data: completePlan, error: fetchError } = await supabase
      .from('rehab_plans')
      .select(`
        *,
        rehab_sessions (
          *,
          rehab_session_exercises (
            *,
            exercise:exercises (*)
          )
        )
      `)
      .eq('id', rehabPlan.id)
      .single()

    if (fetchError) throw fetchError

    // Transformar os dados para o formato esperado pelo frontend
    const transformedPlan = {
      ...completePlan,
      rehab_sessions: completePlan.rehab_sessions.map((session: any) => ({
        day_number: session.day_number,
        warmup_description: session.warmup_description,
        cooldown_description: session.cooldown_description,
        exercises: session.rehab_session_exercises.map((se: any) => ({
          name: se.exercise.name,
          sets: se.sets,
          reps: se.reps,
          rest_time_seconds: se.rest_time_seconds,
          gifUrl: se.exercise.gif_url,
          notes: se.exercise.description
        }))
      }))
    }

    return new Response(JSON.stringify(transformedPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function determineRehabGoal(preferences: RehabPlanPayload['preferences']) {
  if (preferences.pain_level >= 7) return 'pain_relief'
  if (preferences.mobility_level === 'limited') return 'mobility'
  if (preferences.activity_level === 'active') return 'return_to_sport'
  return 'strength'
}

function generateRehabSessions(preferences: RehabPlanPayload['preferences']) {
  const sessions = []
  
  // Gerar 3 sessões por semana durante 4 semanas
  for (let week = 0; week < 4; week++) {
    for (let sessionInWeek = 0; sessionInWeek < 3; sessionInWeek++) {
      const dayNumber = week * 7 + (sessionInWeek * 2) + 1
      
      const session = {
        day_number: dayNumber,
        warmup_description: generateWarmup(preferences),
        cooldown_description: generateCooldown(preferences),
        exercises: generateExercises(preferences, week)
      }
      
      sessions.push(session)
    }
  }
  
  return sessions
}

function generateWarmup(preferences: RehabPlanPayload['preferences']) {
  const warmups = {
    ankle_foot: "5-10 minutos de mobilização suave do tornozelo, rotações e flexões",
    knee: "5-10 minutos de caminhada leve e mobilização do joelho",
    hip: "5-10 minutos de mobilização do quadril e alongamentos suaves",
    spine: "5-10 minutos de mobilização da coluna e respiração profunda",
    shoulder: "5-10 minutos de mobilização do ombro e aquecimento dos braços",
    elbow_hand: "5-10 minutos de mobilização do punho e cotovelo"
  }
  
  return warmups[preferences.joint_area as keyof typeof warmups] || 
         "5-10 minutos de aquecimento geral com mobilização articular"
}

function generateCooldown(preferences: RehabPlanPayload['preferences']) {
  return "5-10 minutos de alongamentos suaves seguidos de aplicação de gelo se necessário"
}

function generateExercises(preferences: RehabPlanPayload['preferences'], week: number) {
  const baseExercises = {
    ankle_foot: [
      { name: "Flexão dorsal com banda elástica", sets: 3, reps: 15 },
      { name: "Flexão plantar em pé", sets: 3, reps: 15 },
      { name: "Inversão com banda elástica", sets: 3, reps: 12 }
    ],
    knee: [
      { name: "Extensão de joelho sentado", sets: 3, reps: 12 },
      { name: "Mini agachamento", sets: 3, reps: 10 },
      { name: "Elevação da perna estendida", sets: 3, reps: 12 }
    ],
    hip: [
      { name: "Ponte", sets: 3, reps: 12 },
      { name: "Abdução de quadril deitado", sets: 3, reps: 15 },
      { name: "Extensão de quadril em pé", sets: 3, reps: 12 }
    ],
    spine: [
      { name: "Prancha", sets: 3, reps: 20 },
      { name: "Bird dog", sets: 3, reps: 12 },
      { name: "Extensão lombar", sets: 2, reps: 10 }
    ],
    shoulder: [
      { name: "Rotação externa com banda elástica", sets: 3, reps: 15 },
      { name: "Elevação frontal", sets: 3, reps: 12 },
      { name: "Retração escapular", sets: 3, reps: 15 }
    ],
    elbow_hand: [
      { name: "Flexão de punho com halter leve", sets: 3, reps: 15 },
      { name: "Extensão de punho com halter leve", sets: 3, reps: 15 },
      { name: "Preensão com bola", sets: 3, reps: 20 }
    ]
  }

  const exercises = baseExercises[preferences.joint_area as keyof typeof baseExercises] || []
  
  // Ajustar dificuldade baseado na semana
  return exercises.map(ex => ({
    ...ex,
    rest_time_seconds: 60,
    reps: Math.min(ex.reps + week * 2, 20), // Aumenta repetições gradualmente
    notes: `Realizar o movimento de forma controlada. Parar se sentir dor aguda.`
  }))
}
