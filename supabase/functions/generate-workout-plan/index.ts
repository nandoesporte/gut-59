
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    console.log("Recebendo preferências:", preferences);

    if (!userId) {
      throw new Error("User ID é obrigatório");
    }

    // Inicializa o cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Busca exercícios baseados no grupo muscular selecionado
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .eq('muscle_group', preferences.muscleGroup || 'full_body')
      .eq('exercise_type', preferences.preferredExerciseTypes?.[0] || 'strength');

    if (exercisesError) {
      console.error("Erro ao buscar exercícios:", exercisesError);
      throw new Error("Erro ao buscar exercícios");
    }

    if (!exercises || exercises.length === 0) {
      throw new Error("Nenhum exercício encontrado para as preferências selecionadas");
    }

    // Função auxiliar para embaralhar array
    const shuffleArray = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    // Seleciona exercícios aleatórios para cada sessão
    const exercisesPerSession = Math.min(6, exercises.length);
    const sessions = Array.from({ length: preferences.frequency }, (_, i) => {
      const sessionExercises = shuffleArray([...exercises])
        .slice(0, exercisesPerSession)
        .map(exercise => ({
          name: exercise.name,
          sets: preferences.experienceLevel === 'beginner' ? 3 : 4,
          reps: preferences.goal === 'gain_mass' ? 8 : 12,
          rest_time_seconds: preferences.goal === 'gain_mass' ? 90 : 60,
          gifUrl: exercise.gif_url
        }));

      return {
        id: crypto.randomUUID(),
        day_number: i + 1,
        warmup_description: "Aquecimento dinâmico de 10 minutos incluindo mobilidade articular",
        cooldown_description: "Alongamento estático de 10 minutos focando nos músculos trabalhados",
        exercises: sessionExercises
      };
    });

    // Gera o plano completo
    const workoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 28 dias
      workout_sessions: sessions
    };

    // Salva o plano no banco de dados
    const { error: planError } = await supabase
      .from('workout_plans')
      .insert([{
        id: workoutPlan.id,
        user_id: userId,
        plan_data: workoutPlan,
        active: true
      }]);

    if (planError) {
      console.error("Erro ao salvar plano:", planError);
      throw new Error("Erro ao salvar plano de treino");
    }

    // Salva as sessões
    for (const session of sessions) {
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
