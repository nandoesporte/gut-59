
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
    const { preferences, userId, requestId, agentName } = await req.json();
    
    console.log(`🤖 ${agentName || 'AI Agent'}: Iniciando geração do plano de treino`);
    console.log(`👤 Usuário: ${userId}`);
    console.log(`🔑 Request ID: ${requestId}`);
    console.log(`📋 Preferências:`, JSON.stringify(preferences, null, 2));

    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    if (!XAI_API_KEY) {
      console.error('❌ Chave XAI_API_KEY não encontrada');
      throw new Error('Chave da API xAI não configurada. Configure XAI_API_KEY nas configurações do projeto.');
    }

    console.log('✅ Chave XAI_API_KEY encontrada');

    // Buscar exercícios disponíveis
    console.log('📚 Buscando exercícios na base de dados...');
    const exercisesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/exercises?select=id,name,gif_url,description,muscle_group,equipment_needed,exercise_type,min_sets,max_sets,min_reps,max_reps,rest_time_seconds&limit=50`, 
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );
    
    if (!exercisesResponse.ok) {
      throw new Error(`Falha ao buscar exercícios: ${exercisesResponse.status}`);
    }

    const exercises = await exercisesResponse.json();
    console.log(`📊 ${exercises.length} exercícios encontrados`);
    
    if (exercises.length === 0) {
      throw new Error('Nenhum exercício disponível no banco de dados');
    }

    // Preparar prompt para xAI Grok-3 Mini
    console.log('🧠 Preparando prompt para Grok-3 Mini...');
    const systemPrompt = `Você é o Trenner2025, um agente de IA especializado em educação física e criação de planos de treino personalizados. 
    Crie um plano de treino detalhado baseado nas preferências do usuário e nos exercícios disponíveis.
    IMPORTANTE: Responda SEMPRE em português do Brasil e retorne APENAS um JSON válido sem formatação markdown.
    Você deve criar planos científicos, seguros e eficazes.`;

    const userPrompt = `
    Eu sou o Trenner2025 e vou criar um plano de treino personalizado baseado nestas informações:
    
    Preferências do usuário:
    - Objetivo: ${preferences.goal || 'manter forma'}
    - Nível de atividade: ${preferences.activity_level || 'moderado'}
    - Dias por semana: ${preferences.days_per_week || 3}
    - Tipos de exercício preferidos: ${preferences.preferred_exercise_types?.join(', ') || 'todos'}
    - Idade: ${preferences.age || 'não informada'}
    - Peso: ${preferences.weight || 'não informado'}kg
    - Altura: ${preferences.height || 'não informada'}cm
    - Gênero: ${preferences.gender || 'não informado'}
    
    Exercícios disponíveis (use APENAS estes IDs):
    ${exercises.slice(0, 30).map((ex, index) => `${index + 1}. ID: ${ex.id} - ${ex.name} (${ex.muscle_group}, ${ex.exercise_type}, Séries: ${ex.min_sets}-${ex.max_sets}, Reps: ${ex.min_reps}-${ex.max_reps})`).join('\n')}
    
    Retorne um JSON com esta estrutura exata (use exercícios REAIS da lista acima):
    {
      "workout_sessions": [
        {
          "day_number": 1,
          "warmup_description": "Aquecimento dinâmico de 5-10 minutos com movimentos específicos",
          "cooldown_description": "Alongamento e relaxamento de 5-10 minutos",
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
    
    REGRAS IMPORTANTES:
    - Use apenas IDs de exercícios que existem na lista fornecida!
    - Inclua order_in_session para cada exercício (1, 2, 3, etc.)
    - Crie ${preferences.days_per_week || 3} dias de treino
    - Varie os exercícios entre os dias
    - Respeite os limites de séries e repetições de cada exercício
    - Crie aquecimentos e resfriamentos específicos para cada dia
    `;

    // Chamar API da xAI Grok-3 Mini
    console.log('🚀 Chamando API xAI Grok-3 Mini...');
    const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        stream: false
      }),
    });

    if (!xaiResponse.ok) {
      const errorText = await xaiResponse.text();
      console.error(`❌ Erro da API xAI (${xaiResponse.status}):`, errorText);
      throw new Error(`Erro da API xAI: ${xaiResponse.status} - ${errorText}`);
    }

    const xaiData = await xaiResponse.json();
    console.log('✅ Resposta recebida da API xAI');
    
    const content = xaiData.choices[0]?.message?.content;

    if (!content) {
      console.error('❌ Nenhum conteúdo retornado pela API xAI');
      throw new Error('Nenhum conteúdo retornado pela API xAI');
    }

    console.log('📝 Conteúdo bruto da IA:', content.substring(0, 200) + '...');

    // Parse do JSON retornado
    let aiPlan;
    try {
      const cleanContent = content.replace(/```json|```/g, '').trim();
      aiPlan = JSON.parse(cleanContent);
      console.log('✅ JSON parsed com sucesso');
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.error('Conteúdo que falhou:', content);
      throw new Error(`Erro ao processar resposta da IA: ${parseError.message}`);
    }

    // Criar o plano completo
    console.log('🏗️ Construindo plano de treino final...');
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
    if (aiPlan.workout_sessions && Array.isArray(aiPlan.workout_sessions)) {
      console.log(`📅 Processando ${aiPlan.workout_sessions.length} sessões de treino...`);
      
      workoutPlan.workout_sessions = aiPlan.workout_sessions.map((session, sessionIndex) => {
        const processedSession = {
          id: crypto.randomUUID(),
          day_number: session.day_number || (sessionIndex + 1),
          warmup_description: session.warmup_description || "Aquecimento dinâmico de 5-10 minutos",
          cooldown_description: session.cooldown_description || "Alongamento e relaxamento de 5-10 minutos",
          session_exercises: []
        };

        if (session.session_exercises && Array.isArray(session.session_exercises)) {
          console.log(`💪 Processando ${session.session_exercises.length} exercícios para o dia ${sessionIndex + 1}...`);
          
          processedSession.session_exercises = session.session_exercises.map((exercise, exerciseIndex) => {
            // Buscar exercício na lista
            const foundExercise = exercises.find(ex => ex.id === exercise.exercise_id);
            
            if (foundExercise) {
              console.log(`✅ Exercício encontrado: ${foundExercise.name}`);
              return {
                id: crypto.randomUUID(),
                sets: Math.min(Math.max(exercise.sets || 3, foundExercise.min_sets || 1), foundExercise.max_sets || 5),
                reps: Math.min(Math.max(exercise.reps || 12, foundExercise.min_reps || 1), foundExercise.max_reps || 20),
                rest_time_seconds: exercise.rest_time_seconds || foundExercise.rest_time_seconds || 60,
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
              console.warn(`⚠️ Exercício não encontrado: ${exercise.exercise_id}, usando substituto`);
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

    console.log('🎉 Plano de treino gerado com sucesso pelo Trenner2025!');
    console.log(`📊 Estatísticas do plano:`);
    console.log(`- Sessões: ${workoutPlan.workout_sessions.length}`);
    workoutPlan.workout_sessions.forEach((session, index) => {
      console.log(`- Dia ${index + 1}: ${session.session_exercises.length} exercícios`);
    });
    
    return new Response(
      JSON.stringify(workoutPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro durante o processo:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar plano de treino',
        details: error instanceof Error ? error.stack : 'Stack trace não disponível'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
