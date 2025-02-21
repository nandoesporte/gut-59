
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // Using service role key for admin access

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
    
    // Parse request body
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

    // Generate workout plan
    const workoutPlan = {
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      workout_sessions: generateWorkoutSessions(exercises, preferences)
    }

    // Save workout plan
    const { data: savedPlan, error: saveError } = await supabaseAdmin
      .from('workout_plans')
      .insert(workoutPlan)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving workout plan:', saveError)
      throw new Error('Failed to save workout plan')
    }

    // Return success response
    return new Response(
      JSON.stringify(savedPlan),
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
        weight_recommendation: {
          beginner: "8-12kg",
          intermediate: "15-20kg",
          advanced: "25kg+"
        },
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
