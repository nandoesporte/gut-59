import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
    
    console.log('Gerando plano de treino para usuário:', userId);
    console.log('Preferências recebidas:', JSON.stringify(preferences));

    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    // Verificar existência do usuário, mas não rejeitar se não for admin
    // Isso corrige o problema para usuários não-admin
    try {
      const userResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      );
      
      if (!userResponse.ok) {
        console.warn(`Aviso: Não foi possível verificar o perfil do usuário: ${userId}`);
      }
    } catch (userCheckError) {
      console.warn(`Erro ao verificar usuário: ${userCheckError.message}`);
      // Continue com a geração do plano mesmo se a verificação falhar
    }

    // Buscar o prompt ativo para plano de treino
    const promptResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_agent_prompts?agent_type=eq.workout&is_active=eq.true&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!promptResponse.ok) {
      throw new Error('Erro ao buscar prompt de plano de treino');
    }

    const prompts = await promptResponse.json();
    
    if (!prompts || prompts.length === 0) {
      throw new Error('Nenhum prompt de plano de treino ativo encontrado');
    }

    const systemPrompt = prompts[0].prompt;
    
    // Buscar exercícios disponíveis com todos os campos importantes
    console.log('Buscando exercícios disponíveis...');
    const exercisesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/exercises?select=id,name,gif_url,description,muscle_group,equipment_needed,exercise_type,min_sets,max_sets,min_reps,max_reps,rest_time_seconds`, 
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );
    
    if (!exercisesResponse.ok) {
      const errorText = await exercisesResponse.text();
      console.error('Erro ao buscar exercícios:', errorText);
      throw new Error(`Falha ao buscar exercícios: ${errorText}`);
    }

    const exercises = await exercisesResponse.json();
    console.log(`Encontrados ${exercises.length} exercícios`);
    
    if (exercises.length === 0) {
      throw new Error('Nenhum exercício disponível no banco de dados');
    }

    // Criar um plano básico inicial
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30); // Plano de 30 dias
    
    const planId = crypto.randomUUID();

    console.log('Criando plano com ID:', planId);

    // Filtrar exercícios com base nas preferências do usuário
    let filteredExercises = exercises;
    
    if (preferences.preferred_exercise_types && preferences.preferred_exercise_types.length > 0) {
      filteredExercises = exercises.filter(ex => 
        preferences.preferred_exercise_types.includes(ex.exercise_type)
      );
      
      // Se não tivermos exercícios suficientes após o filtro, use todos
      if (filteredExercises.length < 10) {
        filteredExercises = exercises;
      }
    }
    
    console.log(`Após filtrar por preferências, temos ${filteredExercises.length} exercícios disponíveis`);
    
    // Garantir que temos exercícios com GIFs
    const exercisesWithGifs = filteredExercises.filter(ex => ex.gif_url);
    
    if (exercisesWithGifs.length < 20) {
      console.warn('Poucos exercícios com GIFs disponíveis');
    }
    
    // Preferir exercícios com GIFs, mas usar todos se necessário
    const usableExercises = exercisesWithGifs.length > 20 ? exercisesWithGifs : filteredExercises;
    
    // Criar plano no banco de dados
    const createPlanResponse = await fetch(`${SUPABASE_URL}/rest/v1/workout_plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: planId,
        user_id: userId,
        goal: preferences.goal || 'maintain',
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      })
    });

    if (!createPlanResponse.ok) {
      const errorText = await createPlanResponse.text();
      console.error('Erro ao criar plano:', errorText);
      throw new Error(`Falha ao criar o plano: ${errorText}`);
    }

    const createdPlan = await createPlanResponse.json();
    console.log('Plano criado com sucesso:', createdPlan);

    // Define número de dias por semana para o treino
    const daysPerWeek = preferences.days_per_week || 3;
    console.log(`Criando plano com ${daysPerWeek} dias por semana`);
    
    // Criar sessões e exercícios
    const sessionNames = [
      "Treino Superior", "Treino Inferior", "Treino de Push", 
      "Treino de Pull", "Treino de Legs", "Treino Full Body", 
      "Treino de Core"
    ];
    
    // Distribuir exercícios por grupos musculares
    const muscleGroups = [
      "chest", "back", "legs", "shoulders", "arms", "core"
    ];
    
    const exercisesByMuscle = {};
    muscleGroups.forEach(group => {
      // Filtrar e embaralhar exercícios por grupo muscular
      exercisesByMuscle[group] = usableExercises
        .filter(ex => ex.muscle_group === group)
        .sort(() => Math.random() - 0.5);
      
      console.log(`Encontrados ${exercisesByMuscle[group].length} exercícios para ${group}`);
    });
    
    // Criar estrutura de treino baseada em treino dividido
    const workoutStructure = [];
    
    // Definir estrutura baseada nos dias por semana
    if (daysPerWeek <= 3) {
      // Para poucos dias, usamos treinos full body
      for (let i = 0; i < daysPerWeek; i++) {
        workoutStructure.push({
          name: `Treino Completo ${i + 1}`,
          focus: "Full Body",
          muscle_groups: muscleGroups
        });
      }
    } else if (daysPerWeek === 4) {
      // Divisão de 4 dias
      workoutStructure.push(
        { name: "Peito e Tríceps", focus: "Upper Push", muscle_groups: ["chest", "arms", "shoulders"] },
        { name: "Costas e Bíceps", focus: "Upper Pull", muscle_groups: ["back", "arms"] },
        { name: "Membros Inferiores", focus: "Legs", muscle_groups: ["legs"] },
        { name: "Ombros e Core", focus: "Shoulders & Core", muscle_groups: ["shoulders", "core"] }
      );
    } else if (daysPerWeek === 5) {
      // Divisão de 5 dias
      workoutStructure.push(
        { name: "Peito", focus: "Chest", muscle_groups: ["chest"] },
        { name: "Costas", focus: "Back", muscle_groups: ["back"] },
        { name: "Pernas", focus: "Legs", muscle_groups: ["legs"] },
        { name: "Ombros", focus: "Shoulders", muscle_groups: ["shoulders"] },
        { name: "Braços e Core", focus: "Arms & Core", muscle_groups: ["arms", "core"] }
      );
    } else {
      // Divisão de 6 dias PPL
      workoutStructure.push(
        { name: "Push A", focus: "Chest & Triceps", muscle_groups: ["chest", "shoulders", "arms"] },
        { name: "Pull A", focus: "Back & Biceps", muscle_groups: ["back", "arms"] },
        { name: "Legs A", focus: "Quadriceps", muscle_groups: ["legs"] },
        { name: "Push B", focus: "Shoulders", muscle_groups: ["shoulders", "chest", "arms"] },
        { name: "Pull B", focus: "Back Width", muscle_groups: ["back", "arms"] },
        { name: "Legs B", focus: "Hamstrings", muscle_groups: ["legs", "core"] }
      );
    }
    
    // Limitar ao número de dias por semana especificado
    workoutStructure.splice(daysPerWeek);
    
    // Conjunto para rastrear exercícios já usados
    const usedExerciseIds = new Set();
    
    // Criar sessões de treino
    for (let dayIndex = 0; dayIndex < workoutStructure.length; dayIndex++) {
      const dayStructure = workoutStructure[dayIndex];
      const sessionId = crypto.randomUUID();
      const dayNumber = dayIndex + 1;
      
      console.log(`Criando sessão ${dayNumber}: ${dayStructure.name}`);
      
      // Criar a sessão no banco de dados
      const createSessionResponse = await fetch(`${SUPABASE_URL}/rest/v1/workout_sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: sessionId,
          plan_id: planId,
          day_number: dayNumber,
          day_name: dayStructure.name,
          focus: dayStructure.focus,
          warmup_description: `5-10 minutos de aquecimento cardiovascular leve, seguido por exercícios de mobilidade focados nos grupos musculares que serão trabalhados: ${dayStructure.muscle_groups.join(", ")}.`,
          cooldown_description: "5 minutos de alongamento estático para os músculos trabalhados, seguido por respiração profunda para reduzir a frequência cardíaca."
        })
      });

      if (!createSessionResponse.ok) {
        console.error('Erro ao criar sessão:', await createSessionResponse.text());
        continue;
      }
      
      // Selecionar exercícios para esta sessão
      const sessionExercises = [];
      const targetExerciseCount = Math.min(7, Math.max(5, Math.floor(12 / daysPerWeek)));
      
      // Selecionar exercícios de cada grupo muscular nesta sessão
      for (const muscleGroup of dayStructure.muscle_groups) {
        const availableExercises = exercisesByMuscle[muscleGroup].filter(ex => !usedExerciseIds.has(ex.id));
        
        // Pegar alguns exercícios deste grupo muscular
        const exercisesPerGroup = Math.max(1, Math.floor(targetExerciseCount / dayStructure.muscle_groups.length));
        
        for (let i = 0; i < exercisesPerGroup && availableExercises.length > 0; i++) {
          const exercise = availableExercises.shift();
          if (exercise) {
            sessionExercises.push(exercise);
            usedExerciseIds.add(exercise.id);
          }
        }
      }
      
      // Se ainda não tivermos exercícios suficientes, adicione de outros grupos musculares
      if (sessionExercises.length < targetExerciseCount) {
        const remainingNeeded = targetExerciseCount - sessionExercises.length;
        
        // Pegar exercícios de qualquer grupo que ainda não foram usados
        const remainingExercises = usableExercises.filter(ex => !usedExerciseIds.has(ex.id));
        remainingExercises.sort(() => Math.random() - 0.5); // Embaralhar
        
        for (let i = 0; i < remainingNeeded && i < remainingExercises.length; i++) {
          sessionExercises.push(remainingExercises[i]);
          usedExerciseIds.add(remainingExercises[i].id);
        }
      }
      
      console.log(`Adicionando ${sessionExercises.length} exercícios à sessão ${dayNumber}`);
      
      // Adicionar os exercícios desta sessão ao banco de dados
      for (const [index, exercise] of sessionExercises.entries()) {
        // Definir sets, reps e rest time com base no tipo de exercício
        let sets, reps, restTimeSeconds;
        
        if (exercise.exercise_type === 'strength') {
          sets = exercise.min_sets || 3;
          reps = exercise.min_reps || 10;
          restTimeSeconds = exercise.rest_time_seconds || 60;
        } else if (exercise.exercise_type === 'cardio') {
          sets = 1;
          reps = 1; // Para cardio, reps representa minutos/duração
          restTimeSeconds = 30;
        } else {
          // mobility, etc.
          sets = 2;
          reps = 15;
          restTimeSeconds = 30;
        }
        
        const exerciseResponse = await fetch(`${SUPABASE_URL}/rest/v1/session_exercises`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            session_id: sessionId,
            exercise_id: exercise.id,
            sets: sets,
            reps: reps,
            rest_time_seconds: restTimeSeconds,
            order_in_session: index + 1
          })
        });
        
        if (!exerciseResponse.ok) {
          console.error('Erro ao adicionar exercício:', await exerciseResponse.text());
        }
      }
    }
    
    // Buscar o plano completo com todas as suas associações
    console.log('Buscando plano completo...');
    const planQueryUrl = `${SUPABASE_URL}/rest/v1/workout_plans?id=eq.${planId}&select=id,user_id,goal,start_date,end_date,created_at,workout_sessions(id,day_number,day_name,focus,warmup_description,cooldown_description,session_exercises(id,sets,reps,rest_time_seconds,exercise:exercises(id,name,description,gif_url,muscle_group,exercise_type)))`;
    
    const planResponse = await fetch(planQueryUrl, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (!planResponse.ok) {
      const errorText = await planResponse.text();
      console.error('Erro ao buscar plano completo:', errorText);
      throw new Error(`Falha ao recuperar o plano gerado: ${errorText}`);
    }
    
    const finalPlan = await planResponse.json();
    
    if (!finalPlan || finalPlan.length === 0) {
      console.error('Plano não encontrado na consulta final');
      throw new Error('Plano gerado não encontrado no banco');
    }
    
    console.log('Plano completo gerado com sucesso:', finalPlan[0].id);
    console.log('Sessões no plano:', finalPlan[0].workout_sessions?.length || 0);

    // Verifique e registre as URLs de GIF para diagnosticar
    if (finalPlan[0].workout_sessions) {
      for (const session of finalPlan[0].workout_sessions) {
        if (session.session_exercises) {
          for (const exercise of session.session_exercises) {
            console.log(`Exercício ${exercise.exercise?.name || 'desconhecido'} - GIF URL: ${exercise.exercise?.gif_url || 'nenhuma'}`);
          }
        }
      }
    }
    
    return new Response(
      JSON.stringify(finalPlan[0]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro durante o processo:', error);
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
