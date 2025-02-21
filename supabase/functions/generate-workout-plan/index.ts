
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

interface UserPreferences {
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  goal: string;
  activity_level: string;
  preferred_exercise_types: string[];
  available_equipment: string[];
}

function calculateBaseWeight(exercise: any, preferences: UserPreferences): {
  beginner: string;
  intermediate: string;
  advanced: string;
} {
  // Fator base dependendo do sexo
  const genderFactor = preferences.gender === 'male' ? 1 : 0.8;
  
  // Fator de peso corporal (pessoas mais pesadas podem geralmente levantar mais peso)
  const weightFactor = preferences.weight / 70; // 70kg como referência
  
  // Fator de experiência baseado no nível de atividade
  const experienceFactor = {
    sedentary: 0.6,
    light: 0.8,
    moderate: 1,
    intense: 1.2
  }[preferences.activity_level] || 1;

  // Fator de idade (força tende a diminuir após certa idade)
  const ageFactor = preferences.age > 50 ? 0.8 : 1;

  // Base weight calculation
  let baseWeight = 10 * genderFactor * weightFactor * experienceFactor * ageFactor;

  // Ajuste baseado no tipo de exercício
  if (exercise.exercise_type === 'compound') {
    baseWeight *= 1.5; // Exercícios compostos permitem mais peso
  }

  // Definir ranges para cada nível
  return {
    beginner: `${Math.round(baseWeight * 0.6)}-${Math.round(baseWeight * 0.8)}kg`,
    intermediate: `${Math.round(baseWeight * 0.8)}-${Math.round(baseWeight * 1.0)}kg`,
    advanced: `${Math.round(baseWeight * 1.0)}-${Math.round(baseWeight * 1.3)}kg`
  };
}

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

    // Fetch exercises based on preferences
    const { data: exercises, error: exercisesError } = await supabaseAdmin
      .from('exercises')
      .select('*')
      .filter('equipment_needed', 'overlaps', preferences.available_equipment)
      .filter('exercise_type', 'in', `(${preferences.preferred_exercise_types.join(',')})`)

    if (exercisesError) {
      console.error('Error fetching exercises:', exercisesError)
      throw new Error('Failed to fetch exercises')
    }

    if (!exercises || exercises.length === 0) {
      throw new Error('No suitable exercises found for the given preferences')
    }

    console.log(`Found ${exercises.length} suitable exercises`)

    // Create workout plan
    const workoutPlan = {
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }

    const { data: savedPlan, error: planError } = await supabaseAdmin
      .from('workout_plans')
      .insert(workoutPlan)
      .select()
      .single()

    if (planError) {
      console.error('Error saving workout plan:', planError)
      throw new Error(`Failed to save workout plan: ${planError.message}`)
    }

    // Generate sessions based on preferences
    const sessionsPerWeek = preferences.activity_level === 'intense' ? 5 :
                           preferences.activity_level === 'moderate' ? 4 :
                           preferences.activity_level === 'light' ? 3 : 2;

    const sessions = [];
    for (let i = 0; i < sessionsPerWeek; i++) {
      // Selecionar exercícios baseados no objetivo
      const exercisesCount = preferences.goal === 'gain_mass' ? 6 :
                            preferences.goal === 'lose_weight' ? 8 : 5;

      const selectedExercises = exercises
        .sort(() => Math.random() - 0.5)
        .slice(0, exercisesCount);

      sessions.push({
        plan_id: savedPlan.id,
        day_number: i + 1,
        warmup_description: "5-10 minutos de aquecimento geral, incluindo alongamentos dinâmicos",
        cooldown_description: "5 minutos de alongamentos e exercícios de relaxamento"
      });
    }

    // Save sessions
    const { data: savedSessions, error: sessionsError } = await supabaseAdmin
      .from('workout_sessions')
      .insert(sessions)
      .select()

    if (sessionsError) {
      console.error('Error saving sessions:', sessionsError)
      await supabaseAdmin.from('workout_plans').delete().eq('id', savedPlan.id)
      throw new Error('Failed to save workout sessions')
    }

    // Generate exercises for each session with appropriate weights
    for (const session of savedSessions) {
      const exercisesForSession = exercises
        .sort(() => Math.random() - 0.5)
        .slice(0, preferences.goal === 'gain_mass' ? 6 : 8)
        .map((exercise, index) => {
          const weights = calculateBaseWeight(exercise, preferences);
          
          return {
            session_id: session.id,
            exercise_id: exercise.id,
            sets: preferences.goal === 'gain_mass' ? 4 : 3,
            reps: preferences.goal === 'gain_mass' ? 8 : 12,
            rest_time_seconds: preferences.goal === 'gain_mass' ? 90 : 60,
            order_in_session: index + 1
          };
        });

      const { error: exercisesError } = await supabaseAdmin
        .from('session_exercises')
        .insert(exercisesForSession)

      if (exercisesError) {
        console.error('Error saving session exercises:', exercisesError)
        await supabaseAdmin.from('workout_sessions').delete().eq('plan_id', savedPlan.id)
        await supabaseAdmin.from('workout_plans').delete().eq('id', savedPlan.id)
        throw new Error('Failed to save session exercises')
      }
    }

    // Fetch complete plan with all related data
    const { data: completePlan, error: fetchError } = await supabaseAdmin
      .from('workout_plans')
      .select(`
        *,
        workout_sessions (
          *,
          session_exercises (
            *,
            exercise:exercises (*)
          )
        )
      `)
      .eq('id', savedPlan.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete plan:', fetchError)
      throw new Error('Failed to fetch complete workout plan')
    }

    // Transform data with proper weight recommendations
    const transformedPlan = {
      ...completePlan,
      workout_sessions: completePlan.workout_sessions.map(session => ({
        day_number: session.day_number,
        warmup_description: session.warmup_description,
        cooldown_description: session.cooldown_description,
        exercises: session.session_exercises.map(se => {
          const weights = calculateBaseWeight(se.exercise, preferences);
          return {
            name: se.exercise.name,
            sets: se.sets,
            reps: se.reps,
            rest_time_seconds: se.rest_time_seconds,
            gifUrl: se.exercise.gif_url,
            weight_recommendation: weights,
            notes: `${se.exercise.description || ''}
                   \nTipo: ${se.exercise.exercise_type}
                   \nGrupo Muscular: ${se.exercise.muscle_group}
                   \nEquipamento: ${se.exercise.equipment_needed?.join(', ') || 'Nenhum'}`
          };
        })
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
      JSON.stringify({ error: error.message || 'Internal server error' }),
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
