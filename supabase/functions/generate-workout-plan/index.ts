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

function calculateBaseWeight(exercise: any, preferences: UserPreferences) {
  const genderFactor = preferences.gender === 'male' ? 1 : 0.8;
  const weightFactor = preferences.weight / 70;
  const experienceFactor = {
    sedentary: 0.6,
    light: 0.8,
    moderate: 1,
    intense: 1.2
  }[preferences.activity_level] || 1;
  const ageFactor = preferences.age > 50 ? 0.8 : 1;

  let baseWeight = 10 * genderFactor * weightFactor * experienceFactor * ageFactor;
  
  if (exercise.exercise_type === 'compound') {
    baseWeight *= 1.5;
  }

  return {
    beginner: `${Math.round(baseWeight * 0.6)}-${Math.round(baseWeight * 0.8)}kg`,
    intermediate: `${Math.round(baseWeight * 0.8)}-${Math.round(baseWeight * 1.0)}kg`,
    advanced: `${Math.round(baseWeight * 1.0)}-${Math.round(baseWeight * 1.3)}kg`
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    
    const { preferences, userId } = await req.json();

    if (!preferences || !userId) {
      throw new Error('Missing required parameters');
    }

    console.log('Generating workout plan with preferences:', preferences);

    // Fetch exercises with simpler query first
    let query = supabaseAdmin
      .from('exercises')
      .select('*');

    // Add filters one by one with proper error handling
    try {
      if (preferences.available_equipment?.length > 0 && !preferences.available_equipment.includes('all')) {
        // Convert array to proper format for contains
        const equipmentFilter = preferences.available_equipment.filter(Boolean);
        if (equipmentFilter.length > 0) {
          query = query.contains('equipment_needed', equipmentFilter);
        }
      }

      if (preferences.preferred_exercise_types?.length > 0) {
        // Make sure we have valid exercise types
        const validTypes = preferences.preferred_exercise_types.filter(Boolean);
        if (validTypes.length > 0) {
          query = query.in('exercise_type', validTypes);
        }
      }
    } catch (filterError) {
      console.error('Error applying filters:', filterError);
      // If filters fail, fallback to getting all exercises
      query = supabaseAdmin.from('exercises').select('*');
    }

    const { data: exercises, error: exercisesError } = await query;

    if (exercisesError) {
      console.error('Database error fetching exercises:', exercisesError);
      throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
    }

    if (!exercises?.length) {
      console.log('No exercises found with filters, fetching all exercises as fallback');
      const { data: allExercises, error: allExercisesError } = await supabaseAdmin
        .from('exercises')
        .select('*');

      if (allExercisesError) {
        throw new Error('Could not fetch any exercises');
      }

      if (!allExercises?.length) {
        throw new Error('No exercises found in database');
      }

      console.log(`Found ${allExercises.length} exercises in total`);
      exercises = allExercises;
    } else {
      console.log(`Found ${exercises.length} exercises matching preferences`);
    }

    // Create the workout plan
    const plan = {
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    const { data: savedPlan, error: planError } = await supabaseAdmin
      .from('workout_plans')
      .insert(plan)
      .select()
      .single();

    if (planError) {
      throw new Error(`Failed to save workout plan: ${planError.message}`);
    }

    console.log('Saved workout plan:', savedPlan);

    // Create sessions
    const sessionsCount = preferences.activity_level === 'intense' ? 5 :
                         preferences.activity_level === 'moderate' ? 4 : 3;

    const sessionsData = Array.from({ length: sessionsCount }, (_, i) => ({
      plan_id: savedPlan.id,
      day_number: i + 1,
      warmup_description: "5-10 minutos de aquecimento geral, incluindo alongamentos dinâmicos",
      cooldown_description: "5 minutos de alongamentos e exercícios de relaxamento"
    }));

    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('workout_sessions')
      .insert(sessionsData)
      .select();

    if (sessionsError) {
      await supabaseAdmin.from('workout_plans').delete().eq('id', savedPlan.id);
      throw new Error(`Failed to save workout sessions: ${sessionsError.message}`);
    }

    console.log('Saved workout sessions:', sessions);

    // Create exercises for each session
    for (const session of sessions) {
      const exercisesCount = preferences.goal === 'gain_mass' ? 6 : 8;
      const selectedExercises = exercises
        .sort(() => Math.random() - 0.5)
        .slice(0, exercisesCount);

      const sessionExercises = selectedExercises.map((exercise, index) => ({
        session_id: session.id,
        exercise_id: exercise.id,
        sets: preferences.goal === 'gain_mass' ? 4 : 3,
        reps: preferences.goal === 'gain_mass' ? 8 : 12,
        rest_time_seconds: preferences.goal === 'gain_mass' ? 90 : 60,
        order_in_session: index + 1
      }));

      const { error: exercisesError } = await supabaseAdmin
        .from('session_exercises')
        .insert(sessionExercises);

      if (exercisesError) {
        await supabaseAdmin.from('workout_sessions').delete().eq('plan_id', savedPlan.id);
        await supabaseAdmin.from('workout_plans').delete().eq('id', savedPlan.id);
        throw new Error(`Failed to save session exercises: ${exercisesError.message}`);
      }
    }

    // Fetch the complete plan
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
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch complete plan: ${fetchError.message}`);
    }

    // Transform the data
    const transformedPlan = {
      ...completePlan,
      workout_sessions: completePlan.workout_sessions.map(session => ({
        day_number: session.day_number,
        warmup_description: session.warmup_description,
        cooldown_description: session.cooldown_description,
        exercises: session.session_exercises.map(se => ({
          name: se.exercise.name,
          sets: se.sets,
          reps: se.reps,
          rest_time_seconds: se.rest_time_seconds,
          gifUrl: se.exercise.gif_url,
          weight_recommendation: calculateBaseWeight(se.exercise, preferences),
          notes: `${se.exercise.description || ''}
                 \nTipo: ${se.exercise.exercise_type}
                 \nGrupo Muscular: ${se.exercise.muscle_group}`
        }))
      }))
    };

    return new Response(
      JSON.stringify(transformedPlan),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});
