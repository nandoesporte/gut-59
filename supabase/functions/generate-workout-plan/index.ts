
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
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
    console.log('Preferências:', JSON.stringify(preferences, null, 2));

    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    // Criar um plano básico inicial para garantir que algo será retornado
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30); // Plano de 30 dias
    
    const planId = crypto.randomUUID();

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
      const errorBody = await createPlanResponse.text();
      console.error('Erro ao criar plano:', errorBody);
      throw new Error('Falha ao criar o plano de treino no banco de dados');
    }

    console.log('Plano criado com sucesso:', planId);
    
    // Buscar exercícios disponíveis
    let exercisesResponse;
    try {
      exercisesResponse = await fetch(`${SUPABASE_URL}/rest/v1/exercises?select=id,name,gif_url,description,category,equipment&limit=100`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      });
      
      if (!exercisesResponse.ok) {
        throw new Error(`Erro ao buscar exercícios: ${exercisesResponse.status}`);
      }
    } catch (error) {
      console.error('Falha na requisição de exercícios:', error);
      throw new Error('Não foi possível buscar exercícios do banco de dados');
    }

    const exercises = await exercisesResponse.json();
    console.log(`Encontrados ${exercises.length} exercícios`);
    
    if (exercises.length === 0) {
      throw new Error('Nenhum exercício disponível no banco de dados');
    }

    // Criar sessões manualmente em vez de usar IA para garantir funcionamento
    const daysPerWeek = 3; // Padrão ou use preferences.days_per_week se disponível
    const sessionTypes = [
      { focus: 'Membros Superiores', exercises: exercises.filter(e => ['chest', 'back', 'shoulders', 'arms'].includes(e.category)) },
      { focus: 'Membros Inferiores', exercises: exercises.filter(e => ['legs', 'calves'].includes(e.category)) },
      { focus: 'Core e Abdômen', exercises: exercises.filter(e => ['core', 'abs'].includes(e.category)) }
    ];
    
    // Se não houver exercícios suficientes em alguma categoria, use todos
    sessionTypes.forEach(session => {
      if (session.exercises.length < 5) {
        session.exercises = exercises;
      }
    });

    // Criar sessões
    for (let day = 1; day <= daysPerWeek; day++) {
      const sessionType = sessionTypes[(day - 1) % sessionTypes.length];
      const sessionId = crypto.randomUUID();
      
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
          name: `Treino ${day}: ${sessionType.focus}`,
          warmup_description: 'Aquecimento geral de 5-10 minutos. Realize exercícios leves de cardio e alongamento dinâmico.',
          cooldown_description: 'Alongamentos estáticos por 5-10 minutos, com foco nos grupos musculares trabalhados.'
        })
      });

      if (!createSessionResponse.ok) {
        console.error('Erro ao criar sessão:', await createSessionResponse.text());
        continue;
      }
      
      console.log(`Sessão ${day} criada com ID: ${sessionId}`);
      
      // Selecionar 5-8 exercícios para esta sessão
      const sessionExercises = sessionType.exercises.slice(0, Math.min(8, sessionType.exercises.length));
      for (let i = 0; i < sessionExercises.length; i++) {
        const exercise = sessionExercises[i];
        
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
        
        // Criar exercício para a sessão
        const exerciseResponse = await fetch(`${SUPABASE_URL}/rest/v1/session_exercises`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            session_id: sessionId,
            exercise_id: exercise.id,
            sets: sets,
            reps: reps,
            rest_time_seconds: rest,
            order: i + 1
          })
        });
        
        if (!exerciseResponse.ok) {
          console.error(`Erro ao adicionar exercício ${exercise.name}:`, await exerciseResponse.text());
        } else {
          console.log(`Exercício ${exercise.name} adicionado à sessão ${day}`);
        }
      }
    }
    
    // Buscar o plano completo para retornar
    const planResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/workout_plans?id=eq.${planId}&select=*,workout_sessions(id,day_number,name,warmup_description,cooldown_description,session_exercises(id,sets,reps,rest_time_seconds,order,exercise_id,exercise:exercises(id,name,description,gif_url)))`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    
    if (!planResponse.ok) {
      const errorText = await planResponse.text();
      console.error('Erro ao buscar plano completo:', errorText);
      throw new Error('Falha ao recuperar o plano gerado');
    }
    
    const finalPlan = await planResponse.json();
    console.log('Plano completo gerado com sucesso:', finalPlan[0]?.id);
    
    return new Response(
      JSON.stringify(finalPlan[0]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro durante o processo:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao gerar plano de treino' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
