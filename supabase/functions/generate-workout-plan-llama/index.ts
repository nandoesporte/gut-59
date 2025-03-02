
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const llamaApiKey = Deno.env.get('LLAMA_API_KEY') || '';

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, userId } = await req.json();
    
    console.log("Recebida solicitação para gerar plano de treino com Llama3");
    console.log("Preferências:", JSON.stringify(preferences));
    console.log("ID do usuário:", userId);

    if (!llamaApiKey) {
      throw new Error("API key do Llama não configurada no servidor");
    }

    // Contruir o prompt para o Llama 3
    const systemPrompt = `Você é TRENE2025, um agente de IA especializado em educação física e nutrição esportiva. 
Seu objetivo é criar planos de treino detalhados, personalizados e cientificamente embasados.
Você deve fornecer um plano completo, com exercícios, séries, repetições e dicas específicas.`;

    const userPrompt = `Crie um plano de treino personalizado para uma pessoa com as seguintes características:
- Idade: ${preferences.age} anos
- Peso: ${preferences.weight} kg
- Altura: ${preferences.height} cm
- Sexo: ${preferences.gender === 'male' ? 'Masculino' : 'Feminino'}
- Objetivo principal: ${translateGoal(preferences.goal)}
- Nível de atividade física: ${translateActivityLevel(preferences.activity_level)}
- Tipos de exercícios preferidos: ${preferences.preferred_exercise_types.map(type => translateExerciseType(type)).join(', ')}
- Equipamentos disponíveis: ${preferences.available_equipment.join(', ') || 'Nenhum equipamento específico'}
${preferences.health_conditions ? `- Condições de saúde: ${preferences.health_conditions.join(', ')}` : ''}

Forneça um plano de treino semanal completo com:
1. Visão geral e objetivos do plano
2. Sessões de treino detalhadas para cada dia da semana
3. Para cada exercício, especifique séries, repetições e tempo de descanso
4. Dicas técnicas para execução correta
5. Sugestões de progressão para as próximas semanas
6. Recomendações de nutrição complementares ao treino

Formate a resposta em formato JSON estruturado desta forma:
{
  "title": "Nome do plano de treino",
  "overview": "Visão geral do plano",
  "objectives": ["objetivo 1", "objetivo 2", ...],
  "sessions": [
    {
      "day": "Dia da semana",
      "focus": "Foco do treino",
      "exercises": [
        {
          "name": "Nome do exercício",
          "sets": número de séries,
          "reps": "número ou faixa de repetições",
          "rest": "tempo de descanso em segundos",
          "technique_tips": ["dica 1", "dica 2", ...],
          "equipment": ["equipamento necessário"]
        },
        ...mais exercícios
      ]
    },
    ...mais sessões de treino
  ],
  "progression": ["sugestão 1", "sugestão 2", ...],
  "nutrition_tips": ["dica 1", "dica 2", ...]
}`;

    console.log("Enviando prompt para a API do Llama");
    
    // Fazer a chamada para a API do Llama
    const llamaResponse = await fetch("https://api.llama-api.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${llamaApiKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error("Erro na API do Llama:", errorText);
      throw new Error(`Erro na API do Llama: ${llamaResponse.status} ${errorText}`);
    }

    const llamaData = await llamaResponse.json();
    console.log("Resposta recebida da API do Llama");
    
    let workoutPlan;
    try {
      // Extrair o plano de treino do JSON da resposta
      const content = llamaData.choices[0].message.content;
      workoutPlan = typeof content === 'string' ? JSON.parse(content) : content;
      
      console.log("Plano de treino extraído com sucesso");
    } catch (error) {
      console.error("Erro ao processar resposta do Llama:", error);
      throw new Error(`Erro ao processar resposta do Llama: ${error.message}`);
    }
    
    // Salvar o plano no banco de dados
    const { data: planData, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        title: workoutPlan.title || 'Plano de Treino Personalizado',
        data: workoutPlan,
        model_used: 'llama3-8b-8192',
        agent_name: 'trene2025'
      })
      .select()
      .single();
      
    if (planError) {
      console.error("Erro ao salvar plano no banco de dados:", planError);
      throw planError;
    }

    console.log("Plano de treino salvo com sucesso");
    
    // Criar as sessões de treino no banco
    if (workoutPlan.sessions && Array.isArray(workoutPlan.sessions)) {
      for (const [index, session] of workoutPlan.sessions.entries()) {
        // Inserir sessão
        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert({
            plan_id: planData.id,
            day_of_week: session.day || `Dia ${index + 1}`,
            focus: session.focus || '',
            order: index
          })
          .select()
          .single();
          
        if (sessionError) {
          console.error("Erro ao salvar sessão:", sessionError);
          continue;
        }
        
        // Inserir exercícios da sessão
        if (session.exercises && Array.isArray(session.exercises)) {
          for (const [exIndex, exercise] of session.exercises.entries()) {
            await supabase
              .from('session_exercises')
              .insert({
                session_id: sessionData.id,
                name: exercise.name,
                sets: exercise.sets,
                reps: exercise.reps,
                rest_time: exercise.rest,
                technique_tips: exercise.technique_tips,
                equipment: exercise.equipment,
                order: exIndex
              });
          }
        }
      }
    }
    
    return new Response(JSON.stringify(workoutPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Erro na função generate-workout-plan-llama:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// Funções auxiliares para tradução
function translateGoal(goal: string): string {
  const goalMap: Record<string, string> = {
    'lose_weight': 'Perda de peso',
    'maintain': 'Manutenção do peso',
    'gain_mass': 'Ganho de massa muscular'
  };
  return goalMap[goal] || goal;
}

function translateActivityLevel(level: string): string {
  const levelMap: Record<string, string> = {
    'sedentary': 'Sedentário',
    'light': 'Leve',
    'moderate': 'Moderado',
    'intense': 'Intenso'
  };
  return levelMap[level] || level;
}

function translateExerciseType(type: string): string {
  const typeMap: Record<string, string> = {
    'strength': 'Força',
    'cardio': 'Cardio',
    'mobility': 'Mobilidade'
  };
  return typeMap[type] || type;
}
