
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors';

interface WorkoutPlanRequest {
  preferences: {
    age: number;
    weight: number;
    height: number;
    gender: string;
    goal: 'lose_weight' | 'maintain' | 'gain_mass';
    activity_level: 'sedentary' | 'light' | 'moderate' | 'intense';
    preferred_exercise_types: string[];
    available_equipment: string[];
    health_conditions?: string[];
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
    const { preferences, userId } = await req.json() as WorkoutPlanRequest;

    console.log('Gerando plano para:', preferences);

    // Função para selecionar exercícios apropriados
    const selectExercises = async (params: {
      exerciseTypes: string[];
      equipment: string[];
      difficulty: string;
      goals: string[];
      muscleGroups: string[];
    }) => {
      console.log('Buscando exercícios com critérios:', params);

      let query = supabase
        .from('exercises')
        .select(`
          id,
          name,
          description,
          gif_url,
          exercise_type,
          muscle_group,
          difficulty,
          equipment_needed,
          min_sets,
          max_sets,
          min_reps,
          max_reps,
          rest_time_seconds,
          preparation_time_minutes,
          is_compound_movement,
          movement_pattern,
          equipment_complexity,
          typical_duration_seconds,
          calories_burned_per_hour,
          recommended_warm_up,
          common_mistakes,
          safety_considerations,
          progression_variations,
          regression_variations,
          tempo_recommendation,
          breathing_pattern,
          stability_requirement,
          balance_requirement,
          coordination_requirement,
          flexibility_requirement,
          power_requirement
        `)
        .in('exercise_type', params.exerciseTypes)
        .eq('difficulty', params.difficulty);

      // Se não tiver acesso a todos os equipamentos, filtrar
      if (!params.equipment.includes('all')) {
        query = query.overlaps('equipment_needed', params.equipment);
      }

      if (params.goals.length > 0) {
        query = query.overlaps('goals', params.goals);
      }

      const { data: exercises, error } = await query
        .in('muscle_group', params.muscleGroups)
        .order('is_compound_movement', { ascending: false });

      if (error) {
        console.error('Erro ao buscar exercícios:', error);
        throw error;
      }

      console.log(`Encontrados ${exercises?.length || 0} exercícios`);
      return exercises || [];
    };

    // Determinar nível de dificuldade baseado no nível de atividade
    const difficulty = 
      preferences.activity_level === 'sedentary' ? 'beginner' :
      preferences.activity_level === 'intense' ? 'advanced' :
      'intermediate';

    // Definir grupos musculares para cada dia
    const muscleGroups = [
      ['chest', 'back', 'shoulders'],
      ['legs', 'core'],
      ['arms', 'shoulders', 'core'],
      ['full_body']
    ];

    // Definir objetivos baseado nas preferências
    const goals = [
      preferences.goal === 'lose_weight' ? ['fat_loss', 'endurance'] :
      preferences.goal === 'gain_mass' ? ['muscle_gain', 'strength'] :
      ['maintenance', 'general_fitness']
    ];

    console.log('Criando plano de treino');

    // Criar plano
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 28); // Plano de 4 semanas

    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        goal: preferences.goal,
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

    // Criar sessões de treino
    const sessions = [];
    for (let day = 1; day <= 28; day++) {
      const weekDay = (day - 1) % 7;
      const dayType = weekDay % 4; // 0-3 para diferentes focos de treino
      
      console.log(`Criando sessão para dia ${day} (tipo ${dayType})`);

      // Selecionar exercícios para o dia
      const exercises = await selectExercises({
        exerciseTypes: preferences.preferred_exercise_types,
        equipment: preferences.available_equipment,
        difficulty,
        goals,
        muscleGroups: muscleGroups[dayType]
      });

      // Garantir variedade e distribuição adequada dos exercícios
      const selectedExercises = exercises
        .sort((a, b) => {
          // Priorizar exercícios compostos no início do treino
          if (a.is_compound_movement && !b.is_compound_movement) return -1;
          if (!a.is_compound_movement && b.is_compound_movement) return 1;
          return Math.random() - 0.5;
        })
        .slice(0, 6); // 6 exercícios por sessão

      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          plan_id: plan.id,
          day_number: day,
          warmup_description: "5-10 minutos de aquecimento cardiovascular leve seguido de mobilidade articular. " +
                            "Faça 2-3 séries de aquecimento com peso leve para os exercícios principais.",
          cooldown_description: "5-10 minutos de alongamentos para os músculos trabalhados. " +
                              "Exercícios de respiração e relaxamento para normalizar a frequência cardíaca."
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Erro ao criar sessão:', sessionError);
        throw sessionError;
      }

      console.log(`Sessão ${session.id} criada para dia ${day}`);

      // Adicionar exercícios à sessão
      for (let i = 0; i < selectedExercises.length; i++) {
        const exercise = selectedExercises[i];
        
        // Ajustar séries e repetições com base no objetivo
        let sets = exercise.is_compound_movement ? 
          Math.max(exercise.min_sets, 4) : 
          exercise.min_sets;
        
        let reps = preferences.goal === 'gain_mass' ? 
          Math.min(exercise.max_reps, 12) : 
          Math.min(exercise.max_reps, 15);

        const { error: exerciseError } = await supabase
          .from('session_exercises')
          .insert({
            session_id: session.id,
            exercise_id: exercise.id,
            sets,
            reps,
            rest_time_seconds: exercise.rest_time_seconds,
            order_in_session: i + 1
          });

        if (exerciseError) {
          console.error('Erro ao adicionar exercício à sessão:', exerciseError);
          throw exerciseError;
        }
      }

      // Adicionar informações detalhadas dos exercícios à sessão
      sessions.push({
        ...session,
        exercises: selectedExercises.map((ex, index) => {
          // Determinar recomendações de peso baseadas no nível
          const weightRecommendation = {
            beginner: ex.is_compound_movement ? "40-50% 1RM" : "30-40% 1RM",
            intermediate: ex.is_compound_movement ? "60-70% 1RM" : "50-60% 1RM",
            advanced: ex.is_compound_movement ? "75-85% 1RM" : "65-75% 1RM"
          };

          return {
            name: ex.name,
            description: ex.description,
            gifUrl: ex.gif_url,
            sets: ex.is_compound_movement ? Math.max(ex.min_sets, 4) : ex.min_sets,
            reps: preferences.goal === 'gain_mass' ? 
              Math.min(ex.max_reps, 12) : 
              Math.min(ex.max_reps, 15),
            rest_time_seconds: ex.rest_time_seconds,
            weight_recommendation: weightRecommendation,
            notes: [
              `Padrão de Movimento: ${ex.movement_pattern}`,
              `Tempo de Execução: ${ex.tempo_recommendation}`,
              `Padrão Respiratório: ${ex.breathing_pattern}`,
              ex.common_mistakes?.length ? `Erros Comuns: ${ex.common_mistakes.join(', ')}` : null,
              ex.safety_considerations?.length ? `Considerações de Segurança: ${ex.safety_considerations.join(', ')}` : null
            ].filter(Boolean).join('\n\n')
          };
        })
      });
    }

    console.log('Plano gerado com sucesso');

    // Retornar plano completo
    return new Response(JSON.stringify({
      id: plan.id,
      user_id: plan.user_id,
      goal: plan.goal,
      start_date: plan.start_date,
      end_date: plan.end_date,
      workout_sessions: sessions,
      user_fitness_level: difficulty
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
