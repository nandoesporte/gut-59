
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
        aiPlan = await generateWithXAI(preferences, validBatchExercises, exercisesByGroup);
        console.log('✅ Plano gerado com sucesso usando Grok-2');
      } catch (xaiError) {
        console.error('❌ Erro com Grok-2:', xaiError.message);
        console.log('🔄 Caindo para geração local...');
        aiPlan = generateLocalPlan(preferences, validBatchExercises, exercisesByGroup);
      }
    } else {
      console.log('⚠️ XAI_API_KEY não encontrada, usando geração local');
      aiPlan = generateLocalPlan(preferences, validBatchExercises, exercisesByGroup);
    }

    // Criar o plano completo PRESERVANDO EXATAMENTE OS EXERCÍCIOS ESCOLHIDOS PELO AGENTE
    console.log('🏗️ Construindo plano de treino final PRESERVANDO escolhas do agente...');
    const workoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal || 'maintain',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      workout_sessions: []
    };

    // Processar sessões e exercícios PRESERVANDO EXATAMENTE AS ESCOLHAS DO AGENTE
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
          
          processedSession.session_exercises = session.session_exercises.map((exerciseFromAI, exIndex) => {
            // BUSCAR EXATAMENTE O EXERCÍCIO ESCOLHIDO PELO AGENTE DE IA
            const foundExercise = validBatchExercises.find(ex => ex.id === exerciseFromAI.exercise_id);
            
            if (foundExercise) {
              console.log(`✅ Exercício EXATO do agente encontrado: ${foundExercise.name} - ID: ${foundExercise.id} - GIF: ${foundExercise.gif_url}`);
              
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
                sets: exerciseFromAI.sets || Math.min(Math.max(3, foundExercise.min_sets || 1), foundExercise.max_sets || 5),
                reps: exerciseFromAI.reps || Math.min(Math.max(12, foundExercise.min_reps || 1), foundExercise.max_reps || 20),
                rest_time_seconds: exerciseFromAI.rest_time_seconds || foundExercise.rest_time_seconds || 60,
                order_in_session: exerciseFromAI.order_in_session || (exIndex + 1),
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
              console.error(`❌ CRÍTICO: Exercício escolhido pelo agente NÃO encontrado: ${exerciseFromAI.exercise_id}`);
              console.error(`❌ Isso indica um problema grave na geração - o agente escolheu um exercício que não existe!`);
              
              // Como fallback, usar um exercício válido da mesma categoria se possível
              const fallbackExercise = validBatchExercises[exIndex % validBatchExercises.length];
              const recommendedWeight = determineRecommendedWeight(
                fallbackExercise, 
                preferences.activity_level, 
                preferences.weight,
                preferences.age,
                preferences.gender
              );
              
              console.log(`🔄 Usando exercício de fallback: ${fallbackExercise.name} - GIF: ${fallbackExercise.gif_url}`);
              
              return {
                id: crypto.randomUUID(),
                sets: exerciseFromAI.sets || 3,
                reps: exerciseFromAI.reps || 12,
                rest_time_seconds: exerciseFromAI.rest_time_seconds || 60,
                order_in_session: exerciseFromAI.order_in_session || (exIndex + 1),
                recommended_weight: recommendedWeight,
                exercise: {
                  id: fallbackExercise.id,
                  name: fallbackExercise.name,
                  description: fallbackExercise.description,
                  muscle_group: fallbackExercise.muscle_group,
                  exercise_type: fallbackExercise.exercise_type,
                  gif_url: fallbackExercise.gif_url
                }
              };
            }
          });
        }

        return processedSession;
      });
    }

    console.log('🎉 Plano de treino gerado com PRESERVAÇÃO das escolhas do agente!');
    console.log(`📊 Estatísticas do plano:`);
    console.log(`- Sessões: ${workoutPlan.workout_sessions.length}`);
    workoutPlan.workout_sessions.forEach((session, index) => {
      console.log(`- Dia ${index + 1}: ${session.session_exercises.length} exercícios EXATOS do agente com GIFs`);
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

async function generateWithXAI(preferences, validBatchExercises, exercisesByGroup) {
  console.log('🧠 Preparando prompt para Grok-2 com foco em ALTERNÂNCIA DE GRUPOS MUSCULARES...');
  
  const systemPrompt = `Você é o Trenner2025, um agente de IA especializado em educação física e criação de planos de treino personalizados. 
  Crie um plano de treino detalhado baseado nas preferências do usuário e nos exercícios disponíveis da pasta batch.
  IMPORTANTE: Responda SEMPRE em português do Brasil e retorne APENAS um JSON válido sem formatação markdown.
  Você deve criar planos científicos, seguros e eficazes usando APENAS exercícios com GIFs válidos da pasta batch.
  
  REGRAS CRÍTICAS PARA ALTERNÂNCIA DE GRUPOS MUSCULARES:
  - Crie EXATAMENTE ${preferences.days_per_week || 3} dias de treino
  - Cada dia deve ter entre 6-8 exercícios diferentes
  - OBRIGATÓRIO: Alterne entre diferentes grupos musculares em cada sessão
  - NUNCA coloque apenas exercícios de um grupo muscular em uma sessão
  - Distribua os exercícios de forma equilibrada: peito, costas, pernas, ombros, braços, core
  - Para treino de 3 dias: Dia 1 (peito+tríceps+ombros), Dia 2 (pernas+glúteos+core), Dia 3 (costas+bíceps+ombros)
  - Para treino de 4+ dias: distribua ainda mais os grupos musculares
  - Use SOMENTE IDs de exercícios que existem na lista fornecida (TODOS têm GIFs válidos)
  - NUNCA invente IDs de exercícios - use apenas os da lista
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
  
  EXERCÍCIOS DISPONÍVEIS POR GRUPO MUSCULAR (use APENAS estes IDs):
  
  PEITO (${exercisesByGroup.chest.length} exercícios):
  ${exercisesByGroup.chest.map((ex, index) => `${index + 1}. ID: "${ex.id}" - ${ex.name} (${ex.exercise_type})`).join('\n')}
  
  COSTAS (${exercisesByGroup.back.length} exercícios):
  ${exercisesByGroup.back.map((ex, index) => `${index + 1}. ID: "${ex.id}" - ${ex.name} (${ex.exercise_type})`).join('\n')}
  
  PERNAS (${exercisesByGroup.legs.length} exercícios):
  ${exercisesByGroup.legs.map((ex, index) => `${index + 1}. ID: "${ex.id}" - ${ex.name} (${ex.exercise_type})`).join('\n')}
  
  OMBROS (${exercisesByGroup.shoulders.length} exercícios):
  ${exercisesByGroup.shoulders.map((ex, index) => `${index + 1}. ID: "${ex.id}" - ${ex.name} (${ex.exercise_type})`).join('\n')}
  
  BRAÇOS (${exercisesByGroup.arms.length} exercícios):
  ${exercisesByGroup.arms.map((ex, index) => `${index + 1}. ID: "${ex.id}" - ${ex.name} (${ex.exercise_type})`).join('\n')}
  
  CORE (${exercisesByGroup.core.length} exercícios):
  ${exercisesByGroup.core.map((ex, index) => `${index + 1}. ID: "${ex.id}" - ${ex.name} (${ex.exercise_type})`).join('\n')}
  
  Retorne APENAS um JSON válido com esta estrutura exata:
  {
    "workout_sessions": [
      {
        "day_number": 1,
        "warmup_description": "Aquecimento dinâmico específico para o treino do dia",
        "cooldown_description": "Alongamento e relaxamento específico",
        "session_exercises": [
          {
            "exercise_id": "ID_REAL_E_EXATO_DA_LISTA_ACIMA",
            "sets": 3,
            "reps": 12,
            "rest_time_seconds": 60,
            "order_in_session": 1
          }
        ]
      }
    ]
  }
  
  CRITÉRIOS OBRIGATÓRIOS PARA ALTERNÂNCIA:
  - Use APENAS IDs de exercícios que existem na lista fornecida (copie exatamente como mostrado)!
  - Crie ${preferences.days_per_week || 3} dias de treino
  - Cada dia deve ter 6-8 exercícios diferentes DE GRUPOS MUSCULARES VARIADOS
  - ALTERNE os grupos musculares em cada sessão - NUNCA use apenas um grupo
  - Inclua order_in_session para cada exercício (1, 2, 3, etc.)
  - Distribua equilibradamente: peito, costas, pernas, ombros, braços, core
  - Respeite os limites de séries e repetições de cada exercício
  - NUNCA use IDs inventados - apenas os da lista acima
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
    
    // Verificar se cada sessão tem exercícios variados
    parsedPlan.workout_sessions.forEach((session, index) => {
      if (!session.session_exercises || !Array.isArray(session.session_exercises) || session.session_exercises.length === 0) {
        console.error(`❌ Sessão ${index + 1} sem exercícios`);
        throw new Error(`Sessão ${index + 1} sem exercícios`);
      }
      
      // Verificar variedade de grupos musculares
      const muscleGroups = new Set();
      session.session_exercises.forEach((exercise, exIndex) => {
        const exerciseExists = validBatchExercises.find(ex => ex.id === exercise.exercise_id);
        if (!exerciseExists) {
          console.error(`❌ ERRO: Exercício com ID ${exercise.exercise_id} não existe na lista de exercícios válidos!`);
          throw new Error(`Exercício com ID ${exercise.exercise_id} não encontrado na lista de exercícios válidos`);
        } else {
          muscleGroups.add(exerciseExists.muscle_group);
          console.log(`✅ Exercício validado: ${exerciseExists.name} (ID: ${exercise.exercise_id}, Grupo: ${exerciseExists.muscle_group})`);
        }
      });
      
      console.log(`✅ Sessão ${index + 1}: ${session.session_exercises.length} exercícios com ${muscleGroups.size} grupos musculares diferentes: ${Array.from(muscleGroups).join(', ')}`);
    });
    
    return parsedPlan;
  } catch (parseError) {
    console.error('❌ Erro ao fazer parse do JSON:', parseError);
    console.error('Conteúdo que falhou:', content);
    throw new Error(`Erro ao processar resposta da IA: ${parseError.message}`);
  }
}

function generateLocalPlan(preferences, validBatchExercises, exercisesByGroup) {
  console.log('🏠 Gerando plano localmente com ALTERNÂNCIA DE GRUPOS MUSCULARES...');
  
  const daysPerWeek = preferences.days_per_week || 3;
  const muscleGroups = ["chest", "back", "legs", "shoulders", "arms", "core"];
  
  // Verificar exercícios disponíveis por grupo
  const availableGroups = muscleGroups.filter(group => exercisesByGroup[group].length > 0);
  console.log(`💪 Grupos musculares disponíveis: ${availableGroups.join(', ')}`);
  
  const sessions = [];
  
  for (let day = 1; day <= daysPerWeek; day++) {
    const sessionExercises = [];
    let exerciseOrder = 1;
    
    // Definir estratégia de distribuição baseada no número de dias
    let targetGroups = [];
    if (daysPerWeek === 3) {
      // 3 dias: treino full body variado
      targetGroups = availableGroups.slice(); // Todos os grupos disponíveis
    } else if (daysPerWeek === 4) {
      // 4 dias: dividir upper/lower ou push/pull
      if (day % 2 === 1) {
        targetGroups = ["chest", "shoulders", "arms", "core"]; // Upper
      } else {
        targetGroups = ["legs", "back", "core"]; // Lower + back
      }
    } else {
      // 5+ dias: mais específico
      const groupRotation = [
        ["chest", "shoulders", "arms"],
        ["legs", "core"],
        ["back", "arms"],
        ["shoulders", "core"],
        ["legs", "back"]
      ];
      targetGroups = groupRotation[(day - 1) % groupRotation.length];
    }
    
    // Filtrar apenas grupos que têm exercícios disponíveis
    targetGroups = targetGroups.filter(group => exercisesByGroup[group] && exercisesByGroup[group].length > 0);
    
    console.log(`📅 Dia ${day}: Grupos alvos = ${targetGroups.join(', ')}`);
    
    // Distribuir exercícios pelos grupos selecionados
    const exercisesPerSession = Math.min(8, Math.max(6, 24 / daysPerWeek));
    const exercisesPerGroup = Math.max(1, Math.floor(exercisesPerSession / targetGroups.length));
    
    for (const group of targetGroups) {
      const groupExercises = exercisesByGroup[group];
      
      if (groupExercises && groupExercises.length > 0) {
        // Embaralhar exercícios do grupo
        const shuffled = [...groupExercises].sort(() => 0.5 - Math.random());
        
        // Selecionar exercícios para este grupo
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
          
          console.log(`✅ Exercício selecionado para o dia ${day}: ${exercise.name} (ID: ${exercise.id}, Grupo: ${exercise.muscle_group}) - GIF: ${exercise.gif_url}`);
        }
      }
    }
    
    // Se ainda precisamos de mais exercícios, pegar de qualquer grupo disponível (mantendo variedade)
    while (sessionExercises.length < exercisesPerSession && sessionExercises.length < validBatchExercises.length) {
      const remainingExercises = validBatchExercises.filter(ex => 
        !sessionExercises.some(se => se.exercise_id === ex.id)
      );
      
      if (remainingExercises.length === 0) break;
      
      // Priorizar exercícios de grupos que ainda não temos na sessão
      const usedGroups = new Set(sessionExercises.map(se => {
        const exercise = validBatchExercises.find(ex => ex.id === se.exercise_id);
        return exercise?.muscle_group;
      }));
      
      const preferredExercises = remainingExercises.filter(ex => !usedGroups.has(ex.muscle_group));
      const finalChoice = preferredExercises.length > 0 ? preferredExercises : remainingExercises;
      
      const randomExercise = finalChoice[Math.floor(Math.random() * finalChoice.length)];
      
      sessionExercises.push({
        exercise_id: randomExercise.id,
        sets: Math.max(randomExercise.min_sets || 3, 3),
        reps: Math.max(randomExercise.min_reps || 10, 10),
        rest_time_seconds: randomExercise.rest_time_seconds || 60,
        order_in_session: exerciseOrder++
      });
      
      console.log(`✅ Exercício adicional para variedade no dia ${day}: ${randomExercise.name} (ID: ${randomExercise.id}, Grupo: ${randomExercise.muscle_group}) - GIF: ${randomExercise.gif_url}`);
    }
    
    // Verificar variedade final da sessão
    const finalMuscleGroups = new Set(sessionExercises.map(se => {
      const exercise = validBatchExercises.find(ex => ex.id === se.exercise_id);
      return exercise?.muscle_group;
    }));
    
    console.log(`🎯 Dia ${day} final: ${sessionExercises.length} exercícios com ${finalMuscleGroups.size} grupos musculares: ${Array.from(finalMuscleGroups).join(', ')}`);
    
    sessions.push({
      day_number: day,
      warmup_description: `Aquecimento dinâmico de 5-10 minutos focado nos grupos musculares do Dia ${day}: ${Array.from(finalMuscleGroups).join(', ')}`,
      cooldown_description: `Alongamento específico de 5-10 minutos para os músculos trabalhados: ${Array.from(finalMuscleGroups).join(', ')}`,
      session_exercises: sessionExercises
    });
  }
  
  console.log(`🎯 Plano local gerado com ${sessions.length} sessões usando exercícios variados de múltiplos grupos musculares`);
  sessions.forEach((session, index) => {
    const muscleGroups = new Set(session.session_exercises.map(se => {
      const exercise = validBatchExercises.find(ex => ex.id === se.exercise_id);
      return exercise?.muscle_group;
    }));
    console.log(`📅 Dia ${index + 1}: ${session.session_exercises.length} exercícios de ${muscleGroups.size} grupos: ${Array.from(muscleGroups).join(', ')}`);
  });
  
  return { workout_sessions: sessions };
}
