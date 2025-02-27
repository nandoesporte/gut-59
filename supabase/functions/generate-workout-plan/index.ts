
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
    console.log('Preferências recebidas:', preferences);

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
    
    // Buscar exercícios disponíveis
    console.log('Buscando exercícios disponíveis...');
    const exercisesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/exercises?select=id,name,gif_url,description,category,equipment&limit=100`, 
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

    // Dividir exercícios por categorias
    console.log('Organizando exercícios por categoria...');
    const upperBodyExercises = exercises.filter(e => 
      ['chest', 'back', 'shoulders', 'arms', 'upper body'].includes(e.category?.toLowerCase() || '')
    );
    
    const lowerBodyExercises = exercises.filter(e => 
      ['legs', 'calves', 'lower body'].includes(e.category?.toLowerCase() || '')
    );
    
    const coreExercises = exercises.filter(e => 
      ['core', 'abs', 'abdominals'].includes(e.category?.toLowerCase() || '')
    );

    // Garantir que temos pelo menos alguns exercícios em cada categoria
    // Se faltar, usar todos os exercícios disponíveis
    if (upperBodyExercises.length < 3) upperBodyExercises.push(...exercises.slice(0, 5));
    if (lowerBodyExercises.length < 3) lowerBodyExercises.push(...exercises.slice(0, 5));
    if (coreExercises.length < 3) coreExercises.push(...exercises.slice(0, 5));

    const sessionTypes = [
      { 
        name: 'Treino de Membros Superiores', 
        focus: 'Membros Superiores',
        exercises: upperBodyExercises,
        warmup: 'Aquecimento de 5-10 minutos com cardio leve (esteira ou bicicleta) seguido de rotações de ombro e movimentos de mobilidade para os braços.',
        cooldown: 'Alongamentos para peito, costas e braços. Mantenha cada posição por 20-30 segundos.'
      },
      { 
        name: 'Treino de Membros Inferiores', 
        focus: 'Membros Inferiores',
        exercises: lowerBodyExercises,
        warmup: 'Aquecimento de 5-10 minutos com cardio leve, seguido de alongamentos dinâmicos para pernas e mobilidade de quadril.',
        cooldown: 'Alongamentos para quadríceps, isquiotibiais e panturrilhas. Mantenha cada posição por 20-30 segundos.'
      },
      { 
        name: 'Treino de Core e Abdômen', 
        focus: 'Core e Abdômen',
        exercises: coreExercises,
        warmup: 'Aquecimento com 5 minutos de cardio leve seguido de mobilidade de tronco e quadril.',
        cooldown: 'Alongamentos para lombar e abdômen. Mantenha cada posição por 20-30 segundos.'
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
          workout_plan_id: planId,
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
            rest_time_seconds: rest
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
    const planQueryUrl = `${SUPABASE_URL}/rest/v1/workout_plans?id=eq.${planId}&select=id,user_id,goal,start_date,end_date,workout_sessions(id,day_number,warmup_description,cooldown_description,session_exercises(id,sets,reps,rest_time_seconds,exercise:exercises(id,name,description,gif_url)))`;
    
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
