
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors';

interface RehabPlanRequest {
  preferences: {
    age: number;
    weight: number;
    height: number;
    gender: string;
    joint_area: string;
    condition: string;
    pain_level: number;
    mobility_level: string;
    previous_treatment: boolean;
    activity_level: string;
  };
  userId: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { preferences, userId } = await req.json() as RehabPlanRequest;

    // Função para selecionar exercícios com base nos critérios
    const selectExercises = async (params: {
      joint_area: string;
      condition: string;
      pain_level: number;
      activity_level: string;
      mobility_level: string;
    }) => {
      // Determinar nível de dificuldade baseado nos parâmetros
      const difficulty = 
        params.pain_level > 7 ? 'beginner' :
        params.activity_level === 'active' && params.pain_level < 4 ? 'advanced' :
        'intermediate';

      // Determinar tipos de exercícios baseado no nível de mobilidade
      const exerciseTypes = 
        params.mobility_level === 'limited' ? ['mobility'] :
        params.mobility_level === 'moderate' ? ['mobility', 'strength'] :
        ['mobility', 'strength', 'cardio'];

      // Buscar exercícios adequados
      const { data: exercises, error } = await supabase
        .from('physio_exercises')
        .select('*')
        .eq('joint_area', params.joint_area)
        .eq('condition', params.condition)
        .lte('pain_level_threshold', params.pain_level + 2)
        .in('exercise_type', exerciseTypes)
        .eq('difficulty', difficulty)
        .order('progression_level');

      if (error) throw error;
      return exercises || [];
    };

    // Buscar exercícios apropriados
    const exercises = await selectExercises({
      joint_area: preferences.joint_area,
      condition: preferences.condition,
      pain_level: preferences.pain_level,
      activity_level: preferences.activity_level,
      mobility_level: preferences.mobility_level
    });

    if (exercises.length === 0) {
      throw new Error('Não foram encontrados exercícios adequados para suas condições');
    }

    // Criar plano de reabilitação
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 28); // Plano de 4 semanas

    const { data: plan, error: planError } = await supabase
      .from('rehab_plans')
      .insert({
        user_id: userId,
        joint_area: preferences.joint_area,
        condition: preferences.condition,
        goal: preferences.pain_level > 7 ? 'pain_relief' : 
              preferences.mobility_level === 'limited' ? 'mobility' : 'strength',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
      .select()
      .single();

    if (planError) throw planError;

    // Criar sessões de treino
    const sessions = [];
    for (let day = 1; day <= 28; day++) {
      const dailyExercises = exercises
        .filter(ex => {
          // Filtra exercícios apropriados para cada fase
          const week = Math.ceil(day / 7);
          if (week === 1) return ex.acute_phase_suitable;
          if (week === 2 || week === 3) return ex.rehabilitation_phase_suitable;
          return ex.maintenance_phase_suitable;
        })
        .sort(() => Math.random() - 0.5)
        .slice(0, 4); // 4 exercícios por sessão

      const { data: session, error: sessionError } = await supabase
        .from('rehab_sessions')
        .insert({
          plan_id: plan.id,
          day_number: day,
          warmup_description: "Realize 5-10 minutos de aquecimento leve focando na região afetada",
          cooldown_description: "Faça alongamentos suaves por 5-10 minutos após os exercícios"
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Adicionar exercícios à sessão
      for (let i = 0; i < dailyExercises.length; i++) {
        const exercise = dailyExercises[i];
        const { error: exerciseError } = await supabase
          .from('rehab_session_exercises')
          .insert({
            session_id: session.id,
            exercise_id: exercise.id,
            sets: exercise.recommended_sets || 3,
            reps: exercise.recommended_repetitions || 10,
            rest_time_seconds: exercise.rest_time_seconds || 30,
            order_in_session: i + 1
          });

        if (exerciseError) throw exerciseError;
      }

      sessions.push(session);
    }

    // Retornar plano completo
    return new Response(JSON.stringify({
      id: plan.id,
      goal: plan.goal,
      start_date: plan.start_date,
      end_date: plan.end_date,
      rehab_sessions: sessions.map(session => ({
        ...session,
        exercises: exercises.filter(ex => 
          sessions.some(s => s.id === session.id)
        ).map(ex => ({
          name: ex.name,
          description: ex.description,
          gifUrl: ex.gif_url,
          sets: ex.recommended_sets,
          reps: ex.recommended_repetitions,
          rest_time_seconds: ex.rest_time_seconds,
          notes: `${ex.setup_instructions || ''}\n\nPrecauções: ${ex.precautions?.join(', ') || 'Nenhuma'}`
        }))
      }))
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
