
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  description?: string;
  gif_url?: string;
}

interface WorkoutSession {
  id: string;
  day_number: number;
  warmup_description: string;
  cooldown_description: string;
  exercises: Exercise[];
}

interface WorkoutPlan {
  id: string;
  user_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  sessions: WorkoutSession[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    
    console.log('Gerando plano de treino para usuário:', userId);
    console.log('Preferências:', JSON.stringify(preferences));

    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    // Consulta os exercícios disponíveis do banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const exercisesResponse = await fetch(`${supabaseUrl}/rest/v1/exercises?select=id,name,gif_url,description&limit=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!exercisesResponse.ok) {
      throw new Error('Falha ao buscar exercícios do banco de dados');
    }

    const exercises = await exercisesResponse.json();
    console.log(`Encontrados ${exercises.length} exercícios no banco de dados`);

    // Estrutura o plano usando os dados disponíveis
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 28); // Plano de 4 semanas

    // Gerar um plano básico inicial
    const workoutPlan: WorkoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal || 'general_fitness',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      sessions: []
    };

    // Determinar quantos dias por semana baseado nas preferências
    const daysPerWeek = preferences.days_per_week || 3;
    
    // Gerar JSON query para API Groq com informações específicas
    const systemPrompt = `Você é um especialista em educação física e personal trainer. 
    Gere um plano de treino personalizado baseado nas preferências do usuário.
    Responda APENAS no formato JSON com a seguinte estrutura:
    {
      "sessions": [
        {
          "day_number": 1,
          "focus": "descrição do foco do treino",
          "warmup_description": "descrição do aquecimento",
          "cooldown_description": "descrição do resfriamento",
          "exercises": [
            {
              "exercise_id": "id do exercício",
              "sets": 3,
              "reps": 12,
              "rest_time_seconds": 60
            }
          ]
        }
      ]
    }`;

    // Prepara a lista de IDs dos exercícios disponíveis para referenciar
    const exerciseOptions = exercises.map(ex => ({ id: ex.id, name: ex.name }));

    const prompt = `
    Dados do usuário:
    - Idade: ${preferences.age}
    - Peso: ${preferences.weight}kg
    - Altura: ${preferences.height}cm
    - Sexo: ${preferences.gender === 'male' ? 'Masculino' : 'Feminino'}
    - Objetivo: ${preferences.goal === 'lose_weight' ? 'Perda de peso' : preferences.goal === 'gain_mass' ? 'Ganho de massa' : 'Manutenção'}
    - Nível de atividade: ${preferences.activity_level}
    - Dias disponíveis por semana: ${daysPerWeek}
    - Tipos de exercícios preferidos: ${preferences.preferred_exercise_types?.join(', ') || 'Não especificado'}
    - Local de treino: ${preferences.training_location || 'Não especificado'}

    Use APENAS os exercícios da lista a seguir (reference-os pelo ID):
    ${JSON.stringify(exerciseOptions)}

    Crie um plano de treino com ${daysPerWeek} dias por semana, durante 4 semanas.
    Retorne APENAS o JSON com a estrutura especificada, sem texto adicional.
    `;

    console.log('Enviando prompt para a API Groq...');

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro na resposta da API Groq:', data);
      throw new Error(data.error?.message || 'Erro ao gerar plano de treino');
    }

    console.log('Resposta recebida da API Groq');
    
    // Extrair o JSON da resposta
    let aiResponse = data.choices[0].message.content;
    console.log('Conteúdo da resposta:', aiResponse.substring(0, 200) + '...');
    
    // Limpar a resposta para garantir que seja apenas JSON válido
    if (aiResponse.includes('```json')) {
      aiResponse = aiResponse.split('```json')[1].split('```')[0].trim();
    } else if (aiResponse.includes('```')) {
      aiResponse = aiResponse.split('```')[1].split('```')[0].trim();
    }
    
    try {
      const aiPlan = JSON.parse(aiResponse);
      console.log('JSON parseado com sucesso');
      
      // Montar o plano final
      if (aiPlan.sessions && Array.isArray(aiPlan.sessions)) {
        workoutPlan.sessions = aiPlan.sessions.map(session => {
          // Criar os exercícios com dados completos
          const sessionExercises = (session.exercises || []).map(ex => {
            // Encontrar o exercício completo pelo ID
            const fullExercise = exercises.find(e => e.id === ex.exercise_id);
            
            if (!fullExercise) {
              console.warn(`Exercício não encontrado: ${ex.exercise_id}`);
              return null;
            }
            
            return {
              id: crypto.randomUUID(),
              name: fullExercise.name,
              sets: ex.sets || 3,
              reps: ex.reps || 12,
              rest_time_seconds: ex.rest_time_seconds || 60,
              description: fullExercise.description,
              gif_url: fullExercise.gif_url
            };
          }).filter(Boolean); // Remover nulls
          
          return {
            id: crypto.randomUUID(),
            day_number: session.day_number,
            warmup_description: session.warmup_description || 'Aquecimento geral de 5-10 minutos com exercícios leves.',
            cooldown_description: session.cooldown_description || 'Alongamentos gerais por 5-10 minutos.',
            exercises: sessionExercises
          };
        });
      } else {
        throw new Error('Formato de resposta da IA inválido');
      }
    } catch (parseError) {
      console.error('Erro ao processar resposta da IA:', parseError);
      console.error('Resposta recebida:', aiResponse);
      
      // Gerar um plano de fallback
      workoutPlan.sessions = generateFallbackPlan(daysPerWeek, exercises, preferences);
    }

    // Gravar o plano no banco de dados
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/workout_plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: userId,
        goal: workoutPlan.goal,
        start_date: workoutPlan.start_date,
        end_date: workoutPlan.end_date
      })
    });

    if (!insertResponse.ok) {
      const errorData = await insertResponse.json();
      console.error('Erro ao inserir plano:', errorData);
      throw new Error('Falha ao salvar o plano de treino no banco de dados');
    }

    const savedPlan = await insertResponse.json();
    const planId = savedPlan[0].id;
    console.log('Plano base criado com ID:', planId);

    // Adicionar sessões e exercícios
    for (const session of workoutPlan.sessions) {
      const sessionResponse = await fetch(`${supabaseUrl}/rest/v1/workout_sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          workout_plan_id: planId,
          day_number: session.day_number,
          warmup_description: session.warmup_description,
          cooldown_description: session.cooldown_description
        })
      });

      if (!sessionResponse.ok) {
        console.error('Erro ao inserir sessão:', await sessionResponse.text());
        continue;
      }

      const savedSession = await sessionResponse.json();
      const sessionId = savedSession[0].id;
      console.log(`Sessão ${session.day_number} criada com ID:`, sessionId);

      // Adicionar exercícios para esta sessão
      for (const exercise of session.exercises) {
        // Encontrar o ID real do exercício pelo nome
        const exerciseRef = exercises.find(e => e.name === exercise.name);
        
        if (!exerciseRef) {
          console.warn(`Exercício não encontrado: ${exercise.name}`);
          continue;
        }

        const exerciseResponse = await fetch(`${supabaseUrl}/rest/v1/session_exercises`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            session_id: sessionId,
            exercise_id: exerciseRef.id,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_time_seconds: exercise.rest_time_seconds
          })
        });

        if (!exerciseResponse.ok) {
          console.error('Erro ao inserir exercício:', await exerciseResponse.text());
        }
      }
    }

    // Buscar o plano completo para retornar
    const finalPlanResponse = await fetch(
      `${supabaseUrl}/rest/v1/workout_plans?id=eq.${planId}&select=id,user_id,goal,start_date,end_date,workout_sessions(id,day_number,warmup_description,cooldown_description,session_exercises(id,sets,reps,rest_time_seconds,exercise:exercises(id,name,description,gif_url)))`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const finalPlan = await finalPlanResponse.json();
    console.log('Plano completo gerado e armazenado com sucesso');

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

function generateFallbackPlan(daysPerWeek: number, exercises: any[], preferences: any) {
  console.log('Gerando plano de fallback');
  const sessions = [];
  
  // Filtrar por tipo se houver preferência
  let filteredExercises = exercises;
  if (preferences.preferred_exercise_types && preferences.preferred_exercise_types.length > 0) {
    // Como não temos o tipo no exercício aqui, estamos apenas dividindo aleatoriamente
    // Em uma implementação real, você teria esses metadados
    filteredExercises = exercises.filter((_, index) => index % 3 === 0);
  }
  
  // Garantir que temos pelo menos alguns exercícios
  if (filteredExercises.length < 10) {
    filteredExercises = exercises;
  }
  
  // Criar um treino para cada dia
  for (let i = 1; i <= daysPerWeek; i++) {
    // Selecionar exercícios aleatórios para este dia (entre 5-8)
    const dayExercises = [];
    const exerciseCount = 5 + Math.floor(Math.random() * 4);
    
    // Criar um conjunto diferente de exercícios para cada dia
    const startIndex = (i - 1) * 10 % filteredExercises.length;
    for (let j = 0; j < exerciseCount; j++) {
      const index = (startIndex + j) % filteredExercises.length;
      const exercise = filteredExercises[index];
      
      dayExercises.push({
        id: crypto.randomUUID(),
        name: exercise.name,
        sets: 3,
        reps: 12,
        rest_time_seconds: 60,
        description: exercise.description,
        gif_url: exercise.gif_url
      });
    }
    
    // Determinar o foco do dia com base no número
    let focus = 'Treino completo';
    if (daysPerWeek >= 3) {
      if (i === 1) focus = 'Membros superiores';
      else if (i === 2) focus = 'Membros inferiores';
      else if (i === 3) focus = 'Core e abdômen';
      else if (i === 4) focus = 'Ombros e costas';
      else if (i === 5) focus = 'Peito e braços';
    }
    
    sessions.push({
      id: crypto.randomUUID(),
      day_number: i,
      warmup_description: `Aquecimento de 5-10 minutos com cardio leve e movimentos dinâmicos. Foco em ${focus.toLowerCase()}.`,
      cooldown_description: 'Alongamentos gerais por 5-10 minutos, focando nos músculos trabalhados.',
      exercises: dayExercises
    });
  }
  
  return sessions;
}
