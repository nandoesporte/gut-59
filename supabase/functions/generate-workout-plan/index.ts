
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
    
    // Buscar exercícios disponíveis - Garantir que coletamos o gif_url e outros campos importantes
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

    // Filtrar exercícios para recomendar baseado nas preferências do usuário
    const filteredExercises = exercises.filter(exercise => {
      // Se o usuário tem preferências de tipo de exercício, filtre por elas
      if (preferences.preferred_exercise_types && preferences.preferred_exercise_types.length > 0) {
        return preferences.preferred_exercise_types.includes(exercise.exercise_type);
      }
      return true;
    });

    // Garantir que temos exercícios suficientes
    const usableExercises = filteredExercises.length > 20 ? filteredExercises : exercises;
    
    // Mapeie apenas as informações relevantes para o prompt
    const exercisesForPrompt = usableExercises.slice(0, 30).map(e => ({
      id: e.id,
      name: e.name,
      muscle_group: e.muscle_group,
      exercise_type: e.exercise_type
    }));

    // Preparar o prompt para o modelo Llama
    const userPrompt = `
Crie um plano de treino personalizado com as seguintes características:
- Objetivo do usuário: ${preferences.goal || 'manutenção'}
- Nível de atividade: ${preferences.activity_level || 'moderado'}
- Condições de saúde: ${preferences.health_conditions?.join(', ') || 'nenhuma'}
- Equipamentos disponíveis: ${preferences.available_equipment?.join(', ') || 'básicos'}
- Tipos de exercícios preferidos: ${preferences.preferred_exercise_types?.join(', ') || 'variados'}
- Dias por semana: ${preferences.days_per_week || 3}

O plano deve conter ${preferences.days_per_week || 3} sessões de treino, cada uma com 5-6 exercícios.
Inclua apenas exercícios dos IDs a seguir (retorne EXATAMENTE esses IDs): ${JSON.stringify(exercisesForPrompt)}

Formate a resposta como um JSON válido com esta estrutura:
{
  "sessions": [
    {
      "day_number": 1,
      "warmup_description": "texto",
      "cooldown_description": "texto",
      "exercises": [
        {
          "exercise_id": "id-do-exercício",
          "sets": 3,
          "reps": 12,
          "rest_time_seconds": 60
        },
        ...mais exercícios
      ]
    },
    ...mais sessões
  ]
}
`;

    // Usar a função Llama para gerar o plano
    console.log('Chamando modelo Llama para gerar plano de treino...');
    const llamaResponse = await fetch(`${SUPABASE_URL}/functions/v1/llama-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        temperature: 0.7
      })
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error('Erro na chamada da função llama-completion:', errorText);
      throw new Error('Erro ao gerar plano com o modelo Llama');
    }

    const llamaData = await llamaResponse.json();
    const responseText = llamaData.choices[0].message.content;
    
    console.log('Resposta do modelo Llama recebida, extraindo JSON...');
    
    // Extrair o JSON da resposta
    let workoutPlan;
    try {
      // Tentar extrair o JSON da resposta, que pode estar envolta em markdown
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```([\s\S]*?)```/) ||
                        [null, responseText];
      
      const jsonString = jsonMatch[1] || responseText;
      workoutPlan = JSON.parse(jsonString);
      console.log('Plano de treino extraído com sucesso');
    } catch (parseError) {
      console.error('Erro ao extrair JSON da resposta:', parseError);
      console.log('Resposta original:', responseText);
      throw new Error('Falha ao processar a resposta do modelo');
    }
    
    // Criar as sessões e exercícios a partir do plano gerado
    console.log('Criando sessões de treino...');
    if (workoutPlan && workoutPlan.sessions) {
      for (const session of workoutPlan.sessions) {
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
            plan_id: planId,
            day_number: session.day_number,
            warmup_description: session.warmup_description,
            cooldown_description: session.cooldown_description
          })
        });

        if (!createSessionResponse.ok) {
          console.error('Erro ao criar sessão:', await createSessionResponse.text());
          continue;
        }
        
        // Adicionar exercícios à sessão
        if (session.exercises && Array.isArray(session.exercises)) {
          for (const exercise of session.exercises) {
            // Verificar se o exercício existe no nosso banco de dados completo
            const exerciseData = exercises.find(e => e.id === exercise.exercise_id);
            if (!exerciseData) {
              console.warn(`Exercício com ID ${exercise.exercise_id} não encontrado no banco de dados, pulando...`);
              continue;
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
                exercise_id: exerciseData.id,
                sets: exercise.sets || exerciseData.min_sets || 3,
                reps: exercise.reps || exerciseData.min_reps || 10,
                rest_time_seconds: exercise.rest_time_seconds || exerciseData.rest_time_seconds || 60,
                order_in_session: session.exercises.indexOf(exercise) + 1
              })
            });
            
            if (!exerciseResponse.ok) {
              console.error('Erro ao adicionar exercício:', await exerciseResponse.text());
            }
          }
        }
      }
    }
    
    // Buscar o plano completo com todas as suas associações
    console.log('Buscando plano completo...');
    const planQueryUrl = `${SUPABASE_URL}/rest/v1/workout_plans?id=eq.${planId}&select=id,user_id,goal,start_date,end_date,workout_sessions(id,day_number,warmup_description,cooldown_description,session_exercises(id,sets,reps,rest_time_seconds,exercise:exercises(id,name,description,gif_url,muscle_group,exercise_type)))`;
    
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
