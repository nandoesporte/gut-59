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
    
    console.log(`🤖 ${agentName || 'AI Agent'}: Iniciando geração INTELIGENTE do plano de treino`);
    console.log(`👤 Usuário: ${userId}`);
    console.log(`🔑 Request ID: ${requestId}`);
    console.log(`📋 Preferências:`, JSON.stringify(preferences, null, 2));

    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    // Buscar exercícios com GIFs válidos E histórico do usuário
    console.log('📚 Buscando exercícios com GIFs válidos e analisando histórico do usuário...');
    
    const [exercisesResponse, historyResponse] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/exercises?select=id,name,gif_url,description,muscle_group,equipment_needed,exercise_type,min_sets,max_sets,min_reps,max_reps,rest_time_seconds,beginner_weight,moderate_weight,advanced_weight,difficulty,goals,primary_muscles_worked,secondary_muscles_worked&gif_url=like.*%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fexercise-gifs%2Fbatch%2F*&limit=500`, 
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          }
        }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/workout_plans?select=id,created_at,workout_sessions(session_exercises(exercise_id))&user_id=eq.${userId}&order=created_at.desc&limit=3`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          }
        }
      )
    ]);
    
    if (!exercisesResponse.ok) {
      throw new Error(`Falha ao buscar exercícios: ${exercisesResponse.status}`);
    }

    const allExercises = await exercisesResponse.json();
    const userHistory = historyResponse.ok ? await historyResponse.json() : [];
    
    console.log(`📊 ${allExercises.length} exercícios encontrados`);
    console.log(`📈 ${userHistory.length} planos anteriores encontrados para análise`);
    
    // Extrair exercícios já utilizados recentemente
    const recentlyUsedExercises = new Set();
    userHistory.forEach(plan => {
      plan.workout_sessions?.forEach(session => {
        session.session_exercises?.forEach(se => {
          if (se.exercise_id) recentlyUsedExercises.add(se.exercise_id);
        });
      });
    });
    
    console.log(`🔄 ${recentlyUsedExercises.size} exercícios usados recentemente (serão priorizados para variação)`);
    
    // Validação e categorização inteligente dos exercícios
    const validBatchExercises = allExercises.filter(exercise => {
      const hasValidGif = exercise.gif_url && 
                         exercise.gif_url.includes('/storage/v1/object/public/exercise-gifs/batch/') &&
                         exercise.gif_url.trim().length > 50 &&
                         !exercise.gif_url.includes('placeholder') &&
                         !exercise.gif_url.includes('example') &&
                         !exercise.gif_url.includes('null') &&
                         !exercise.gif_url.includes('undefined');
      
      if (hasValidGif) {
        // Adicionar score de adequação baseado no perfil do usuário
        exercise.suitabilityScore = calculateSuitabilityScore(exercise, preferences, recentlyUsedExercises);
        console.log(`✅ Exercício válido: ${exercise.name} - Score: ${exercise.suitabilityScore} - Grupo: ${exercise.muscle_group}`);
      }
      return hasValidGif;
    });
    
    console.log(`🎯 ${validBatchExercises.length} exercícios válidos com scores de adequação`);
    
    if (validBatchExercises.length === 0) {
      throw new Error('Nenhum exercício com GIFs válidos encontrado');
    }

    // Categorizar exercícios por múltiplos critérios
    const exerciseCategories = categorizeExercisesIntelligently(validBatchExercises, preferences);
    
    Object.entries(exerciseCategories).forEach(([category, exercises]) => {
      console.log(`💪 Categoria ${category}: ${exercises.length} exercícios`);
    });

    let aiPlan;
    
    // Tentar usar xAI primeiro com prompt melhorado
    if (XAI_API_KEY) {
      console.log('🚀 Gerando plano inteligente com xAI Grok-2...');
      try {
        aiPlan = await generateIntelligentPlanWithXAI(preferences, validBatchExercises, exerciseCategories, recentlyUsedExercises);
        console.log('✅ Plano inteligente gerado com sucesso usando Grok-2');
      } catch (xaiError) {
        console.error('❌ Erro com Grok-2:', xaiError.message);
        console.log('🔄 Caindo para geração local inteligente...');
        aiPlan = generateIntelligentLocalPlan(preferences, validBatchExercises, exerciseCategories, recentlyUsedExercises);
      }
    } else {
      console.log('⚠️ XAI_API_KEY não encontrada, usando geração local inteligente');
      aiPlan = generateIntelligentLocalPlan(preferences, validBatchExercises, exerciseCategories, recentlyUsedExercises);
    }

    // Criar o plano completo preservando as escolhas otimizadas do agente
    console.log('🏗️ Construindo plano de treino final com exercícios OTIMIZADOS...');
    const workoutPlan = {
      id: crypto.randomUUID(),
      user_id: userId,
      goal: preferences.goal || 'maintain',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      workout_sessions: []
    };

    // Processar sessões com validação de variedade
    if (aiPlan.workout_sessions && Array.isArray(aiPlan.workout_sessions)) {
      console.log(`📅 Processando ${aiPlan.workout_sessions.length} sessões otimizadas...`);
      
      workoutPlan.workout_sessions = aiPlan.workout_sessions.map((session, sessionIndex) => {
        const processedSession = {
          id: crypto.randomUUID(),
          day_number: session.day_number || (sessionIndex + 1),
          warmup_description: session.warmup_description || "Aquecimento dinâmico de 5-10 minutos",
          cooldown_description: session.cooldown_description || "Alongamento e relaxamento de 5-10 minutos",
          session_exercises: []
        };

        if (session.session_exercises && Array.isArray(session.session_exercises)) {
          console.log(`💪 Processando ${session.session_exercises.length} exercícios OTIMIZADOS para o dia ${sessionIndex + 1}...`);
          
          const usedMuscleGroups = new Set();
          const usedExerciseTypes = new Set();
          
          processedSession.session_exercises = session.session_exercises.map((exerciseFromAI, exIndex) => {
            const foundExercise = validBatchExercises.find(ex => ex.id === exerciseFromAI.exercise_id);
            
            if (foundExercise) {
              usedMuscleGroups.add(foundExercise.muscle_group);
              usedExerciseTypes.add(foundExercise.exercise_type);
              
              console.log(`✅ Exercício OTIMIZADO selecionado: ${foundExercise.name} - Score: ${foundExercise.suitabilityScore} - Grupo: ${foundExercise.muscle_group}`);
              
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
              
              // Fallback inteligente baseado no contexto da sessão
              const contextualFallback = findContextualFallback(validBatchExercises, usedMuscleGroups, usedExerciseTypes);
              const recommendedWeight = determineRecommendedWeight(
                contextualFallback, 
                preferences.activity_level, 
                preferences.weight,
                preferences.age,
                preferences.gender
              );
              
              console.log(`🔄 Usando exercício de fallback contextual: ${contextualFallback.name}`);
              
              return {
                id: crypto.randomUUID(),
                sets: exerciseFromAI.sets || 3,
                reps: exerciseFromAI.reps || 12,
                rest_time_seconds: exerciseFromAI.rest_time_seconds || 60,
                order_in_session: exerciseFromAI.order_in_session || (exIndex + 1),
                recommended_weight: recommendedWeight,
                exercise: {
                  id: contextualFallback.id,
                  name: contextualFallback.name,
                  description: contextualFallback.description,
                  muscle_group: contextualFallback.muscle_group,
                  exercise_type: contextualFallback.exercise_type,
                  gif_url: contextualFallback.gif_url
                }
              };
            }
          });
          
          console.log(`🎯 Sessão ${sessionIndex + 1}: ${usedMuscleGroups.size} grupos musculares (${Array.from(usedMuscleGroups).join(', ')}) e ${usedExerciseTypes.size} tipos de exercício`);
        }

        return processedSession;
      });
    }

    console.log('🎉 Plano de treino OTIMIZADO e VARIADO gerado com sucesso!');
    console.log(`📊 Estatísticas do plano otimizado:`);
    console.log(`- Sessões: ${workoutPlan.workout_sessions.length}`);
    workoutPlan.workout_sessions.forEach((session, index) => {
      const uniqueGroups = new Set();
      session.session_exercises.forEach(se => uniqueGroups.add(se.exercise.muscle_group));
      console.log(`- Dia ${index + 1}: ${session.session_exercises.length} exercícios únicos com ${uniqueGroups.size} grupos musculares`);
    });
    
    return new Response(
      JSON.stringify(workoutPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro durante o processo otimizado:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar plano de treino otimizado',
        details: error instanceof Error ? error.stack : 'Stack trace não disponível'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function calculateSuitabilityScore(exercise, preferences, recentlyUsedExercises) {
  let score = 50; // Base score
  
  // Penalizar exercícios usados recentemente
  if (recentlyUsedExercises.has(exercise.id)) {
    score -= 30;
  }
  
  // Bonus por adequação ao objetivo
  if (exercise.goals && exercise.goals.includes(preferences.goal)) {
    score += 20;
  }
  
  // Bonus por adequação ao nível de atividade
  const activityLevelMap = {
    'sedentary': 'beginner',
    'light': 'beginner',
    'moderate': 'intermediate',
    'intense': 'advanced'
  };
  
  if (exercise.difficulty === activityLevelMap[preferences.activity_level]) {
    score += 15;
  }
  
  // Bonus por tipos de exercício preferidos
  if (preferences.preferred_exercise_types && preferences.preferred_exercise_types.includes(exercise.exercise_type)) {
    score += 10;
  }
  
  // Penalizar se não tem equipamento necessário (se especificado)
  if (preferences.available_equipment && exercise.equipment_needed) {
    const hasRequiredEquipment = exercise.equipment_needed.some(eq => 
      preferences.available_equipment.includes(eq) || eq === 'bodyweight'
    );
    if (!hasRequiredEquipment) {
      score -= 25;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

function categorizeExercisesIntelligently(exercises, preferences) {
  const categories = {
    byMuscleGroup: {},
    byDifficulty: {},
    byType: {},
    byGoal: {},
    highSuitability: [],
    mediumSuitability: [],
    lowSuitability: []
  };
  
  exercises.forEach(exercise => {
    // Por grupo muscular
    if (!categories.byMuscleGroup[exercise.muscle_group]) {
      categories.byMuscleGroup[exercise.muscle_group] = [];
    }
    categories.byMuscleGroup[exercise.muscle_group].push(exercise);
    
    // Por dificuldade
    if (!categories.byDifficulty[exercise.difficulty]) {
      categories.byDifficulty[exercise.difficulty] = [];
    }
    categories.byDifficulty[exercise.difficulty].push(exercise);
    
    // Por tipo
    if (!categories.byType[exercise.exercise_type]) {
      categories.byType[exercise.exercise_type] = [];
    }
    categories.byType[exercise.exercise_type].push(exercise);
    
    // Por adequação
    if (exercise.suitabilityScore >= 70) {
      categories.highSuitability.push(exercise);
    } else if (exercise.suitabilityScore >= 40) {
      categories.mediumSuitability.push(exercise);
    } else {
      categories.lowSuitability.push(exercise);
    }
  });
  
  return categories;
}

async function generateIntelligentPlanWithXAI(preferences, validBatchExercises, exerciseCategories, recentlyUsedExercises) {
  console.log('🧠 Preparando prompt INTELIGENTE para Grok-2...');
  
  // Selecionar os melhores exercícios para cada grupo muscular
  const bestExercisesByGroup = {};
  Object.entries(exerciseCategories.byMuscleGroup).forEach(([group, exercises]) => {
    bestExercisesByGroup[group] = exercises
      .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
      .slice(0, 8); // Top 8 exercícios por grupo
  });
  
  const systemPrompt = `Você é o Trenner2025 AVANÇADO, um agente de IA especializado em criar planos de treino ÚNICOS e PERSONALIZADOS.

MISSÃO CRÍTICA: Criar um plano de treino COMPLETAMENTE DIFERENTE dos anteriores, com máxima variedade e adequação ao perfil do usuário.

REGRAS FUNDAMENTAIS:
- PRIORIZE exercícios com SCORES DE ADEQUAÇÃO mais altos
- EVITE exercícios usados recentemente (scores baixos)
- GARANTA máxima VARIEDADE entre grupos musculares
- ADAPTE intensidade ao nível de condicionamento
- Responda APENAS em português do Brasil
- Retorne APENAS JSON válido sem formatação markdown

ANÁLISE DO PERFIL DO USUÁRIO:
- Nível: ${preferences.activity_level} 
- Objetivo: ${preferences.goal}
- Exercícios já usados recentemente: ${recentlyUsedExercises.size} (a serem evitados)
- Exercícios de alta adequação disponíveis: ${exerciseCategories.highSuitability.length}`;

  const userPrompt = `
CRIE UM PLANO DE TREINO ÚNICO E OTIMIZADO:

Preferências do usuário:
- Objetivo: ${preferences.goal}
- Nível: ${preferences.activity_level}
- Dias por semana: ${preferences.days_per_week || 3}
- Tipos preferidos: ${preferences.preferred_exercise_types?.join(', ') || 'todos'}
- Idade: ${preferences.age} | Peso: ${preferences.weight}kg | Gênero: ${preferences.gender}

EXERCÍCIOS RECOMENDADOS POR GRUPO (ordenados por adequação):

${Object.entries(bestExercisesByGroup).map(([group, exercises]) => 
  `${group.toUpperCase()} (${exercises.length} opções):
${exercises.map((ex, i) => 
  `${i + 1}. ID: "${ex.id}" - ${ex.name} [Score: ${ex.suitabilityScore}] (${ex.exercise_type}, ${ex.difficulty})`
).join('\n')}`
).join('\n\n')}

INSTRUÇÕES CRÍTICAS:
1. PRIORIZE exercícios com scores 70+ (alta adequação)
2. DISTRIBUA uniformemente entre todos os grupos musculares
3. VARIE tipos de exercício (strength, cardio, flexibility)
4. EVITE exercícios com scores baixos (já usados recentemente)
5. Crie ${preferences.days_per_week || 3} dias com 6-8 exercícios cada
6. GARANTA que cada sessão tenha pelo menos 4 grupos musculares diferentes

Retorne JSON com esta estrutura:
{
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "Aquecimento específico e personalizado",
      "cooldown_description": "Relaxamento adequado ao treino",
      "session_exercises": [
        {
          "exercise_id": "ID_EXATO_DA_LISTA_ACIMA",
          "sets": 3,
          "reps": 12,
          "rest_time_seconds": 60,
          "order_in_session": 1
        }
      ]
    }
  ]
}

FOQUE EM: Variedade máxima + Adequação ao perfil + Exercícios únicos/diferentes
`;

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
      temperature: 0.8, // Aumentar criatividade para mais variedade
      max_tokens: 8000,
      stream: false
    }),
  });

  if (!xaiResponse.ok) {
    const errorText = await xaiResponse.text();
    throw new Error(`Erro da API xAI: ${xaiResponse.status} - ${errorText}`);
  }

  const xaiData = await xaiResponse.json();
  const content = xaiData.choices[0]?.message?.content;

  if (!content) {
    throw new Error('Nenhum conteúdo retornado pela API xAI');
  }

  try {
    const cleanContent = content.replace(/```json|```/g, '').trim();
    const parsedPlan = JSON.parse(cleanContent);
    
    if (!parsedPlan.workout_sessions || !Array.isArray(parsedPlan.workout_sessions)) {
      throw new Error('Plano inválido: sem sessões de treino');
    }
    
    // Validar variedade e adequação
    parsedPlan.workout_sessions.forEach((session, index) => {
      if (!session.session_exercises || session.session_exercises.length === 0) {
        throw new Error(`Sessão ${index + 1} sem exercícios`);
      }
      
      const muscleGroups = new Set();
      let totalScore = 0;
      
      session.session_exercises.forEach((exercise) => {
        const exerciseExists = validBatchExercises.find(ex => ex.id === exercise.exercise_id);
        if (!exerciseExists) {
          throw new Error(`Exercício com ID ${exercise.exercise_id} não encontrado`);
        }
        
        muscleGroups.add(exerciseExists.muscle_group);
        totalScore += exerciseExists.suitabilityScore;
      });
      
      const avgScore = totalScore / session.session_exercises.length;
      console.log(`✅ Sessão ${index + 1}: ${session.session_exercises.length} exercícios, ${muscleGroups.size} grupos, score médio: ${avgScore.toFixed(1)}`);
    });
    
    return parsedPlan;
  } catch (parseError) {
    throw new Error(`Erro ao processar resposta da IA: ${parseError.message}`);
  }
}

function generateIntelligentLocalPlan(preferences, validBatchExercises, exerciseCategories, recentlyUsedExercises) {
  console.log('🏠 Gerando plano local INTELIGENTE...');
  
  const daysPerWeek = preferences.days_per_week || 3;
  const sessions = [];
  
  // Criar pool de exercícios priorizados
  const prioritizedExercises = [...exerciseCategories.highSuitability, ...exerciseCategories.mediumSuitability]
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  
  console.log(`🎯 Pool de exercícios priorizados: ${prioritizedExercises.length} exercícios`);
  
  const usedExerciseIds = new Set();
  
  for (let day = 1; day <= daysPerWeek; day++) {
    const sessionExercises = [];
    const exercisesPerSession = Math.min(8, Math.max(6, 24 / daysPerWeek));
    
    // Definir grupos alvo para variedade
    const allGroups = Object.keys(exerciseCategories.byMuscleGroup);
    const targetGroups = shuffleArray([...allGroups]).slice(0, Math.min(6, allGroups.length));
    
    console.log(`📅 Dia ${day}: Grupos alvos = ${targetGroups.join(', ')}`);
    
    // Selecionar exercícios únicos e variados
    for (const group of targetGroups) {
      if (sessionExercises.length >= exercisesPerSession) break;
      
      const groupExercises = exerciseCategories.byMuscleGroup[group]
        .filter(ex => !usedExerciseIds.has(ex.id))
        .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
      
      if (groupExercises.length > 0) {
        const selectedExercise = groupExercises[0];
        usedExerciseIds.add(selectedExercise.id);
        
        sessionExercises.push({
          exercise_id: selectedExercise.id,
          sets: Math.max(selectedExercise.min_sets || 3, 3),
          reps: Math.max(selectedExercise.min_reps || 10, 10),
          rest_time_seconds: selectedExercise.rest_time_seconds || 60,
          order_in_session: sessionExercises.length + 1
        });
        
        console.log(`✅ Selecionado para dia ${day}: ${selectedExercise.name} (Score: ${selectedExercise.suitabilityScore})`);
      }
    }
    
    // Preencher com exercícios adicionais se necessário
    while (sessionExercises.length < exercisesPerSession) {
      const availableExercises = prioritizedExercises.filter(ex => !usedExerciseIds.has(ex.id));
      if (availableExercises.length === 0) break;
      
      const selectedExercise = availableExercises[0];
      usedExerciseIds.add(selectedExercise.id);
      
      sessionExercises.push({
        exercise_id: selectedExercise.id,
        sets: Math.max(selectedExercise.min_sets || 3, 3),
        reps: Math.max(selectedExercise.min_reps || 10, 10),
        rest_time_seconds: selectedExercise.rest_time_seconds || 60,
        order_in_session: sessionExercises.length + 1
      });
    }
    
    sessions.push({
      day_number: day,
      warmup_description: `Aquecimento dinâmico personalizado para o Dia ${day}`,
      cooldown_description: `Alongamento específico para músculos trabalhados no Dia ${day}`,
      session_exercises: sessionExercises
    });
  }
  
  console.log(`🎯 Plano local inteligente gerado: ${sessions.length} sessões com exercícios únicos`);
  return { workout_sessions: sessions };
}

function findContextualFallback(validBatchExercises, usedMuscleGroups, usedExerciseTypes) {
  // Tentar encontrar exercício de grupo muscular não usado
  const unusedGroupExercises = validBatchExercises.filter(ex => 
    !usedMuscleGroups.has(ex.muscle_group)
  );
  
  if (unusedGroupExercises.length > 0) {
    return unusedGroupExercises.sort((a, b) => b.suitabilityScore - a.suitabilityScore)[0];
  }
  
  // Fallback para exercício com maior score
  return validBatchExercises.sort((a, b) => b.suitabilityScore - a.suitabilityScore)[0];
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function determineRecommendedWeight(exercise, activityLevel, userWeight, userAge, userGender) {
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

  const baseWeight = userWeight || 70;
  const isStrength = exercise.exercise_type === 'strength';
  
  if (!isStrength) {
    return "Peso corporal";
  }

  let weightPercentage = 0.3;
  
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

  if (userAge > 50) {
    weightPercentage *= 0.8;
  } else if (userAge > 35) {
    weightPercentage *= 0.9;
  }

  switch (exercise.muscle_group) {
    case 'legs':
      weightPercentage *= 1.5;
      break;
    case 'back':
      weightPercentage *= 1.2;
      break;
    case 'chest':
      weightPercentage *= 1.1;
      break;
    case 'shoulders':
    case 'arms':
      weightPercentage *= 0.8;
      break;
  }

  const recommendedKg = Math.round(baseWeight * weightPercentage);
  return `${recommendedKg}kg`;
}
