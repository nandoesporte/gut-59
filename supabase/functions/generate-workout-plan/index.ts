
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  gifUrl?: string;
}

interface WorkoutSession {
  id: string;
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  exercises: Exercise[];
}

interface WorkoutPlan {
  id: string;
  user_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  workout_sessions: WorkoutSession[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    console.log("Recebendo preferências:", preferences);

    if (!userId) {
      throw new Error("User ID é obrigatório");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Credenciais do Supabase não configuradas");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Busca exercícios
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .in('exercise_type', preferences.preferredExerciseTypes)
      .in('equipment_needed', preferences.availableEquipment);

    if (exercisesError) {
      console.error("Erro ao buscar exercícios:", exercisesError);
      throw new Error("Erro ao buscar exercícios");
    }

    if (!exercises || exercises.length === 0) {
      throw new Error("Nenhum exercício encontrado para as preferências selecionadas");
    }

    console.log(`Encontrados ${exercises.length} exercícios compatíveis`);

    // Função para embaralhar array
    const shuffleArray = <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Gera as sessões de treino
    const exercisesPerSession = Math.min(8, exercises.length);
    const sessions: WorkoutSession[] = Array.from(
      { length: preferences.frequency }, 
      (_, i) => {
        const sessionExercises = shuffleArray(exercises)
          .slice(0, exercisesPerSession)
          .map(exercise => ({
            name: exercise.name,
            sets: preferences.experienceLevel === 'beginner' ? 3 : 4,
            reps: preferences.goal === 'gain_mass' ? 8 : 12,
            rest_time_seconds: preferences.goal === 'gain_mass' ? 90 : 60,
            gifUrl: exercise.gif_url || undefined
          }));

        return {
          id: crypto.randomUUID(),
          day_number: i + 1,
          warmup_description: "Aquecimento dinâmico de 10 minutos incluindo mobilidade articular",
          cooldown_description: "Alongamento estático de 10 minutos focando nos músculos trabalhados",
          exercises: sessionExercises
        };
    });

    // Cria o plano completo
    const workoutPlan: WorkoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      workout_sessions: sessions
    };

    // Salva o plano no banco
    const { error: planError } = await supabase
      .from('workout_plans')
      .insert({
        id: workoutPlan.id,
        user_id: userId,
        plan_data: workoutPlan,
        active: true
      });

    if (planError) {
      console.error("Erro ao salvar plano:", planError);
      throw new Error("Erro ao salvar plano de treino");
    }

    console.log("Plano de treino gerado com sucesso:", workoutPlan.id);

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
        status: 500
      }
    );
  }
});
