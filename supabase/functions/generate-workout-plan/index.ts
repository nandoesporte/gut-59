
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WorkoutPreferences } from "../_shared/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Exercise {
  id: string;
  name: string;
  gif_url: string;
  exercise_type: string;
  muscle_group: string;
  difficulty: string;
  equipment_needed: string[];
  goals: string[];
  description: string;
  rest_time_seconds: number;
  min_reps: number;
  max_reps: number;
  min_sets: number;
  max_sets: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Starting workout plan generation`);

    const { preferences } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch exercises that match user preferences
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .in('exercise_type', preferences.preferred_exercise_types)
      .contains('equipment_needed', preferences.available_equipment)
      .contains('goals', [preferences.goal])
      .not('gif_url', 'is', null);

    if (exercisesError) {
      throw new Error('Error fetching exercises: ' + exercisesError.message);
    }

    console.log(`[${requestId}] Found ${exercises?.length || 0} exercises`);

    if (!exercises || exercises.length === 0) {
      throw new Error('No suitable exercises found for the given preferences');
    }

    // Group exercises by type for better distribution
    const exercisesByType = exercises.reduce((acc, exercise) => {
      if (!acc[exercise.exercise_type]) {
        acc[exercise.exercise_type] = [];
      }
      acc[exercise.exercise_type].push(exercise);
      return acc;
    }, {} as Record<string, Exercise[]>);

    // Generate a 7-day workout plan
    const workoutPlan = {
      goal: preferences.goal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      workout_sessions: Array.from({ length: 7 }, (_, dayIndex) => {
        // Alternate between different exercise types
        const dayType = preferences.preferred_exercise_types[dayIndex % preferences.preferred_exercise_types.length];
        const availableExercises = exercisesByType[dayType] || [];
        
        // Select exercises for the day
        const dayExercises = shuffleArray(availableExercises)
          .slice(0, 6)
          .map(exercise => ({
            name: exercise.name,
            sets: Math.floor((exercise.min_sets + exercise.max_sets) / 2),
            reps: Math.floor((exercise.min_reps + exercise.max_reps) / 2),
            rest_time_seconds: exercise.rest_time_seconds,
            gifUrl: exercise.gif_url,
            notes: exercise.description
          }));

        return {
          day_number: dayIndex + 1,
          warmup_description: generateWarmup(dayType),
          cooldown_description: generateCooldown(dayType),
          exercises: dayExercises
        };
      })
    };

    // Save the workout plan
    const { data: savedPlan, error: saveError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: preferences.userId,
        goal: preferences.goal,
        start_date: workoutPlan.start_date,
        end_date: workoutPlan.end_date
      })
      .select()
      .single();

    if (saveError) {
      throw new Error('Error saving workout plan: ' + saveError.message);
    }

    // Save workout sessions
    for (const session of workoutPlan.workout_sessions) {
      const { data: savedSession, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          plan_id: savedPlan.id,
          day_number: session.day_number,
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error('Error saving workout session: ' + sessionError.message);
      }

      // Save exercises for this session
      const sessionExercises = session.exercises.map((exercise, index) => ({
        session_id: savedSession.id,
        exercise_id: exercises.find(e => e.name === exercise.name)?.id,
        sets: exercise.sets,
        reps: exercise.reps,
        rest_time_seconds: exercise.rest_time_seconds,
        order_in_session: index + 1
      }));

      const { error: exercisesError } = await supabase
        .from('session_exercises')
        .insert(sessionExercises);

      if (exercisesError) {
        throw new Error('Error saving session exercises: ' + exercisesError.message);
      }
    }

    return new Response(
      JSON.stringify(workoutPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating workout plan:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

// Helper functions
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function generateWarmup(exerciseType: string): string {
  const warmups = {
    strength: "5-10 minutos de exercício cardio leve seguido por movimentos de mobilidade articular. Faça 2-3 séries leves dos primeiros exercícios para aquecer os músculos específicos.",
    cardio: "5 minutos de caminhada leve, seguido por alongamentos dinâmicos e exercícios de mobilidade. Aumente gradualmente a intensidade.",
    mobility: "10 minutos de mobilidade articular progressiva, focando nas áreas que serão trabalhadas. Movimentos suaves e controlados."
  };
  return warmups[exerciseType as keyof typeof warmups] || warmups.strength;
}

function generateCooldown(exerciseType: string): string {
  const cooldowns = {
    strength: "5-10 minutos de alongamentos estáticos focando nos músculos trabalhados. Mantenha cada alongamento por 20-30 segundos.",
    cardio: "5 minutos de caminhada leve para normalizar a frequência cardíaca, seguido por alongamentos suaves.",
    mobility: "Série de alongamentos suaves e exercícios de respiração para relaxamento. Foco em restaurar a amplitude de movimento normal."
  };
  return cooldowns[exerciseType as keyof typeof cooldowns] || cooldowns.strength;
}
