
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const XAI_API_KEY = Deno.env.get('XAI_API_KEY');

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
    
    console.log('Gerando plano de treino com Grok-3 Mini para usuário:', userId);
    console.log('Preferências recebidas:', JSON.stringify(preferences));

    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    if (!XAI_API_KEY) {
      throw new Error('Chave da API xAI não configurada');
    }

    // Buscar exercícios disponíveis
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
      throw new Error('Falha ao buscar exercícios');
    }

    const exercises = await exercisesResponse.json();
    console.log(`Encontrados ${exercises.length} exercícios`);
    
    if (exercises.length === 0) {
      throw new Error('Nenhum exercício disponível no banco de dados');
    }

    // Preparar prompt para xAI Grok-3 Mini
    const systemPrompt = `Você é um personal trainer especializado em criar planos de treino personalizados. 
    Crie um plano de treino detalhado baseado nas preferências do usuário e nos exercícios disponíveis.
    IMPORTANTE: Responda SEMPRE em português do Brasil e retorne APENAS um JSON válido sem formatação markdown.`;

    const userPrompt = `
    Crie um plano de treino baseado nestas informações:
    
    Preferências do usuário:
    - Objetivo: ${preferences.goal || 'manter forma'}
    - Nível de atividade: ${preferences.activity_level || 'moderado'}
    - Dias por semana: ${preferences.days_per_week || 3}
    - Tipos de exercício preferidos: ${preferences.preferred_exercise_types?.join(', ') || 'todos'}
    
    Exercícios disponíveis (primeiros 30):
    ${exercises.slice(0, 30).map((ex, index) => `${index + 1}. ID: ${ex.id} - ${ex.name} (${ex.muscle_group}, ${ex.exercise_type})`).join('\n')}
    
    Retorne um JSON com esta estrutura exata (use exercícios REAIS da lista acima):
    {
      "workout_sessions": [
        {
          "day_number": 1,
          "warmup_description": "Descrição do aquecimento",
          "cooldown_description": "Descrição da volta à calma",
          "session_exercises": [
            {
              "exercise_id": "ID_REAL_DO_EXERCICIO_DA_LISTA_ACIMA",
              "sets": 3,
              "reps": 12,
              "rest_time_seconds": 60,
              "order_in_session": 1
            }
          ]
        }
      ]
    }
    
    IMPORTANTE: 
    - Use apenas IDs de exercícios que existem na lista fornecida!
    - Inclua order_in_session para cada exercício (1, 2, 3, etc.)
    - Crie ${preferences.days_per_week || 3} dias de treino
    - Varie os exercícios entre os dias
    `;

    // Chamar API da xAI Grok-3 Mini
    const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        stream: false
      }),
    });

    if (!xaiResponse.ok) {
      throw new Error(`Erro da API xAI: ${xaiResponse.status}`);
    }

    const xaiData = await xaiResponse.json();
    const content = xaiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Nenhum conteúdo retornado pela API xAI');
    }

    // Parse do JSON retornado
    let aiPlan;
    try {
      const cleanContent = content.replace(/```json|```/g, '').trim();
      aiPlan = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      throw new Error('Erro ao processar resposta da IA');
    }

    // Criar o plano completo
    const workoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal || 'maintain',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      workout_sessions: []
    };

    // Processar sessões e exercícios
    if (aiPlan.workout_sessions) {
      workoutPlan.workout_sessions = aiPlan.workout_sessions.map((session, sessionIndex) => {
        const processedSession = {
          id: crypto.randomUUID(),
          day_number: session.day_number || (sessionIndex + 1),
          warmup_description: session.warmup_description || "Aquecimento de 5-10 minutos",
          cooldown_description: session.cooldown_description || "Alongamento e relaxamento",
          session_exercises: []
        };

        if (session.session_exercises) {
          processedSession.session_exercises = session.session_exercises.map((exercise, exerciseIndex) => {
            // Buscar exercício na lista
            const foundExercise = exercises.find(ex => ex.id === exercise.exercise_id);
            
            if (foundExercise) {
              return {
                id: crypto.randomUUID(),
                sets: exercise.sets || 3,
                reps: exercise.reps || 12,
                rest_time_seconds: exercise.rest_time_seconds || 60,
                order_in_session: exercise.order_in_session || (exerciseIndex + 1),
                exercise: {
                  id: foundExercise.id,
                  name: foundExercise.name,
                  description: foundExercise.description,
                  muscle_group: foundExercise.muscle_group,
                  exercise_type: foundExercise.exercise_type,
                  gif_url: foundExercise.gif_url
                }
              };
            } else {
              // Usar exercício padrão se não encontrar
              const defaultExercise = exercises[exerciseIndex % exercises.length];
              return {
                id: crypto.randomUUID(),
                sets: 3,
                reps: 12,
                rest_time_seconds: 60,
                order_in_session: exerciseIndex + 1,
                exercise: {
                  id: defaultExercise.id,
                  name: defaultExercise.name,
                  description: defaultExercise.description,
                  muscle_group: defaultExercise.muscle_group,
                  exercise_type: defaultExercise.exercise_type,
                  gif_url: defaultExercise.gif_url
                }
              };
            }
          });
        }

        return processedSession;
      });
    }

    console.log('Plano de treino gerado com sucesso via Grok-3 Mini');
    console.log('Exercícios incluídos:', workoutPlan.workout_sessions.map(s => s.session_exercises.length));
    
    return new Response(
      JSON.stringify(workoutPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro durante o processo:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar plano de treino',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
