
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
    
    let body
    try {
      body = await req.json()
      console.log('Request body:', body)
    } catch (e) {
      throw new Error('Failed to parse request body')
    }

    const { preferences, userId } = body

    if (!preferences || !userId) {
      throw new Error('Missing required parameters')
    }

    // Fetch available exercises
    const { data: exercises, error: exercisesError } = await supabaseAdmin
      .from('exercises')
      .select('*')

    if (exercisesError) {
      console.error('Error fetching exercises:', exercisesError)
      throw new Error('Failed to fetch exercises')
    }

    if (!exercises || exercises.length === 0) {
      throw new Error('No exercises found')
    }

    console.log(`Found ${exercises.length} exercises`)

    // First, create the workout plan
    const workoutPlan = {
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    // Save workout plan
    const { data: savedPlan, error: planError } = await supabaseAdmin
      .from('workout_plans')
      .insert(workoutPlan)
      .select()
      .single()

    if (planError) {
      console.error('Error saving workout plan:', planError)
      throw new Error('Failed to save workout plan')
    }

    // Generate and save workout sessions
    const sessions = generateWorkoutSessions(exercises, preferences)
    const workoutSessions = sessions.map(session => ({
      ...session,
      plan_id: savedPlan.id
    }))

    // Save workout sessions
    const { data: savedSessions, error: sessionsError } = await supabaseAdmin
      .from('workout_sessions')
      .insert(workoutSessions)
      .select()

    if (sessionsError) {
      console.error('Error saving workout sessions:', sessionsError)
      // Cleanup the workout plan if sessions fail to save
      await supabaseAdmin
        .from('workout_plans')
        .delete()
        .eq('id', savedPlan.id)
      throw new Error('Failed to save workout sessions')
    }

    // Save session exercises for each session
    for (const session of savedSessions) {
      const sessionExercises = sessions
        .find(s => s.day_number === session.day_number)
        ?.exercises.map((exercise, index) => ({
          session_id: session.id,
          exercise_id: exercises.find(e => e.name === exercise.name)?.id,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_time_seconds: exercise.rest_time_seconds,
          order_in_session: index + 1
        }))

      if (sessionExercises) {
        const { error: exercisesError } = await supabaseAdmin
          .from('session_exercises')
          .insert(sessionExercises)

        if (exercisesError) {
          console.error('Error saving session exercises:', exercisesError)
          // Cleanup if exercises fail to save
          await supabaseAdmin.from('workout_sessions').delete().eq('plan_id', savedPlan.id)
          await supabaseAdmin.from('workout_plans').delete().eq('id', savedPlan.id)
          throw new Error('Failed to save session exercises')
        }
      }
    }

    // Fetch the complete workout plan with all related data
    const { data: completePlan, error: fetchError } = await supabaseAdmin
      .from('workout_plans')
      .select(`
        *,
        workout_sessions (
          *,
          session_exercises (
            *,
            exercises (*)
          )
        )
      `)
      .eq('id', savedPlan.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete plan:', fetchError)
      throw new Error('Failed to fetch complete workout plan')
    }

    // Transform the data to match the expected format
    const transformedPlan = {
      ...completePlan,
      workout_sessions: completePlan.workout_sessions.map(session => ({
        day_number: session.day_number,
        warmup_description: session.warmup_description,
        cooldown_description: session.cooldown_description,
        exercises: session.session_exercises.map(se => ({
          name: se.exercises.name,
          sets: se.sets,
          reps: se.reps,
          rest_time_seconds: se.rest_time_seconds,
          gifUrl: se.exercises.gif_url,
          weight_recommendation: {
            beginner: se.exercises.difficulty === 'beginner' ? '8-12kg' : '12-15kg',
            intermediate: se.exercises.difficulty === 'beginner' ? '12-15kg' : '15-20kg',
            advanced: se.exercises.difficulty === 'beginner' ? '15-20kg' : '20-25kg'
          },
          notes: se.exercises.description
        }))
      }))
    }

    return new Response(
      JSON.stringify(transformedPlan),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in edge function:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    )
  }
})

function generateWorkoutSessions(exercises: any[], preferences: any) {
  const sessions = []
  const sessionsPerWeek = 3
  
  for (let i = 0; i < sessionsPerWeek; i++) {
    const dayNumber = i + 1
    const selectedExercises = exercises
      .sort(() => Math.random() - 0.5)
      .slice(0, 4)
      .map(exercise => ({
        name: exercise.name,
        sets: 3,
        reps: 12,
        rest_time_seconds: 60,
        gifUrl: exercise.gif_url,
        notes: exercise.description || undefined
      }))

    sessions.push({
      day_number: dayNumber,
      warmup_description: "5-10 minutos de aquecimento geral, incluindo alongamentos dinâmicos",
      cooldown_description: "5 minutos de alongamentos e exercícios de relaxamento",
      exercises: selectedExercises
    })
  }

  return sessions
}
