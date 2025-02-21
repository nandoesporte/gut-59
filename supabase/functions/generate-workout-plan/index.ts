
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();

    if (!preferences || !userId) {
      throw new Error('Preferências ou ID do usuário não fornecidos');
    }

    console.log('Gerando plano de treino para:', { preferences, userId });

    // Buscar exercícios disponíveis baseado nas preferências
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .eq('equipment', preferences.available_equipment)
      .in('type', preferences.preferred_exercise_types);

    if (exercisesError) {
      throw new Error('Erro ao buscar exercícios');
    }

    if (!exercises || exercises.length === 0) {
      throw new Error('Nenhum exercício encontrado para as preferências selecionadas');
    }

    // Gerar plano de treino
    const workoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
      workout_sessions: generateWorkoutSessions(exercises, preferences),
    };

    // Salvar o plano no banco
    const { error: saveError } = await supabase
      .from('workout_plans')
      .insert([workoutPlan]);

    if (saveError) {
      console.error('Erro ao salvar plano:', saveError);
      throw new Error('Erro ao salvar plano de treino');
    }

    return new Response(JSON.stringify(workoutPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na edge function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno ao gerar plano de treino' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function generateWorkoutSessions(exercises: any[], preferences: any) {
  const sessionsPerWeek = getSessionsPerWeek(preferences.activity_level);
  const sessions = [];

  for (let day = 1; day <= sessionsPerWeek; day++) {
    const session = {
      day_number: day,
      warmup_description: generateWarmup(),
      cooldown_description: generateCooldown(),
      exercises: selectExercisesForSession(exercises, preferences),
    };
    sessions.push(session);
  }

  return sessions;
}

function getSessionsPerWeek(activityLevel: string) {
  switch (activityLevel) {
    case 'sedentary': return 3;
    case 'light': return 4;
    case 'moderate': return 5;
    case 'intense': return 6;
    default: return 3;
  }
}

function generateWarmup() {
  return `5-10 minutos de aquecimento cardiovascular leve seguido por mobilidade articular`;
}

function generateCooldown() {
  return `5-10 minutos de alongamento dos principais grupos musculares trabalhados`;
}

function selectExercisesForSession(exercises: any[], preferences: any) {
  const exercisesPerSession = 6;
  const selectedExercises = [];

  // Embaralhar exercícios
  const shuffledExercises = [...exercises].sort(() => Math.random() - 0.5);

  for (let i = 0; i < exercisesPerSession && i < shuffledExercises.length; i++) {
    const exercise = shuffledExercises[i];
    selectedExercises.push({
      name: exercise.name,
      sets: getSetsBasedOnGoal(preferences.goal),
      reps: getRepsBasedOnGoal(preferences.goal),
      rest_time_seconds: getRestTimeBasedOnGoal(preferences.goal),
      gifUrl: exercise.gif_url,
    });
  }

  return selectedExercises;
}

function getSetsBasedOnGoal(goal: string) {
  switch (goal) {
    case 'lose_weight': return 3;
    case 'gain_mass': return 4;
    case 'maintain': return 3;
    default: return 3;
  }
}

function getRepsBasedOnGoal(goal: string) {
  switch (goal) {
    case 'lose_weight': return 15;
    case 'gain_mass': return 8;
    case 'maintain': return 12;
    default: return 12;
  }
}

function getRestTimeBasedOnGoal(goal: string) {
  switch (goal) {
    case 'lose_weight': return 30;
    case 'gain_mass': return 90;
    case 'maintain': return 60;
    default: return 60;
  }
}
