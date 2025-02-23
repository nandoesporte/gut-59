
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
    const { preferences, userId } = await req.json()

    console.log('Received preferences:', preferences)

    // Fetch exercises based on preferences
    let query = supabase
      .from('exercises')
      .select('*')

    // Filter by exercise type if specified
    if (preferences.preferred_exercise_types && preferences.preferred_exercise_types.length > 0) {
      query = query.in('exercise_type', preferences.preferred_exercise_types)
    }

    // Add equipment filter if specified
    if (preferences.available_equipment && preferences.available_equipment.length > 0) {
      if (!preferences.available_equipment.includes('all')) {
        query = query.overlaps('equipment_needed', preferences.available_equipment)
      }
    }

    const { data: exercises, error: exercisesError } = await query

    if (exercisesError) {
      throw exercisesError
    }

    console.log(`Found ${exercises?.length || 0} matching exercises`)

    if (!exercises || exercises.length === 0) {
      throw new Error('No suitable exercises found for the given preferences')
    }

    // Create workout plan structure
    const workoutPlan = {
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date(),
      end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
      workout_sessions: generateWorkoutSessions(exercises, preferences)
    }

    // Save the workout plan
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .insert(workoutPlan)
      .select('id')
      .single()

    if (planError) throw planError

    // Save workout sessions
    for (const session of workoutPlan.workout_sessions) {
      const { data: workoutSession, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          plan_id: plan.id,
          day_number: session.day_number,
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description
        })
        .select('id')
        .single()

      if (sessionError) throw sessionError

      // Save session exercises
      for (const exercise of session.exercises) {
        const { error: exerciseError } = await supabase
          .from('session_exercises')
          .insert({
            session_id: workoutSession.id,
            exercise_id: exercise.id,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_time_seconds: exercise.rest_time_seconds
          })

        if (exerciseError) throw exerciseError
      }
    }

    return new Response(JSON.stringify(workoutPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error generating workout plan:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function generateWorkoutSessions(exercises: any[], preferences: any) {
  // Create 3 workout sessions per week for 4 weeks
  const sessions = []
  const sessionsPerWeek = 3
  const numberOfWeeks = 4

  for (let week = 0; week < numberOfWeeks; week++) {
    for (let session = 0; session < sessionsPerWeek; session++) {
      const dayNumber = week * sessionsPerWeek + session + 1

      // Select random exercises for this session
      const sessionExercises = selectExercisesForSession(exercises, preferences)

      sessions.push({
        day_number: dayNumber,
        warmup_description: generateWarmup(),
        cooldown_description: generateCooldown(),
        exercises: sessionExercises
      })
    }
  }

  return sessions
}

function selectExercisesForSession(exercises: any[], preferences: any) {
  const exercisesPerSession = 6
  const selectedExercises = []

  // Ensure we have a mix of exercise types
  const exercisesByType = exercises.reduce((acc: any, exercise: any) => {
    if (!acc[exercise.exercise_type]) {
      acc[exercise.exercise_type] = []
    }
    acc[exercise.exercise_type].push(exercise)
    return acc
  }, {})

  // Select exercises based on user's preferred types
  for (let i = 0; i < exercisesPerSession; i++) {
    const availableTypes = Object.keys(exercisesByType).filter(type => 
      exercisesByType[type].length > 0 &&
      preferences.preferred_exercise_types.includes(type)
    )

    if (availableTypes.length === 0) break

    const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)]
    const typeExercises = exercisesByType[randomType]
    const randomIndex = Math.floor(Math.random() * typeExercises.length)
    const selectedExercise = typeExercises[randomIndex]

    // Remove selected exercise to avoid duplicates
    exercisesByType[randomType] = typeExercises.filter((_: any, index: number) => index !== randomIndex)

    selectedExercises.push({
      id: selectedExercise.id,
      name: selectedExercise.name,
      sets: Math.floor(Math.random() * (selectedExercise.max_sets - selectedExercise.min_sets + 1)) + selectedExercise.min_sets,
      reps: Math.floor(Math.random() * (selectedExercise.max_reps - selectedExercise.min_reps + 1)) + selectedExercise.min_reps,
      rest_time_seconds: selectedExercise.rest_time_seconds
    })
  }

  return selectedExercises
}

function generateWarmup() {
  return "5-10 minutos de aquecimento cardiovascular leve seguido por exercícios de mobilidade dinâmica"
}

function generateCooldown() {
  return "5-10 minutos de alongamento dos principais grupos musculares trabalhados"
}
