
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { preferences, userId, requestId } = await req.json();

    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    console.log('Gerando plano de treino para usuário:', userId);
    console.log('Preferências recebidas:', JSON.stringify(preferences));
    console.log('Request ID:', requestId);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LLAMA_API_KEY = Deno.env.get('LLAMA_API_KEY');

    if (!LLAMA_API_KEY) {
      throw new Error('API key not configured');
    }

    // Create a Supabase client with the Admin key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the user exists (this makes the function work for any valid user, not just admins)
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Erro ao verificar usuário:', userError);
      if (userError.code === 'PGRST116') {
        throw new Error('Usuário não encontrado');
      }
      throw new Error('Erro ao verificar usuário');
    }

    // Continue with exercise fetching and workout plan generation
    // Fetch exercises from the database
    const { data: exercisesData, error: exercisesError } = await supabase
      .from('exercises')
      .select('*');

    if (exercisesError) {
      console.error('Erro ao buscar exercícios:', exercisesError);
      throw new Error('Falha ao buscar exercícios do banco de dados');
    }

    if (!exercisesData || exercisesData.length === 0) {
      throw new Error('Nenhum exercício disponível no banco de dados');
    }

    console.log(`Encontrados ${exercisesData.length} exercícios no banco de dados`);

    // Filter exercises based on user preferences
    let filteredExercises = exercisesData;
    
    if (preferences.preferred_exercise_types && preferences.preferred_exercise_types.length > 0) {
      filteredExercises = exercisesData.filter(ex => 
        preferences.preferred_exercise_types.includes(ex.exercise_type)
      );
      
      // If not enough exercises after filtering, use all
      if (filteredExercises.length < 20) {
        console.log('Poucos exercícios após filtro, usando todos disponíveis');
        filteredExercises = exercisesData;
      }
    }
    
    // Organize exercises by muscle group for better plan structure
    const exercisesByMuscle = {
      chest: filteredExercises.filter(ex => ex.muscle_group === 'chest'),
      back: filteredExercises.filter(ex => ex.muscle_group === 'back'),
      legs: filteredExercises.filter(ex => ex.muscle_group === 'legs'),
      shoulders: filteredExercises.filter(ex => ex.muscle_group === 'shoulders'),
      arms: filteredExercises.filter(ex => ex.muscle_group === 'arms'),
      core: filteredExercises.filter(ex => ex.muscle_group === 'core')
    };

    // Prepare a concise list of exercises to send to the AI
    const exercisesList = Object.entries(exercisesByMuscle).map(([group, exs]) => {
      const sampleExercises = exs.slice(0, 5).map(ex => ({
        id: ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        exercise_type: ex.exercise_type
      }));
      return `${group.toUpperCase()}: ${sampleExercises.map(e => `${e.name} (${e.id})`).join(', ')}`;
    }).join('\n');

    // Create a new workout plan in the database first
    const planId = crypto.randomUUID();
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30); // 30 days plan
    
    const { error: planError } = await supabase
      .from('workout_plans')
      .insert({
        id: planId,
        user_id: userId,
        goal: preferences.goal,
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });

    if (planError) {
      console.error('Erro ao criar plano inicial:', planError);
      throw new Error(`Falha ao criar o plano: ${planError.message}`);
    }

    console.log('Plano inicial criado com ID:', planId);

    // Define training frequency based on activity level
    let daysPerWeek = 3; // Default
    switch(preferences.activity_level) {
      case 'sedentary': daysPerWeek = 2; break;
      case 'light': daysPerWeek = 3; break;
      case 'moderate': daysPerWeek = 5; break;
      case 'intense': daysPerWeek = 6; break;
    }

    console.log(`Gerando plano com ${daysPerWeek} dias por semana`);

    // Create session structures based on frequency
    const sessionStructures = [];
    if (daysPerWeek <= 3) {
      // Full body approach for lower frequency
      for (let i = 0; i < daysPerWeek; i++) {
        sessionStructures.push({
          day_number: i + 1,
          day_name: `Treino Completo ${i + 1}`,
          focus: "Full Body",
          muscle_groups: ["chest", "back", "legs", "shoulders", "arms", "core"]
        });
      }
    } else if (daysPerWeek === 4) {
      // Upper/Lower split
      sessionStructures.push(
        { day_number: 1, day_name: "Peito e Tríceps", focus: "Upper Push", muscle_groups: ["chest", "arms"] },
        { day_number: 2, day_name: "Costas e Bíceps", focus: "Upper Pull", muscle_groups: ["back", "arms"] },
        { day_number: 3, day_name: "Pernas", focus: "Lower Body", muscle_groups: ["legs"] },
        { day_number: 4, day_name: "Ombros e Core", focus: "Shoulders & Core", muscle_groups: ["shoulders", "core"] }
      );
    } else if (daysPerWeek === 5) {
      // Body part split
      sessionStructures.push(
        { day_number: 1, day_name: "Peito", focus: "Chest", muscle_groups: ["chest"] },
        { day_number: 2, day_name: "Costas", focus: "Back", muscle_groups: ["back"] },
        { day_number: 3, day_name: "Pernas", focus: "Legs", muscle_groups: ["legs"] },
        { day_number: 4, day_name: "Ombros", focus: "Shoulders", muscle_groups: ["shoulders"] },
        { day_number: 5, day_name: "Braços e Core", focus: "Arms & Core", muscle_groups: ["arms", "core"] }
      );
    } else {
      // 6-day PPL
      sessionStructures.push(
        { day_number: 1, day_name: "Push A", focus: "Chest & Triceps", muscle_groups: ["chest", "arms"] },
        { day_number: 2, day_name: "Pull A", focus: "Back & Biceps", muscle_groups: ["back", "arms"] },
        { day_number: 3, day_name: "Legs A", focus: "Quadriceps", muscle_groups: ["legs"] },
        { day_number: 4, day_name: "Push B", focus: "Shoulders", muscle_groups: ["shoulders", "chest"] },
        { day_number: 5, day_name: "Pull B", focus: "Back Width", muscle_groups: ["back", "arms"] },
        { day_number: 6, day_name: "Legs B", focus: "Hamstrings", muscle_groups: ["legs", "core"] }
      );
    }

    // Create sessions and assign exercises
    for (const session of sessionStructures) {
      // Create the session
      const sessionId = crypto.randomUUID();
      
      const { error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          id: sessionId,
          plan_id: planId,
          day_number: session.day_number,
          day_name: session.day_name,
          focus: session.focus,
          warmup_description: `5-10 minutos de aquecimento cardiovascular leve, seguido por exercícios de mobilidade focados nos grupos musculares: ${session.muscle_groups.join(", ")}.`,
          cooldown_description: "5 minutos de alongamento estático para os músculos trabalhados, seguido por respiração profunda para reduzir a frequência cardíaca."
        });

      if (sessionError) {
        console.error(`Erro ao criar sessão ${session.day_number}:`, sessionError);
        continue;
      }

      // Select exercises for this session based on muscle groups
      const sessionExercises = [];
      
      // Number of exercises per session based on frequency
      const exercisesPerSession = daysPerWeek <= 3 ? 8 : 6;
      
      // Distribute exercises across muscle groups for this session
      for (const muscleGroup of session.muscle_groups) {
        const availableExercises = exercisesByMuscle[muscleGroup];
        const exercisesPerMuscle = Math.max(1, Math.floor(exercisesPerSession / session.muscle_groups.length));
        
        // Randomly select exercises for this muscle group
        const selectedExercises = [];
        const muscleExercises = [...availableExercises].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < exercisesPerMuscle && i < muscleExercises.length; i++) {
          selectedExercises.push(muscleExercises[i]);
        }
        
        sessionExercises.push(...selectedExercises);
      }
      
      // Limit to target number and ensure no duplicates
      const uniqueExercises = [...new Map(sessionExercises.map(ex => [ex.id, ex])).values()];
      const finalExercises = uniqueExercises.slice(0, exercisesPerSession);
      
      // Add the exercises to the session
      for (let i = 0; i < finalExercises.length; i++) {
        const exercise = finalExercises[i];
        
        // Default values based on exercise type
        let sets = exercise.min_sets || 3;
        let reps = exercise.min_reps || 10;
        let restTime = exercise.rest_time_seconds || 60;
        
        if (preferences.goal === 'strength') {
          sets = Math.min(5, (exercise.max_sets || 4));
          reps = Math.max(5, (exercise.min_reps || 8) - 2);
          restTime = Math.min(120, (exercise.rest_time_seconds || 90) + 30);
        } else if (preferences.goal === 'endurance') {
          sets = Math.max(3, (exercise.min_sets || 3));
          reps = Math.min(15, (exercise.max_reps || 12) + 3);
          restTime = Math.max(30, (exercise.rest_time_seconds || 60) - 15);
        }
        
        const { error: exerciseError } = await supabase
          .from('session_exercises')
          .insert({
            session_id: sessionId,
            exercise_id: exercise.id,
            sets: sets,
            reps: reps,
            rest_time_seconds: restTime,
            order_in_session: i + 1
          });
          
        if (exerciseError) {
          console.error(`Erro ao adicionar exercício à sessão:`, exerciseError);
        }
      }
    }

    // Retrieve the complete plan with all relationships
    const { data: completePlan, error: queryError } = await supabase
      .from('workout_plans')
      .select(`
        id, user_id, goal, start_date, end_date, created_at,
        workout_sessions (
          id, day_number, day_name, focus, warmup_description, cooldown_description,
          session_exercises (
            id, sets, reps, rest_time_seconds,
            exercise:exercises (id, name, description, gif_url, muscle_group, exercise_type)
          )
        )
      `)
      .eq('id', planId)
      .single();

    if (queryError) {
      console.error('Erro ao recuperar plano completo:', queryError);
      throw new Error(`Falha ao recuperar plano gerado: ${queryError.message}`);
    }

    console.log('Plano gerado com sucesso, retornando para o cliente');

    return new Response(
      JSON.stringify(completePlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro durante a geração do plano:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar plano de treino',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
