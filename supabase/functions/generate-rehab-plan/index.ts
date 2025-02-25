
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

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

    console.log('Gerando plano para:', preferences);

    const selectExercises = async (params: {
      joint_area: string;
      condition: string;
      pain_level: number;
      activity_level: string;
      mobility_level: string;
    }) => {
      const difficulty = 
        params.pain_level > 7 ? 'beginner' :
        params.activity_level === 'active' && params.pain_level < 4 ? 'advanced' :
        'intermediate';

      const exerciseTypes = 
        params.mobility_level === 'limited' ? ['mobility'] :
        params.mobility_level === 'moderate' ? ['mobility', 'strength'] :
        ['mobility', 'strength', 'cardio'];

      console.log('Buscando exercícios com critérios:', {
        joint_area: params.joint_area,
        condition: params.condition,
        difficulty,
        exerciseTypes
      });

      const { data: exercises, error } = await supabase
        .from('physio_exercises')
        .select(`
          id,
          name,
          description,
          gif_url,
          joint_area,
          condition,
          exercise_type,
          difficulty,
          is_compound_movement,
          progression_level,
          recommended_repetitions,
          recommended_sets,
          hold_time_seconds,
          rest_time_seconds,
          pain_level_threshold,
          primary_goals,
          target_symptoms,
          setup_instructions,
          required_equipment,
          precautions,
          contraindications,
          movement_speed,
          resistance_level,
          acute_phase_suitable,
          rehabilitation_phase_suitable,
          maintenance_phase_suitable
        `)
        .eq('joint_area', params.joint_area)
        .eq('condition', params.condition)
        .lte('pain_level_threshold', params.pain_level + 2)
        .in('exercise_type', exerciseTypes)
        .eq('difficulty', difficulty)
        .order('progression_level');

      if (error) {
        console.error('Erro ao buscar exercícios:', error);
        throw error;
      }

      console.log(`Encontrados ${exercises?.length || 0} exercícios`);
      return exercises || [];
    };

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

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 28);

    console.log('Criando plano de reabilitação');

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

    if (planError) {
      console.error('Erro ao criar plano:', planError);
      throw planError;
    }

    console.log('Plano criado:', plan.id);

    const sessions = [];
    for (let day = 1; day <= 28; day++) {
      const week = Math.ceil(day / 7);
      console.log(`Criando sessão para dia ${day} (semana ${week})`);

      const weeklyExercises = exercises.filter(ex => {
        if (week === 1) return ex.acute_phase_suitable;
        if (week === 2 || week === 3) return ex.rehabilitation_phase_suitable;
        return ex.maintenance_phase_suitable;
      });

      const dailyExercises = weeklyExercises
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);

      const { data: session, error: sessionError } = await supabase
        .from('rehab_sessions')
        .insert({
          plan_id: plan.id,
          day_number: day,
          warmup_description: "Realize 5-10 minutos de aquecimento leve focando na região afetada. " +
                            "Inclua movimentos suaves e alongamentos leves para preparar os músculos e articulações.",
          cooldown_description: "Faça alongamentos suaves por 5-10 minutos após os exercícios. " +
                              "Aplique gelo se necessário para reduzir qualquer inflamação."
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Erro ao criar sessão:', sessionError);
        throw sessionError;
      }

      console.log(`Sessão ${session.id} criada para dia ${day}`);

      for (let i = 0; i < dailyExercises.length; i++) {
        const exercise = dailyExercises[i];
        
        const sets = exercise.recommended_sets || 
          (week === 1 ? 2 : exercise.recommended_sets || 3);
        
        const reps = exercise.recommended_repetitions ||
          (week === 1 ? Math.min(8, exercise.recommended_repetitions || 10) : 
           exercise.recommended_repetitions || 10);

        const { error: exerciseError } = await supabase
          .from('rehab_session_exercises')
          .insert({
            session_id: session.id,
            exercise_id: exercise.id,
            sets,
            reps,
            rest_time_seconds: exercise.rest_time_seconds || 30,
            order_in_session: i + 1
          });

        if (exerciseError) {
          console.error('Erro ao adicionar exercício à sessão:', exerciseError);
          throw exerciseError;
        }
      }

      sessions.push({
        ...session,
        exercises: dailyExercises.map((ex, index) => ({
          name: ex.name,
          description: ex.description,
          gifUrl: ex.gif_url,
          sets: week === 1 ? 2 : ex.recommended_sets || 3,
          reps: week === 1 ? Math.min(8, ex.recommended_repetitions || 10) : ex.recommended_repetitions || 10,
          rest_time_seconds: ex.rest_time_seconds || 30,
          movement_speed: ex.movement_speed,
          resistance_level: ex.resistance_level,
          hold_time_seconds: ex.hold_time_seconds,
          setup_instructions: ex.setup_instructions,
          precautions: ex.precautions,
          required_equipment: ex.required_equipment,
          notes: [
            ex.setup_instructions,
            ex.precautions?.length ? `Precauções: ${ex.precautions.join(', ')}` : null,
            ex.contraindications?.length ? `Contraindicações: ${ex.contraindications.join(', ')}` : null
          ].filter(Boolean).join('\n\n')
        }))
      });
    }

    console.log('Plano gerado com sucesso');

    return new Response(JSON.stringify({
      id: plan.id,
      user_id: plan.user_id,
      goal: plan.goal,
      condition: plan.condition,
      start_date: plan.start_date,
      end_date: plan.end_date,
      rehab_sessions: sessions
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Erro ao gerar plano:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
