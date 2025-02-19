
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { preferences, userId } = await req.json();

    // Fetch available exercises from the database
    const { data: availableExercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .eq('muscle_group', preferences.muscleGroup);

    if (exercisesError) throw exercisesError;

    // Check if we have enough exercises with GIFs
    const exercisesWithGifs = availableExercises.filter(ex => ex.gif_url);
    const exercisesWithoutGifs = availableExercises.filter(ex => !ex.gif_url);

    // If there are exercises without GIFs, notify admin
    if (exercisesWithoutGifs.length > 0) {
      // Create a list of exercises that need GIFs
      const missingGifsMessage = {
        content: `Os seguintes exercícios precisam de GIFs:\n${exercisesWithoutGifs.map(ex => ex.name).join('\n')}`,
        type: 'sistema',
        sender_id: userId,
        receiver_id: userId // Este deve ser alterado para o ID do admin
      };

      await supabase.from('messages').insert(missingGifsMessage);
    }

    // Generate workout plan using available exercises
    const workoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 28 dias
      workout_sessions: Array.from({ length: 3 }, (_, i) => ({
        id: crypto.randomUUID(),
        day_number: i + 1,
        warmup_description: "Aquecimento dinâmico de 10 minutos",
        cooldown_description: "Alongamento estático de 10 minutos",
        exercises: exercisesWithGifs.slice(0, 6).map(exercise => ({
          name: exercise.name,
          sets: exercise.min_sets,
          reps: exercise.min_reps,
          rest_time_seconds: exercise.rest_time_seconds,
          gifUrl: exercise.gif_url
        }))
      }))
    };

    // Save the workout plan
    const { data: savedPlan, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        id: workoutPlan.id,
        user_id: userId,
        goal: workoutPlan.goal,
        start_date: workoutPlan.start_date,
        end_date: workoutPlan.end_date
      })
      .select()
      .single();

    if (planError) throw planError;

    // Save workout sessions
    for (const session of workoutPlan.workout_sessions) {
      const { error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          id: session.id,
          plan_id: workoutPlan.id,
          day_number: session.day_number,
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description
        });

      if (sessionError) throw sessionError;

      // Save session exercises
      const sessionExercises = session.exercises.map((exercise, index) => ({
        session_id: session.id,
        exercise_id: exercisesWithGifs[index].id,
        sets: exercise.sets,
        reps: exercise.reps,
        rest_time_seconds: exercise.rest_time_seconds,
        order_in_session: index + 1
      }));

      const { error: exercisesError } = await supabase
        .from('session_exercises')
        .insert(sessionExercises);

      if (exercisesError) throw exercisesError;
    }

    return new Response(JSON.stringify(workoutPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
