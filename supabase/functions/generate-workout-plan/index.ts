
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

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

    // Criar um plano básico inicial
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30); // Plano de 30 dias
    
    const planId = crypto.randomUUID();

    console.log('Criando plano com ID:', planId);

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
    
    // Buscar exercícios disponíveis - Modificado para não usar a coluna category que não existe
    console.log('Buscando exercícios disponíveis...');
    const exercisesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/exercises?select=id,name,gif_url,description,muscle_group,exercise_type&limit=100`, 
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

    // Examinar a estrutura dos exercícios para debug
    console.log('Estrutura de exemplo do primeiro exercício:', 
      exercises.length > 0 ? JSON.stringify(exercises[0], null, 2) : 'Nenhum exercício encontrado');

    // Distribuir exercícios em 3 grupos para 3 dias de treino
    // Em vez de categorizar por tipos específicos, vamos apenas dividir em 3 grupos
    const exercisesPerGroup = Math.ceil(exercises.length / 3);
    const exerciseGroups = [
      exercises.slice(0, exercisesPerGroup),
      exercises.slice(exercisesPerGroup, exercisesPerGroup * 2),
      exercises.slice(exercisesPerGroup * 2)
    ];

    // Garantir que todos os grupos tenham pelo menos alguns exercícios
    for (let i = 0; i < exerciseGroups.length; i++) {
      if (exerciseGroups[i].length < 3) {
        exerciseGroups[i] = exercises.slice(0, Math.min(6, exercises.length));
      }
    }

    const sessionTypes = [
      { 
        name: 'Treino A', 
        focus: 'Grupo 1',
        exercises: exerciseGroups[0],
        warmup: 'Aquecimento de 5-10 minutos com cardio leve seguido de mobilização articular.',
        cooldown: 'Alongamentos para os músculos trabalhados. Mantenha cada posição por 20-30 segundos.'
      },
      { 
        name: 'Treino B', 
        focus: 'Grupo 2',
        exercises: exerciseGroups[1],
        warmup: 'Aquecimento de 5-10 minutos com cardio leve, seguido de mobilização articular.',
        cooldown: 'Alongamentos para os músculos trabalhados. Mantenha cada posição por 20-30 segundos.'
      },
      { 
        name: 'Treino C', 
        focus: 'Grupo 3',
        exercises: exerciseGroups[2],
        warmup: 'Aquecimento com 5 minutos de cardio leve seguido de mobilização articular.',
        cooldown: 'Alongamentos para os músculos trabalhados. Mantenha cada posição por 20-30 segundos.'
      }
    ];
    
    // Criar sessões de treino
    console.log('Criando sessões de treino...');
    const daysPerWeek = preferences.days_per_week || 3;
    
    for (let day = 1; day <= daysPerWeek; day++) {
      const sessionType = sessionTypes[(day - 1) % sessionTypes.length];
      const sessionId = crypto.randomUUID();
      
      console.log(`Criando sessão ${day} (${sessionType.name})...`);
      
      // Criar sessão
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
          day_number: day,
          warmup_description: sessionType.warmup,
          cooldown_description: sessionType.cooldown
        })
      });

      if (!createSessionResponse.ok) {
        const errorText = await createSessionResponse.text();
        console.error(`Erro ao criar sessão ${day}:`, errorText);
        continue;
      }
      
      const createdSession = await createSessionResponse.json();
      console.log(`Sessão ${day} criada com ID:`, createdSession[0]?.id);
      
      // Determinar séries e repetições baseado no objetivo
      let sets = 3;
      let reps = 12;
      let rest = 60;
      
      if (preferences.goal === 'lose_weight') {
        sets = 3;
        reps = 15;
        rest = 45;
      } else if (preferences.goal === 'gain_mass') {
        sets = 4;
        reps = 8;
        rest = 90;
      }
      
      // Adicionar exercícios à sessão
      const sessionExercises = sessionType.exercises.slice(0, Math.min(6, sessionType.exercises.length));
      console.log(`Adicionando ${sessionExercises.length} exercícios à sessão ${day}`);
      
      for (let i = 0; i < sessionExercises.length; i++) {
        const exercise = sessionExercises[i];
        
        console.log(`Adicionando exercício: ${exercise.name} (ID: ${exercise.id})`);
        
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
            rest_time_seconds: rest,
            order_in_session: i
          })
        });
        
        if (!exerciseResponse.ok) {
          const errorText = await exerciseResponse.text();
          console.error(`Erro ao adicionar exercício ${exercise.name}:`, errorText);
        } else {
          const createdExercise = await exerciseResponse.json();
          console.log(`Exercício ${exercise.name} adicionado com ID:`, createdExercise[0]?.id);
        }
      }
    }
    
    // Buscar o plano completo com todas as suas associações
    console.log('Buscando plano completo...');
    const planQueryUrl = `${SUPABASE_URL}/rest/v1/workout_plans?id=eq.${planId}&select=id,user_id,goal,start_date,end_date,workout_sessions(id,day_number,warmup_description,cooldown_description,session_exercises(id,sets,reps,rest_time_seconds,order_in_session,exercise:exercises(id,name,description,gif_url)))`;
    
    console.log('URL da consulta:', planQueryUrl);
    
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
