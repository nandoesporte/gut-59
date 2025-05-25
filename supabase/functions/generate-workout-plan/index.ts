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

    // Buscar APENAS exercícios com GIFs válidos da pasta batch
    console.log('📚 Buscando APENAS exercícios com GIFs válidos da pasta batch...');
    const exercisesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/exercises?select=id,name,gif_url,description,muscle_group,equipment_needed,exercise_type,min_sets,max_sets,min_reps,max_reps,rest_time_seconds,beginner_weight,moderate_weight,advanced_weight&gif_url=like.*%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fexercise-gifs%2Fbatch%2F*&limit=500`, 
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
    console.log(`📊 ${allExercises.length} exercícios encontrados da pasta batch`);
    
    // Validação extra: filtrar apenas exercícios que realmente têm GIFs válidos
    const validBatchExercises = allExercises.filter(exercise => {
      const hasValidGif = exercise.gif_url && 
                         exercise.gif_url.includes('/storage/v1/object/public/exercise-gifs/batch/') &&
                         exercise.gif_url.trim().length > 50 && // URL deve ter tamanho mínimo
                         !exercise.gif_url.includes('placeholder') &&
                         !exercise.gif_url.includes('example') &&
                         !exercise.gif_url.includes('null') &&
                         !exercise.gif_url.includes('undefined');
      
      if (hasValidGif) {
        console.log(`✅ Exercício válido da pasta batch: ${exercise.name} - GIF: ${exercise.gif_url}`);
      } else {
        console.log(`❌ Exercício rejeitado (GIF inválido): ${exercise.name} - ${exercise.gif_url || 'sem GIF'}`);
      }
      return hasValidGif;
    });
    
    console.log(`🎯 ${validBatchExercises.length} exercícios válidos confirmados da pasta batch`);
    
    if (validBatchExercises.length === 0) {
      throw new Error('Nenhum exercício com GIFs válidos encontrado na pasta batch');
    }

    // Verificar se temos exercícios suficientes por grupo muscular
    const exercisesByGroup = {
      chest: validBatchExercises.filter(ex => ex.muscle_group === 'chest'),
      back: validBatchExercises.filter(ex => ex.muscle_group === 'back'),
      legs: validBatchExercises.filter(ex => ex.muscle_group === 'legs'),
      shoulders: validBatchExercises.filter(ex => ex.muscle_group === 'shoulders'),
      arms: validBatchExercises.filter(ex => ex.muscle_group === 'arms'),
      core: validBatchExercises.filter(ex => ex.muscle_group === 'core')
    };

    Object.entries(exercisesByGroup).forEach(([group, exercises]) => {
      console.log(`💪 Grupo ${group}: ${exercises.length} exercícios da pasta batch`);
    });

    let aiPlan;
    
    // Tentar usar xAI primeiro, se disponível
    if (XAI_API_KEY) {
      console.log('🚀 Tentando gerar plano com xAI Grok-2...');
      try {
        aiPlan = await generateWithXAI(preferences, validBatchExercises);
        console.log('✅ Plano gerado com sucesso usando Grok-2');
      } catch (xaiError) {
        console.error('❌ Erro com Grok-2:', xaiError.message);
        console.log('🔄 Caindo para geração local...');
        aiPlan = generateLocalPlan(preferences, validBatchExercises);
      }
    } else {
      console.log('⚠️ XAI_API_KEY não encontrada, usando geração local');
      aiPlan = generateLocalPlan(preferences, validBatchExercises);
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
            // Buscar exercício na lista válida da pasta batch
            const foundExercise = validBatchExercises.find(ex => ex.id === exercise.exercise_id);
            
            if (foundExercise) {
              console.log(`✅ Exercício válido encontrado: ${foundExercise.name} - GIF: ${foundExercise.gif_url}`);
              
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
              console.warn(`⚠️ Exercício não encontrado: ${exercise.exercise_id}, usando substituto válido`);
              // Usar exercício padrão válido da pasta batch se não encontrar
              const defaultExercise = validBatchExercises[exIndex % validBatchExercises.length];
              const recommendedWeight = determineRecommendedWeight(
                defaultExercise, 
                preferences.activity_level, 
                preferences.weight,
                preferences.age,
                preferences.gender
              );
              
              console.log(`🔄 Substituindo por: ${defaultExercise.name} - GIF: ${defaultExercise.gif_url}`);
              
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

    console.log('🎉 Plano de treino gerado com sucesso!');
    console.log(`📊 Estatísticas do plano:`);
    console.log(`- Sessões: ${workoutPlan.workout_sessions.length}`);
    workoutPlan.workout_sessions.forEach((session, index) => {
      console.log(`- Dia ${index + 1}: ${session.session_exercises.length} exercícios válidos com GIFs`);
      // Log das URLs dos GIFs para debug
      session.session_exercises.forEach((exercise, exIndex) => {
        console.log(`  📸 Exercício ${exIndex + 1}: ${exercise.exercise.name} - GIF URL: ${exercise.exercise.gif_url}`);
      });
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

async function generateWithXAI(preferences: any, validBatchExercises: any[]) {
  console.log('🧠 Preparando prompt para Grok-2...');
  
  const systemPrompt = `Você é o Trenner2025, um agente de IA especializado em educação física e criação de planos de treino personalizados. 
  Crie um plano de treino detalhado baseado nas preferências do usuário e nos exercícios disponíveis da pasta batch.
  IMPORTANTE: Responda SEMPRE em português do Brasil e retorne APENAS um JSON válido sem formatação markdown.
  Você deve criar planos científicos, seguros e eficazes usando APENAS exercícios com GIFs válidos da pasta batch.
  
  REGRAS IMPORTANTES:
  - Crie EXATAMENTE ${preferences.days_per_week || 3} dias de treino
  - Cada dia deve ter entre 6-8 exercícios diferentes
  - Varie os exercícios entre os dias focando em diferentes grupos musculares
  - Use apenas IDs de exercícios que existem na lista fornecida (TODOS têm GIFs válidos)
  - Distribua os exercícios de forma equilibrada entre os grupos musculares
  - Especifique cargas apropriadas baseadas no nível de condicionamento físico`;

  const userPrompt = `
  Crie um plano de treino personalizado baseado nestas informações:
  
  Preferências do usuário:
  - Objetivo: ${preferences.goal || 'manter forma'}
  - Nível de atividade: ${preferences.activity_level || 'moderado'}
  - Dias por semana: ${preferences.days_per_week || 3}
  - Tipos de exercício preferidos: ${preferences.preferred_exercise_types?.join(', ') || 'todos'}
  - Idade: ${preferences.age || 'não informada'}
  - Peso: ${preferences.weight || 'não informado'}kg
  - Altura: ${preferences.height || 'não informada'}cm
  - Gênero: ${preferences.gender || 'não informado'}
  
  Exercícios disponíveis com GIFs válidos da pasta batch (use APENAS estes IDs):
  ${validBatchExercises.slice(0, 50).map((ex, index) => `${index + 1}. ID: ${ex.id} - ${ex.name} (${ex.muscle_group}, ${ex.exercise_type}, Séries: ${ex.min_sets}-${ex.max_sets}, Reps: ${ex.min_reps}-${ex.max_reps})`).join('\n')}
  
  Retorne APENAS um JSON válido com esta estrutura exata:
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
            "order_in_session": 1
          }
        ]
      }
    ]
  }
  
  CRITÉRIOS OBRIGATÓRIOS:
  - Use apenas IDs de exercícios que existem na lista fornecida!
  - Crie ${preferences.days_per_week || 3} dias de treino
  - Cada dia deve ter 6-8 exercícios diferentes 
  - Inclua order_in_session para cada exercício (1, 2, 3, etc.)
  - Varie os grupos musculares entre os dias
  - Respeite os limites de séries e repetições de cada exercício
  `;
  
  // Chamar API da xAI com modelo Grok-2
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
    const parsedPlan = JSON.parse(cleanContent);
    
    // Validar se temos exercícios
    if (!parsedPlan.workout_sessions || !Array.isArray(parsedPlan.workout_sessions)) {
      throw new Error('Plano inválido: sem sessões de treino');
    }
    
    // Verificar se cada sessão tem exercícios
    parsedPlan.workout_sessions.forEach((session, index) => {
      if (!session.session_exercises || !Array.isArray(session.session_exercises) || session.session_exercises.length === 0) {
        console.error(`❌ Sessão ${index + 1} sem exercícios`);
        throw new Error(`Sessão ${index + 1} sem exercícios`);
      }
      console.log(`✅ Sessão ${index + 1}: ${session.session_exercises.length} exercícios`);
    });
    
    return parsedPlan;
  } catch (parseError) {
    console.error('❌ Erro ao fazer parse do JSON:', parseError);
    console.error('Conteúdo que falhou:', content);
    throw new Error(`Erro ao processar resposta da IA: ${parseError.message}`);
  }
}

function generateLocalPlan(preferences: any, validBatchExercises: any[]) {
  console.log('🏠 Gerando plano localmente com exercícios válidos da pasta batch...');
  
  const daysPerWeek = preferences.days_per_week || 3;
  const muscleGroups = ["chest", "back", "legs", "shoulders", "arms", "core"];
  
  // Organizar exercícios válidos por grupo muscular
  const exercisesByMuscle: Record<string, any[]> = {};
  muscleGroups.forEach(group => {
    exercisesByMuscle[group] = validBatchExercises.filter(ex => ex.muscle_group === group);
    console.log(`💪 Grupo ${group}: ${exercisesByMuscle[group].length} exercícios válidos`);
  });
  
  const sessions = [];
  
  for (let day = 1; day <= daysPerWeek; day++) {
    const sessionExercises = [];
    let exerciseOrder = 1;
    
    // Selecionar 6-8 exercícios por sessão
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
          
          sessionExercises.push({
            exercise_id: exercise.id,
            sets: Math.max(exercise.min_sets || 3, 3),
            reps: Math.max(exercise.min_reps || 10, 10),
            rest_time_seconds: exercise.rest_time_seconds || 60,
            order_in_session: exerciseOrder++
          });
          
          console.log(`✅ Exercício válido selecionado para o dia ${day}: ${exercise.name} (${exercise.muscle_group}) - GIF: ${exercise.gif_url}`);
        }
      }
    }
    
    // Se ainda precisamos de mais exercícios, pegar de qualquer grupo (todos são válidos)
    while (sessionExercises.length < exercisesPerSession && sessionExercises.length < validBatchExercises.length) {
      const remainingExercises = validBatchExercises.filter(ex => 
        !sessionExercises.some(se => se.exercise_id === ex.id)
      );
      
      if (remainingExercises.length === 0) break;
      
      const randomExercise = remainingExercises[Math.floor(Math.random() * remainingExercises.length)];
      
      sessionExercises.push({
        exercise_id: randomExercise.id,
        sets: Math.max(randomExercise.min_sets || 3, 3),
        reps: Math.max(randomExercise.min_reps || 10, 10),
        rest_time_seconds: randomExercise.rest_time_seconds || 60,
        order_in_session: exerciseOrder++
      });
      
      console.log(`✅ Exercício adicional válido para o dia ${day}: ${randomExercise.name} (${randomExercise.muscle_group}) - GIF: ${randomExercise.gif_url}`);
    }
    
    sessions.push({
      day_number: day,
      warmup_description: `Aquecimento dinâmico de 5-10 minutos focado nos grupos musculares do Dia ${day}`,
      cooldown_description: `Alongamento específico de 5-10 minutos para os músculos trabalhados no Dia ${day}`,
      session_exercises: sessionExercises
    });
  }
  
  console.log(`🎯 Plano local gerado com ${sessions.length} sessões usando apenas exercícios válidos da pasta batch`);
  sessions.forEach((session, index) => {
    console.log(`📅 Dia ${index + 1}: ${session.session_exercises.length} exercícios válidos`);
  });
  
  return { workout_sessions: sessions };
}
