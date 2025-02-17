
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { preferences, userId } = await req.json() as GenerateWorkoutRequest

    if (!preferences || !userId) {
      throw new Error('Missing required parameters')
    }

    // Fetch available exercises from the database
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .filter('difficulty', 'eq', preferences.activityLevel === 'sedentary' ? 'beginner' : preferences.activityLevel === 'light' ? 'beginner' : preferences.activityLevel === 'moderate' ? 'intermediate' : 'advanced')
      .in('exercise_type', preferences.preferredExerciseTypes)

    if (exercisesError) throw exercisesError
    if (!exercises || exercises.length === 0) {
      throw new Error('No exercises found matching the criteria')
    }

    // Create a map of available exercises for validation
    const availableExercises = new Map(exercises.map(e => [e.id, e]))

    // Generate prompt for OpenAI
    const prompt = `
      Create a personalized workout plan based on the following preferences:
      - Gender: ${preferences.gender}
      - Age: ${preferences.age}
      - Weight: ${preferences.weight}kg
      - Height: ${preferences.height}cm
      - Activity Level: ${preferences.activityLevel}
      - Goal: ${preferences.goal}
      - Health Conditions: ${preferences.healthConditions.join(', ') || 'None'}
      - Available Equipment: ${preferences.availableEquipment.join(', ')}
      - Training Location: ${preferences.trainingLocation}

      IMPORTANT: You MUST use ONLY the exercise IDs from the following list when creating the workout plan. DO NOT use exercise names or create new exercises.

      Available exercises:
      ${exercises.map(e => `- ID: "${e.id}" - ${e.name} (${e.exercise_type}, ${e.muscle_group})`).join('\n')}

      Create a 4-week workout plan with 3-4 sessions per week. For each session, include:
      1. Warmup description
      2. Main exercises (ONLY use exerciseId from the list above)
      3. Sets, reps, and rest times for each exercise
      4. Cooldown description
      
      Format the response as a JSON object with the following structure:
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

      VERY IMPORTANT: The exerciseId MUST be one of the exact IDs provided in the list above.
    `

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
          content: 'You are a professional fitness trainer specialized in creating personalized workout plans. You must only use the exact exercise IDs provided.'
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

    // Validate that all exercise IDs are valid
    for (const session of workoutPlan.plan.sessions) {
      for (const exercise of session.exercises) {
        if (!availableExercises.has(exercise.exerciseId)) {
          throw new Error(`Invalid exercise ID: ${exercise.exerciseId}`)
        }
      }
    }

    // Save the workout plan to the database
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

    // Save all sessions and exercises
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

    // Return the plan with exercises mapped to their names
    const transformedSessions = await Promise.all(workoutPlan.plan.sessions.map(async (session) => {
      const exerciseDetails = await Promise.all(session.exercises.map(async (exercise) => {
        const exerciseData = availableExercises.get(exercise.exerciseId)
        return {
          name: exerciseData?.name || 'Unknown Exercise',
          sets: exercise.sets,
          reps: exercise.reps,
          rest_time_seconds: exercise.restTimeSeconds
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
        sessions: transformedSessions
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
