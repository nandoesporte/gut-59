
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();

    if (!preferences || !userId) {
      throw new Error('Preferências ou ID do usuário não fornecidos');
    }

    console.log('Buscando exercícios com preferências:', preferences);

    let query = supabase
      .from('exercises')
      .select('*')
      .in('exercise_type', preferences.preferred_exercise_types);

    if (!preferences.available_equipment.includes('all')) {
      query = query.contains('equipment_needed', preferences.available_equipment);
    }

    const { data: exercises, error: exercisesError } = await query;

    if (exercisesError) {
      console.error('Erro ao buscar exercícios:', exercisesError);
      throw new Error('Erro ao buscar exercícios');
    }

    if (!exercises || exercises.length === 0) {
      console.error('Nenhum exercício encontrado para as preferências:', preferences);
      throw new Error('Nenhum exercício encontrado para as preferências selecionadas');
    }

    console.log(`Encontrados ${exercises.length} exercícios compatíveis`);

    // Primeiro, criar o plano de treino
    const { data: workoutPlan, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        goal: preferences.goal,
        start_date: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      .select()
      .single();

    if (planError) {
      console.error('Erro ao criar plano:', planError);
      throw new Error('Erro ao criar plano de treino');
    }

    console.log('Plano criado:', workoutPlan);

    // Depois, criar as sessões de treino
    const sessions = generateWorkoutSessions(exercises, preferences);
    const sessionsToInsert = sessions.map(session => ({
      plan_id: workoutPlan.id,
      day_number: session.day_number,
      warmup_description: session.warmup_description,
      cooldown_description: session.cooldown_description
    }));

    const { data: workoutSessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .insert(sessionsToInsert)
      .select();

    if (sessionsError) {
      console.error('Erro ao criar sessões:', sessionsError);
      throw new Error('Erro ao criar sessões de treino');
    }

    console.log('Sessões criadas:', workoutSessions);

    // Criar os exercícios para cada sessão
    for (let i = 0; i < workoutSessions.length; i++) {
      const sessionExercises = sessions[i].exercises.map(exercise => ({
        session_id: workoutSessions[i].id,
        exercise_id: exercise.id,
        sets: exercise.sets,
        reps: exercise.reps,
        rest_time_seconds: exercise.rest_time_seconds,
        order_in_session: 1
      }));

      const { error: exercisesInsertError } = await supabase
        .from('session_exercises')
        .insert(sessionExercises);

      if (exercisesInsertError) {
        console.error('Erro ao inserir exercícios da sessão:', exercisesInsertError);
        throw new Error('Erro ao inserir exercícios da sessão');
      }
    }

    // Montar o objeto de resposta completo
    const completePlan = {
      ...workoutPlan,
      workout_sessions: sessions
    };

    return new Response(JSON.stringify(completePlan), {
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
  const shuffledExercises = [...exercises].sort(() => Math.random() - 0.5);

  for (let i = 0; i < exercisesPerSession && i < shuffledExercises.length; i++) {
    const exercise = shuffledExercises[i];
    selectedExercises.push({
      id: exercise.id,
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
