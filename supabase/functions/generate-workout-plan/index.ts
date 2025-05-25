
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

    // Buscar exercícios disponíveis que tenham GIFs na pasta batch
    console.log('📚 Buscando exercícios da pasta batch no storage...');
    const exercisesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/exercises?select=id,name,gif_url,description,muscle_group,equipment_needed,exercise_type,min_sets,max_sets,min_reps,max_reps,rest_time_seconds,beginner_weight,moderate_weight,advanced_weight&gif_url=like.*batch*&limit=200`, 
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

    const allExercises = await exercisesResponse.json();
    console.log(`📊 ${allExercises.length} exercícios encontrados com GIFs`);
    
    // Filtrar apenas exercícios que tenham GIFs da pasta batch no storage
    const batchExercises = allExercises.filter(exercise => {
      const hasValidGif = exercise.gif_url && 
                         exercise.gif_url.includes('/storage/v1/object/public/exercise-gifs/batch/');
      if (hasValidGif) {
        console.log(`✅ Exercício da pasta batch: ${exercise.name} - ${exercise.gif_url}`);
      }
      return hasValidGif;
    });
    
    console.log(`🎯 ${batchExercises.length} exercícios válidos da pasta batch encontrados`);
    
    if (batchExercises.length === 0) {
      throw new Error('Nenhum exercício com GIFs da pasta batch disponível no banco de dados');
    }

    let aiPlan;
    
    // Tentar usar xAI primeiro, se disponível
    if (XAI_API_KEY) {
      console.log('🚀 Tentando gerar plano com xAI Grok-3 Mini...');
      try {
        aiPlan = await generateWithXAI(preferences, batchExercises);
        console.log('✅ Plano gerado com sucesso usando Grok-3 Mini');
      } catch (xaiError) {
        console.error('❌ Erro com Grok-3 Mini:', xaiError.message);
        console.log('🔄 Caindo para geração local...');
        aiPlan = generateLocalPlan(preferences, batchExercises);
      }
    } else {
      console.log('⚠️ XAI_API_KEY não encontrada, usando geração local');
      aiPlan = generateLocalPlan(preferences, batchExercises);
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
          
          processedSession.session_exercises = session.session_exercises.map((exercise, exIndex) => {
            // Buscar exercício na lista filtrada da pasta batch
            const foundExercise = batchExercises.find(ex => ex.id === exercise.exercise_id);
            
            if (foundExercise) {
              console.log(`✅ Exercício da batch encontrado: ${foundExercise.name}`);
              
              // Determinar carga baseada no nível de atividade e peso recomendado
              const recommendedWeight = determineRecommendedWeight(
                foundExercise, 
                preferences.activity_level, 
                preferences.weight,
                preferences.age,
                preferences.gender
              );
              
              return {
                id: crypto.randomUUID(),
                sets: Math.min(Math.max(exercise.sets || 3, foundExercise.min_sets || 1), foundExercise.max_sets || 5),
                reps: Math.min(Math.max(exercise.reps || 12, foundExercise.min_reps || 1), foundExercise.max_reps || 20),
                rest_time_seconds: exercise.rest_time_seconds || foundExercise.rest_time_seconds || 60,
                order_in_session: exercise.order_in_session || (exIndex + 1),
                recommended_weight: recommendedWeight,
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
              console.warn(`⚠️ Exercício não encontrado na pasta batch: ${exercise.exercise_id}, usando substituto`);
              // Usar exercício padrão da pasta batch se não encontrar
              const defaultExercise = batchExercises[exIndex % batchExercises.length];
              const recommendedWeight = determineRecommendedWeight(
                defaultExercise, 
                preferences.activity_level, 
                preferences.weight,
                preferences.age,
                preferences.gender
              );
              
              return {
                id: crypto.randomUUID(),
                sets: 3,
                reps: 12,
                rest_time_seconds: 60,
                order_in_session: exIndex + 1,
                recommended_weight: recommendedWeight,
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
      console.log(`- Dia ${index + 1}: ${session.session_exercises.length} exercícios da pasta batch`);
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

function determineRecommendedWeight(exercise, activityLevel, userWeight, userAge, userGender) {
  // Se o exercício tem pesos recomendados específicos, usar eles
  if (exercise.beginner_weight || exercise.moderate_weight || exercise.advanced_weight) {
    switch (activityLevel) {
      case 'sedentary':
      case 'light':
        return exercise.beginner_weight || "Peso corporal";
      case 'moderate':
        return exercise.moderate_weight || exercise.beginner_weight || "Peso corporal";
      case 'intense':
        return exercise.advanced_weight || exercise.moderate_weight || "Peso corporal";
      default:
        return exercise.beginner_weight || "Peso corporal";
    }
  }

  // Calcular carga baseada no tipo de exercício e características do usuário
  const baseWeight = userWeight || 70;
  const isStrength = exercise.exercise_type === 'strength';
  
  if (!isStrength) {
    return "Peso corporal";
  }

  // Percentuais baseados no nível de atividade e gênero
  let weightPercentage = 0.3; // Iniciante padrão
  
  switch (activityLevel) {
    case 'sedentary':
      weightPercentage = userGender === 'female' ? 0.2 : 0.25;
      break;
    case 'light':
      weightPercentage = userGender === 'female' ? 0.3 : 0.35;
      break;
    case 'moderate':
      weightPercentage = userGender === 'female' ? 0.4 : 0.5;
      break;
    case 'intense':
      weightPercentage = userGender === 'female' ? 0.5 : 0.6;
      break;
  }

  // Ajustar baseado na idade
  if (userAge > 50) {
    weightPercentage *= 0.8;
  } else if (userAge > 35) {
    weightPercentage *= 0.9;
  }

  // Ajustar baseado no grupo muscular
  switch (exercise.muscle_group) {
    case 'legs':
      weightPercentage *= 1.5; // Pernas suportam mais peso
      break;
    case 'back':
      weightPercentage *= 1.2;
      break;
    case 'chest':
      weightPercentage *= 1.1;
      break;
    case 'shoulders':
    case 'arms':
      weightPercentage *= 0.8; // Músculos menores
      break;
  }

  const recommendedKg = Math.round(baseWeight * weightPercentage);
  return `${recommendedKg}kg`;
}

async function generateWithXAI(preferences: any, batchExercises: any[]) {
  console.log('🧠 Preparando prompt para Grok-3 Mini...');
  
  const systemPrompt = `Você é o Trenner2025, um agente de IA especializado em educação física e criação de planos de treino personalizados. 
  Crie um plano de treino detalhado baseado nas preferências do usuário e nos exercícios disponíveis da pasta batch.
  IMPORTANTE: Responda SEMPRE em português do Brasil e retorne APENAS um JSON válido sem formatação markdown.
  Você deve criar planos científicos, seguros e eficazes usando APENAS exercícios com GIFs da pasta batch.
  
  REGRAS IMPORTANTES:
  - Crie EXATAMENTE ${preferences.days_per_week || 3} dias de treino
  - Cada dia deve ter entre 6-8 exercícios diferentes
  - Varie os exercícios entre os dias focando em diferentes grupos musculares
  - Use apenas IDs de exercícios que existem na lista fornecida
  - Distribua os exercícios de forma equilibrada entre os grupos musculares
  - Especifique cargas apropriadas baseadas no nível de condicionamento físico`;

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
  
  Exercícios disponíveis da pasta batch (use APENAS estes IDs):
  ${batchExercises.slice(0, 50).map((ex, index) => `${index + 1}. ID: ${ex.id} - ${ex.name} (${ex.muscle_group}, ${ex.exercise_type}, Séries: ${ex.min_sets}-${ex.max_sets}, Reps: ${ex.min_reps}-${ex.max_reps}, Peso iniciante: ${ex.beginner_weight || 'não especificado'}, Peso intermediário: ${ex.moderate_weight || 'não especificado'}, Peso avançado: ${ex.advanced_weight || 'não especificado'})`).join('\n')}
  
  Retorne um JSON com esta estrutura exata (crie ${preferences.days_per_week || 3} dias com 6-8 exercícios cada):
  {
    "workout_sessions": [
      {
        "day_number": 1,
        "warmup_description": "Aquecimento dinâmico específico para o treino do dia",
        "cooldown_description": "Alongamento e relaxamento específico",
        "session_exercises": [
          {
            "exercise_id": "ID_REAL_DO_EXERCICIO_DA_LISTA_ACIMA",
            "sets": 3,
            "reps": 12,
            "rest_time_seconds": 60,
            "order_in_session": 1,
            "recommended_weight": "15kg ou peso corporal"
          }
          // ... mais 5-7 exercícios diferentes
        ]
      }
      // ... mais ${(preferences.days_per_week || 3) - 1} dias
    ]
  }
  
  CRITÉRIOS OBRIGATÓRIOS:
  - Use apenas IDs de exercícios que existem na lista fornecida da pasta batch!
  - Crie ${preferences.days_per_week || 3} dias de treino
  - Cada dia deve ter 6-8 exercícios diferentes 
  - Inclua order_in_session para cada exercício (1, 2, 3, etc.)
  - Varie os grupos musculares entre os dias
  - Respeite os limites de séries e repetições de cada exercício
  - Especifique cargas apropriadas para o nível do usuário
  - Para exercícios de peso corporal, especifique "peso corporal"
  - Para exercícios com peso, especifique valores em kg apropriados para o nível
  - Crie aquecimentos e resfriamentos específicos para cada dia
  `;

  // Chamar API da xAI com modelo Grok-3 Mini
  const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-2-1212',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 6000,
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

  console.log('📝 Conteúdo bruto da IA:', content.substring(0, 500) + '...');

  // Parse do JSON retornado
  try {
    const cleanContent = content.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (parseError) {
    console.error('❌ Erro ao fazer parse do JSON:', parseError);
    console.error('Conteúdo que falhou:', content);
    throw new Error(`Erro ao processar resposta da IA: ${parseError.message}`);
  }
}

function generateLocalPlan(preferences: any, batchExercises: any[]) {
  console.log('🏠 Gerando plano localmente com exercícios da pasta batch...');
  
  const daysPerWeek = preferences.days_per_week || 3;
  const muscleGroups = ["chest", "back", "legs", "shoulders", "arms", "core"];
  
  // Organizar exercícios da pasta batch por grupo muscular
  const exercisesByMuscle: Record<string, any[]> = {};
  muscleGroups.forEach(group => {
    exercisesByMuscle[group] = batchExercises.filter(ex => ex.muscle_group === group);
    console.log(`💪 Grupo ${group}: ${exercisesByMuscle[group].length} exercícios da pasta batch`);
  });
  
  const sessions = [];
  
  for (let day = 1; day <= daysPerWeek; day++) {
    const sessionExercises = [];
    let exerciseOrder = 1;
    
    // Selecionar 6-8 exercícios por sessão da pasta batch
    const exercisesPerSession = Math.min(8, Math.max(6, Math.floor(24 / daysPerWeek)));
    
    // Distribuir exercícios pelos grupos musculares de forma equilibrada
    const exercisesPerGroup = Math.ceil(exercisesPerSession / muscleGroups.length);
    
    for (const group of muscleGroups) {
      const groupExercises = exercisesByMuscle[group];
      
      if (groupExercises && groupExercises.length > 0) {
        // Embaralhar exercícios do grupo
        const shuffled = [...groupExercises].sort(() => 0.5 - Math.random());
        
        // Selecionar exercícios para este dia (máximo de exercisesPerGroup por grupo)
        const selectedFromGroup = shuffled.slice(0, Math.min(exercisesPerGroup, exercisesPerSession - sessionExercises.length));
        
        for (const exercise of selectedFromGroup) {
          if (sessionExercises.length >= exercisesPerSession) break;
          
          // Determinar carga recomendada
          const recommendedWeight = determineRecommendedWeight(
            exercise, 
            preferences.activity_level, 
            preferences.weight,
            preferences.age,
            preferences.gender
          );
          
          sessionExercises.push({
            exercise_id: exercise.id,
            sets: Math.max(exercise.min_sets || 3, 3),
            reps: Math.max(exercise.min_reps || 10, 10),
            rest_time_seconds: exercise.rest_time_seconds || 60,
            order_in_session: exerciseOrder++,
            recommended_weight: recommendedWeight
          });
          
          console.log(`✅ Exercício selecionado para o dia ${day}: ${exercise.name} (${exercise.muscle_group}) - Carga: ${recommendedWeight}`);
        }
      }
    }
    
    // Se ainda precisamos de mais exercícios, pegar de qualquer grupo
    while (sessionExercises.length < exercisesPerSession && sessionExercises.length < batchExercises.length) {
      const remainingExercises = batchExercises.filter(ex => 
        !sessionExercises.some(se => se.exercise_id === ex.id)
      );
      
      if (remainingExercises.length === 0) break;
      
      const randomExercise = remainingExercises[Math.floor(Math.random() * remainingExercises.length)];
      
      const recommendedWeight = determineRecommendedWeight(
        randomExercise, 
        preferences.activity_level, 
        preferences.weight,
        preferences.age,
        preferences.gender
      );
      
      sessionExercises.push({
        exercise_id: randomExercise.id,
        sets: Math.max(randomExercise.min_sets || 3, 3),
        reps: Math.max(randomExercise.min_reps || 10, 10),
        rest_time_seconds: randomExercise.rest_time_seconds || 60,
        order_in_session: exerciseOrder++,
        recommended_weight: recommendedWeight
      });
      
      console.log(`✅ Exercício adicional para o dia ${day}: ${randomExercise.name} (${randomExercise.muscle_group}) - Carga: ${recommendedWeight}`);
    }
    
    sessions.push({
      day_number: day,
      warmup_description: `Aquecimento dinâmico de 5-10 minutos focado nos grupos musculares do Dia ${day}`,
      cooldown_description: `Alongamento específico de 5-10 minutos para os músculos trabalhados no Dia ${day}`,
      session_exercises: sessionExercises
    });
  }
  
  console.log(`🎯 Plano local gerado com ${sessions.length} sessões usando exercícios da pasta batch`);
  sessions.forEach((session, index) => {
    console.log(`📅 Dia ${index + 1}: ${session.session_exercises.length} exercícios`);
  });
  
  return { workout_sessions: sessions };
}
