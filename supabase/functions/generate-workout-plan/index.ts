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
      .slice(0, 10); // Top 10 exercícios por grupo
  });
  
  // Exercícios específicos para tríceps e bíceps
  const armExercises = bestExercisesByGroup.arms || [];
  const tricepsExercises = armExercises.filter(ex => 
    ex.primary_muscles_worked?.includes('triceps') || 
    ex.secondary_muscles_worked?.includes('triceps') ||
    ex.name.toLowerCase().includes('tricep') ||
    ex.name.toLowerCase().includes('trícep')
  );
  
  const bicepsExercises = armExercises.filter(ex => 
    ex.primary_muscles_worked?.includes('biceps') || 
    ex.secondary_muscles_worked?.includes('biceps') ||
    ex.name.toLowerCase().includes('bicep') ||
    ex.name.toLowerCase().includes('bícep') ||
    ex.name.toLowerCase().includes('rosca')
  );
  
  // Exercícios específicos para panturrilha
  const legExercises = bestExercisesByGroup.legs || [];
  const calfExercises = legExercises.filter(ex => 
    ex.primary_muscles_worked?.includes('calves') || 
    ex.secondary_muscles_worked?.includes('calves') ||
    ex.name.toLowerCase().includes('panturrilha') ||
    ex.name.toLowerCase().includes('levantamento de panturrilha')
  );
  
  const systemPrompt = `Você é o Trenner2025 AVANÇADO, especialista em criar planos de treino ÚNICOS e PERSONALIZADOS.

MISSÃO CRÍTICA: Criar um plano de treino com COBERTURA COMPLETA dos grupos musculares obrigatórios.

GRUPOS MUSCULARES OBRIGATÓRIOS (DEVE INCLUIR TODOS):
1. COSTAS - obrigatório em todos os treinos
2. PERNAS - obrigatório em todos os treinos  
3. PEITO - obrigatório em todos os treinos
4. TRÍCEPS - obrigatório (braços posteriores)
5. BÍCEPS - obrigatório (braços anteriores)
6. PANTURRILHA - incluir pelo menos uma vez
7. GLÚTEOS - incluir se houver exercícios disponíveis

REGRAS FUNDAMENTAIS:
- PRIORIZE exercícios com SCORES DE ADEQUAÇÃO mais altos
- EVITE exercícios usados recentemente (scores baixos)
- GARANTA que CADA SESSÃO tenha pelo menos 5 grupos musculares diferentes
- ADAPTE intensidade ao nível de condicionamento
- Responda APENAS em português do Brasil
- Retorne APENAS JSON válido sem formatação markdown

ANÁLISE DO PERFIL:
- Nível: ${preferences.activity_level} 
- Objetivo: ${preferences.goal}
- Exercícios já usados: ${recentlyUsedExercises.size} (evitar)
- Exercícios de alta adequação: ${exerciseCategories.highSuitability.length}`;

  const userPrompt = `
CRIE UM PLANO DE TREINO COM COBERTURA MUSCULAR COMPLETA:

Preferências:
- Objetivo: ${preferences.goal}
- Nível: ${preferences.activity_level}
- Dias por semana: ${preferences.days_per_week || 3}
- Idade: ${preferences.age} | Peso: ${preferences.weight}kg

EXERCÍCIOS DISPONÍVEIS POR GRUPO (ordenados por adequação):

COSTAS (${bestExercisesByGroup.back?.length || 0} opções):
${(bestExercisesByGroup.back || []).slice(0, 5).map((ex, i) => 
  `${i + 1}. ID: "${ex.id}" - ${ex.name} [Score: ${ex.suitabilityScore}]`
).join('\n')}

PEITO (${bestExercisesByGroup.chest?.length || 0} opções):
${(bestExercisesByGroup.chest || []).slice(0, 5).map((ex, i) => 
  `${i + 1}. ID: "${ex.id}" - ${ex.name} [Score: ${ex.suitabilityScore}]`
).join('\n')}

PERNAS (${bestExercisesByGroup.legs?.length || 0} opções):
${(bestExercisesByGroup.legs || []).slice(0, 5).map((ex, i) => 
  `${i + 1}. ID: "${ex.id}" - ${ex.name} [Score: ${ex.suitabilityScore}]`
).join('\n')}

TRÍCEPS (${tricepsExercises.length} opções):
${tricepsExercises.slice(0, 3).map((ex, i) => 
  `${i + 1}. ID: "${ex.id}" - ${ex.name} [Score: ${ex.suitabilityScore}]`
).join('\n')}

BÍCEPS (${bicepsExercises.length} opções):
${bicepsExercises.slice(0, 3).map((ex, i) => 
  `${i + 1}. ID: "${ex.id}" - ${ex.name} [Score: ${ex.suitabilityScore}]`
).join('\n')}

PANTURRILHA (${calfExercises.length} opções):
${calfExercises.slice(0, 3).map((ex, i) => 
  `${i + 1}. ID: "${ex.id}" - ${ex.name} [Score: ${ex.suitabilityScore}]`
).join('\n')}

OMBROS (${bestExercisesByGroup.shoulders?.length || 0} opções):
${(bestExercisesByGroup.shoulders || []).slice(0, 3).map((ex, i) => 
  `${i + 1}. ID: "${ex.id}" - ${ex.name} [Score: ${ex.suitabilityScore}]`
).join('\n')}

INSTRUÇÕES CRÍTICAS:
1. CADA DIA deve ter exercícios de COSTAS, PERNAS, PEITO
2. CADA DIA deve ter pelo menos UM exercício de TRÍCEPS e UM de BÍCEPS
3. INCLUIR exercícios de PANTURRILHA em pelo menos um dia
4. PRIORIZAR exercícios com scores 70+
5. Criar ${preferences.days_per_week || 3} dias com 6-8 exercícios cada
6. VARIAR os exercícios entre os dias (não repetir)

Retorne JSON:
{
  "workout_sessions": [
    {
      "day_number": 1,
      "warmup_description": "Aquecimento dinâmico específico",
      "cooldown_description": "Relaxamento focado nos músculos trabalhados",
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

FOQUE EM: Cobertura completa + Variedade + Adequação ao perfil
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
      temperature: 0.9, // Aumentar criatividade para mais variedade
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
    
    // Validar cobertura muscular
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
      
      // Verificar se tem grupos obrigatórios
      const hasBack = Array.from(muscleGroups).includes('back');
      const hasLegs = Array.from(muscleGroups).includes('legs');
      const hasChest = Array.from(muscleGroups).includes('chest');
      
      console.log(`🎯 Sessão ${index + 1} - Costas: ${hasBack}, Pernas: ${hasLegs}, Peito: ${hasChest}`);
    });
    
    return parsedPlan;
  } catch (parseError) {
    throw new Error(`Erro ao processar resposta da IA: ${parseError.message}`);
  }
}

function generateIntelligentLocalPlan(preferences, validBatchExercises, exerciseCategories, recentlyUsedExercises) {
  console.log('🏠 Gerando plano local INTELIGENTE com cobertura completa...');
  
  const daysPerWeek = preferences.days_per_week || 3;
  const sessions = [];
  
  // Grupos musculares obrigatórios
  const requiredMuscleGroups = ['back', 'legs', 'arms', 'glutes', 'chest'];
  
  // Mapear exercícios por grupo muscular específico
  const exercisesBySpecificMuscle = {
    back: validBatchExercises.filter(ex => ex.muscle_group === 'back'),
    legs: validBatchExercises.filter(ex => ex.muscle_group === 'legs'),
    chest: validBatchExercises.filter(ex => ex.muscle_group === 'chest'),
    arms: validBatchExercises.filter(ex => ex.muscle_group === 'arms'),
    glutes: validBatchExercises.filter(ex => ex.muscle_group === 'glutes'),
    shoulders: validBatchExercises.filter(ex => ex.muscle_group === 'shoulders')
  };
  
  // Separar exercícios de braços por músculos específicos
  const armExercises = exercisesBySpecificMuscle.arms;
  const tricepsExercises = armExercises.filter(ex => 
    ex.primary_muscles_worked?.includes('triceps') || 
    ex.secondary_muscles_worked?.includes('triceps') ||
    ex.name.toLowerCase().includes('tricep') ||
    ex.name.toLowerCase().includes('trícep')
  );
  
  const bicepsExercises = armExercises.filter(ex => 
    ex.primary_muscles_worked?.includes('biceps') || 
    ex.secondary_muscles_worked?.includes('biceps') ||
    ex.name.toLowerCase().includes('bicep') ||
    ex.name.toLowerCase().includes('bícep') ||
    ex.name.toLowerCase().includes('rosca')
  );
  
  // Separar exercícios de pernas por músculos específicos
  const legExercises = exercisesBySpecificMuscle.legs;
  const calfExercises = legExercises.filter(ex => 
    ex.primary_muscles_worked?.includes('calves') || 
    ex.secondary_muscles_worked?.includes('calves') ||
    ex.name.toLowerCase().includes('panturrilha') ||
    ex.name.toLowerCase().includes('levantamento de panturrilha')
  );
  
  console.log(`🎯 Exercícios disponíveis por grupo:`);
  console.log(`- Costas: ${exercisesBySpecificMuscle.back.length}`);
  console.log(`- Pernas: ${exercisesBySpecificMuscle.legs.length}`);
  console.log(`- Peito: ${exercisesBySpecificMuscle.chest.length}`);
  console.log(`- Tríceps: ${tricepsExercises.length}`);
  console.log(`- Bíceps: ${bicepsExercises.length}`);
  console.log(`- Panturrilha: ${calfExercises.length}`);
  console.log(`- Glúteos: ${exercisesBySpecificMuscle.glutes.length}`);
  
  const usedExerciseIds = new Set();
  
  for (let day = 1; day <= daysPerWeek; day++) {
    const sessionExercises = [];
    const exercisesPerSession = Math.min(8, Math.max(6, 28 / daysPerWeek));
    
    console.log(`📅 Dia ${day}: Planejando ${exercisesPerSession} exercícios`);
    
    // Garantir pelo menos um exercício de cada grupo muscular obrigatório
    const targetMuscleGroups = [
      { group: 'back', exercises: exercisesBySpecificMuscle.back, name: 'Costas' },
      { group: 'chest', exercises: exercisesBySpecificMuscle.chest, name: 'Peito' },
      { group: 'legs', exercises: exercisesBySpecificMuscle.legs, name: 'Pernas' },
      { group: 'triceps', exercises: tricepsExercises, name: 'Tríceps' },
      { group: 'biceps', exercises: bicepsExercises, name: 'Bíceps' }
    ];
    
    // Se for o primeiro ou último dia, incluir panturrilha
    if (day === 1 || day === daysPerWeek) {
      targetMuscleGroups.push({ group: 'calves', exercises: calfExercises, name: 'Panturrilha' });
    }
    
    // Se tiver espaço e exercícios de glúteos, incluir
    if (exercisesBySpecificMuscle.glutes.length > 0 && targetMuscleGroups.length < exercisesPerSession) {
      targetMuscleGroups.push({ group: 'glutes', exercises: exercisesBySpecificMuscle.glutes, name: 'Glúteos' });
    }
    
    // Selecionar exercícios para cada grupo alvo
    for (const { group, exercises, name } of targetMuscleGroups) {
      if (sessionExercises.length >= exercisesPerSession) break;
      
      const availableExercises = exercises
        .filter(ex => !usedExerciseIds.has(ex.id))
        .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
      
      if (availableExercises.length > 0) {
        const selectedExercise = availableExercises[0];
        usedExerciseIds.add(selectedExercise.id);
        
        sessionExercises.push({
          exercise_id: selectedExercise.id,
          sets: Math.max(selectedExercise.min_sets || 3, 3),
          reps: Math.max(selectedExercise.min_reps || 10, 10),
          rest_time_seconds: selectedExercise.rest_time_seconds || 60,
          order_in_session: sessionExercises.length + 1
        });
        
        console.log(`✅ ${name}: ${selectedExercise.name} (Score: ${selectedExercise.suitabilityScore})`);
      } else {
        console.log(`⚠️ Não há exercícios disponíveis para ${name}`);
      }
    }
    
    // Preencher com exercícios adicionais se necessário, priorizando variedade
    while (sessionExercises.length < exercisesPerSession) {
      const availableExercises = validBatchExercises
        .filter(ex => !usedExerciseIds.has(ex.id))
        .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
      
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
      
      console.log(`➕ Adicional: ${selectedExercise.name} (${selectedExercise.muscle_group})`);
    }
    
    sessions.push({
      day_number: day,
      warmup_description: `Aquecimento dinâmico personalizado para o Dia ${day} - foco em mobilidade`,
      cooldown_description: `Alongamento específico para músculos trabalhados no Dia ${day}`,
      session_exercises: sessionExercises
    });
    
    console.log(`🎯 Dia ${day} finalizado: ${sessionExercises.length} exercícios únicos`);
  }
  
  console.log(`🎯 Plano local inteligente gerado: ${sessions.length} sessões com cobertura completa`);
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
