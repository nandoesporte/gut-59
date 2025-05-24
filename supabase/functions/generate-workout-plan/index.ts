
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
    
    Exercícios disponíveis (primeiros 20):
    ${exercises.slice(0, 20).map(ex => `- ${ex.name} (${ex.muscle_group}, ${ex.exercise_type})`).join('\n')}
    
    Retorne um JSON com esta estrutura exata:
    {
      "id": "uuid-do-plano",
      "user_id": "${userId}",
      "goal": "${preferences.goal || 'maintain'}",
      "start_date": "${new Date().toISOString().split('T')[0]}",
      "end_date": "${new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]}",
      "created_at": "${new Date().toISOString()}",
      "workout_sessions": [
        {
          "id": "uuid-da-sessao",
          "day_number": 1,
          "warmup_description": "Descrição do aquecimento",
          "cooldown_description": "Descrição da volta à calma",
          "session_exercises": [
            {
              "id": "uuid-do-exercicio-sessao",
              "sets": 3,
              "reps": 12,
              "rest_time_seconds": 60,
              "exercise": {
                "id": "id-do-exercicio",
                "name": "Nome do exercício",
                "description": "Descrição",
                "muscle_group": "chest",
                "exercise_type": "strength",
                "gif_url": "url-do-gif"
              }
            }
          ]
        }
      ]
    }
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
    let workoutPlan;
    try {
      const cleanContent = content.replace(/```json|```/g, '').trim();
      workoutPlan = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      throw new Error('Erro ao processar resposta da IA');
    }

    // Gerar IDs únicos se necessário
    if (!workoutPlan.id) {
      workoutPlan.id = crypto.randomUUID();
    }

    // Garantir que as sessões tenham IDs únicos
    if (workoutPlan.workout_sessions) {
      workoutPlan.workout_sessions.forEach((session, index) => {
        if (!session.id) {
          session.id = crypto.randomUUID();
        }
        if (session.session_exercises) {
          session.session_exercises.forEach(exercise => {
            if (!exercise.id) {
              exercise.id = crypto.randomUUID();
            }
            // Garantir que o exercício tenha um ID válido do banco
            const foundExercise = exercises.find(ex => ex.name === exercise.exercise.name);
            if (foundExercise) {
              exercise.exercise.id = foundExercise.id;
            }
          });
        }
      });
    }

    // Salvar no banco de dados
    const { error: planError } = await fetch(`${SUPABASE_URL}/rest/v1/workout_plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        id: workoutPlan.id,
        user_id: userId,
        goal: workoutPlan.goal,
        start_date: workoutPlan.start_date,
        end_date: workoutPlan.end_date,
      })
    });

    if (planError) {
      console.error('Erro ao salvar plano:', planError);
    }

    // Salvar sessões
    if (workoutPlan.workout_sessions) {
      for (const session of workoutPlan.workout_sessions) {
        await fetch(`${SUPABASE_URL}/rest/v1/workout_sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            id: session.id,
            plan_id: workoutPlan.id,
            day_number: session.day_number,
            warmup_description: session.warmup_description,
            cooldown_description: session.cooldown_description,
          })
        });

        // Salvar exercícios da sessão
        if (session.session_exercises) {
          for (const [index, exercise] of session.session_exercises.entries()) {
            await fetch(`${SUPABASE_URL}/rest/v1/session_exercises`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                session_id: session.id,
                exercise_id: exercise.exercise.id,
                sets: exercise.sets,
                reps: exercise.reps,
                rest_time_seconds: exercise.rest_time_seconds,
                order_in_session: index + 1,
              })
            });
          }
        }
      }
    }

    console.log('Plano de treino gerado com sucesso via Grok-3 Mini');
    
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
