
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
    
    console.log('Gerando plano de reabilitação para usuário:', userId);
    console.log('Preferências recebidas:', JSON.stringify(preferences));

    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    // Buscar o prompt ativo para plano de fisioterapia
    const promptResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_agent_prompts?agent_type=eq.physiotherapy&is_active=eq.true&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!promptResponse.ok) {
      throw new Error('Erro ao buscar prompt de fisioterapia');
    }

    const prompts = await promptResponse.json();
    
    if (!prompts || prompts.length === 0) {
      throw new Error('Nenhum prompt de fisioterapia ativo encontrado');
    }

    const systemPrompt = prompts[0].prompt;
    
    // Buscar exercícios de fisioterapia disponíveis
    console.log('Buscando exercícios de fisioterapia...');
    const exercisesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/physio_exercises?select=id,name,gif_url,description,joint_area,condition&limit=100`, 
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );
    
    if (!exercisesResponse.ok) {
      const errorText = await exercisesResponse.text();
      console.error('Erro ao buscar exercícios de fisioterapia:', errorText);
      throw new Error(`Falha ao buscar exercícios: ${errorText}`);
    }

    const exercises = await exercisesResponse.json();
    console.log(`Encontrados ${exercises.length} exercícios de fisioterapia`);
    
    if (exercises.length === 0) {
      throw new Error('Nenhum exercício de fisioterapia disponível no banco de dados');
    }

    // Filtrar exercícios relevantes para a condição
    const relevantExercises = preferences.joint_area 
      ? exercises.filter(e => e.joint_area === preferences.joint_area || e.condition === preferences.condition)
      : exercises;
    
    const exercisesToUse = relevantExercises.length > 0 ? relevantExercises : exercises;
    console.log(`Usando ${exercisesToUse.length} exercícios relevantes para a condição`);

    // Criar um plano básico inicial
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30); // Plano de 30 dias
    
    const planId = crypto.randomUUID();

    console.log('Criando plano com ID:', planId);

    // Criar plano no banco de dados
    const createPlanResponse = await fetch(`${SUPABASE_URL}/rest/v1/rehab_plans`, {
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
        joint_area: preferences.joint_area,
        condition: preferences.condition,
        goal: preferences.goal,
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      })
    });

    if (!createPlanResponse.ok) {
      const errorText = await createPlanResponse.text();
      console.error('Erro ao criar plano:', errorText);
      throw new Error(`Falha ao criar o plano: ${errorText}`);
    }

    const createdPlan = await createPlanResponse.json();
    console.log('Plano criado com sucesso:', createdPlan);

    // Preparar o prompt para o modelo Llama
    const userPrompt = `
Crie um plano de reabilitação personalizado com as seguintes características:
- Área articular afetada: ${preferences.joint_area}
- Condição médica: ${preferences.condition}
- Objetivo da reabilitação: ${preferences.goal}
- Nível de dor (0-10): ${preferences.pain_level || 'Não informado'}
- Tempo desde a lesão: ${preferences.injury_time || 'Não informado'}

O plano deve conter 3 sessões de reabilitação, cada uma com 3-4 exercícios específicos.
Inclua apenas exercícios dos IDs a seguir (retorne EXATAMENTE esses IDs): ${JSON.stringify(exercisesToUse.slice(0, 20).map(e => ({ id: e.id, name: e.name })))}

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
          "reps": 10,
          "rest_time_seconds": 30
        },
        ...mais exercícios
      ]
    },
    ...mais sessões
  ]
}
`;

    // Usar a função Llama para gerar o plano
    console.log('Chamando modelo Llama para gerar plano de reabilitação...');
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
    let rehabPlan;
    try {
      // Tentar extrair o JSON da resposta, que pode estar envolta em markdown
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```([\s\S]*?)```/) ||
                        [null, responseText];
      
      const jsonString = jsonMatch[1] || responseText;
      rehabPlan = JSON.parse(jsonString);
      console.log('Plano de reabilitação extraído com sucesso');
    } catch (parseError) {
      console.error('Erro ao extrair JSON da resposta:', parseError);
      console.log('Resposta original:', responseText);
      throw new Error('Falha ao processar a resposta do modelo');
    }
    
    // Criar as sessões e exercícios a partir do plano gerado
    console.log('Criando sessões de reabilitação...');
    if (rehabPlan && rehabPlan.sessions) {
      for (const session of rehabPlan.sessions) {
        const sessionId = crypto.randomUUID();
        
        // Criar sessão
        const createSessionResponse = await fetch(`${SUPABASE_URL}/rest/v1/rehab_sessions`, {
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
            // Verificar se o exercício existe
            const exerciseExists = exercises.some(e => e.id === exercise.exercise_id);
            if (!exerciseExists) {
              console.warn(`Exercício com ID ${exercise.exercise_id} não encontrado no banco de dados, pulando...`);
              continue;
            }
            
            const exerciseResponse = await fetch(`${SUPABASE_URL}/rest/v1/rehab_session_exercises`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                session_id: sessionId,
                exercise_id: exercise.exercise_id,
                sets: exercise.sets,
                reps: exercise.reps,
                rest_time_seconds: exercise.rest_time_seconds,
                order_in_session: exercise.order_in_session || 1
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
    const planQueryUrl = `${SUPABASE_URL}/rest/v1/rehab_plans?id=eq.${planId}&select=id,user_id,joint_area,condition,goal,start_date,end_date,rehab_sessions(id,day_number,warmup_description,cooldown_description,rehab_session_exercises(id,sets,reps,rest_time_seconds,order_in_session,exercise:physio_exercises(id,name,description,gif_url)))`;
    
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
    console.log('Sessões no plano:', finalPlan[0].rehab_sessions?.length || 0);
    
    return new Response(
      JSON.stringify(finalPlan[0]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro durante o processo:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar plano de reabilitação',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
