
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    console.log("Recebendo requisição com preferências:", preferences);

    if (!userId) {
      throw new Error("User ID é obrigatório");
    }

    // Inicializa o cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Busca exercícios disponíveis
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .eq('muscle_group', 'full_body');

    if (exercisesError) {
      console.error("Erro ao buscar exercícios:", exercisesError);
      throw new Error("Erro ao buscar exercícios");
    }

    if (!exercises || exercises.length === 0) {
      throw new Error("Nenhum exercício encontrado");
    }

    // Gera um plano de treino baseado nas preferências
    const workoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      workout_sessions: Array.from({ length: 3 }, (_, i) => ({
        id: crypto.randomUUID(),
        day_number: i + 1,
        warmup_description: "Aquecimento dinâmico de 10 minutos incluindo mobilidade articular",
        cooldown_description: "Alongamento estático de 10 minutos focando nos músculos trabalhados",
        exercises: exercises.slice(0, 6).map(exercise => ({
          name: exercise.name,
          sets: 3,
          reps: 12,
          rest_time_seconds: 60,
          gifUrl: exercise.gif_url
        }))
      }))
    };

    console.log("Plano gerado:", workoutPlan);

    // Salva o plano no banco de dados
    const { error: insertError } = await supabase
      .from('workout_plans')
      .insert([{
        id: workoutPlan.id,
        user_id: userId,
        goal: workoutPlan.goal,
        start_date: workoutPlan.start_date,
        end_date: workoutPlan.end_date
      }]);

    if (insertError) {
      console.error("Erro ao salvar plano:", insertError);
      throw new Error("Erro ao salvar plano de treino");
    }

    // Salva as sessões de treino
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

      if (sessionError) {
        console.error("Erro ao salvar sessão:", sessionError);
        throw new Error("Erro ao salvar sessões de treino");
      }

      // Salva os exercícios da sessão
      const sessionExercises = session.exercises.map((exercise, index) => ({
        session_id: session.id,
        exercise_id: exercises[index].id,
        sets: exercise.sets,
        reps: exercise.reps,
        rest_time_seconds: exercise.rest_time_seconds,
        order_in_session: index + 1
      }));

      const { error: exercisesError } = await supabase
        .from('session_exercises')
        .insert(sessionExercises);

      if (exercisesError) {
        console.error("Erro ao salvar exercícios:", exercisesError);
        throw new Error("Erro ao salvar exercícios da sessão");
      }
    }

    return new Response(
      JSON.stringify(workoutPlan),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Erro na função:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno ao gerar plano de treino"
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
});
