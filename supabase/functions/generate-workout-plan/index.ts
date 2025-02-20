
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    console.log("Recebendo preferências:", JSON.stringify(preferences, null, 2));

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID é obrigatório" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do Supabase ausente" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Busca exercícios básicos primeiro
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .limit(20);

    if (exercisesError) {
      console.error("Erro ao buscar exercícios:", exercisesError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar exercícios" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    if (!exercises || exercises.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum exercício encontrado na base de dados" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    console.log(`Encontrados ${exercises.length} exercícios`);

    // Gera as sessões de treino
    const workoutSessions = Array.from({ length: 3 }, (_, i) => ({
      id: crypto.randomUUID(),
      day_number: i + 1,
      warmup_description: "Aquecimento dinâmico de 10 minutos incluindo mobilidade articular",
      cooldown_description: "Alongamento estático de 10 minutos focando nos músculos trabalhados",
      exercises: exercises
        .slice(0, 6)
        .map(exercise => ({
          name: exercise.name,
          sets: 3,
          reps: 12,
          rest_time_seconds: 60,
          gifUrl: exercise.gif_url
        }))
    }));

    const workoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal || 'general_fitness',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      workout_sessions: workoutSessions
    };

    // Salva o plano
    const { error: planError } = await supabase
      .from('workout_plans')
      .insert({
        id: workoutPlan.id,
        user_id: userId,
        plan_data: workoutPlan,
        goal: workoutPlan.goal,
        start_date: workoutPlan.start_date,
        end_date: workoutPlan.end_date,
        active: true
      });

    if (planError) {
      console.error("Erro ao salvar plano:", planError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar plano de treino" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    return new Response(
      JSON.stringify(workoutPlan),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
