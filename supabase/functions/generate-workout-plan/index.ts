import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    const { preferences, userId } = await req.json()

    console.log('Preferências recebidas:', preferences)
    console.log('ID do usuário:', userId)

    // Buscar exercícios disponíveis no Supabase
    const { data: availableExercises, error: exercisesError } = await supabaseClient
      .from('exercises')
      .select('*')

    if (exercisesError) {
      console.error('Erro ao buscar exercícios:', exercisesError)
      throw new Error('Falha ao buscar exercícios disponíveis')
    }

    // Analisar as preferências do usuário usando IA
    const analysis = await analyzeUserPreferences(preferences, availableExercises)
    console.log('Análise das preferências do usuário:', analysis)

    // Gerar plano de treino personalizado
    const workoutPlan = await generatePersonalizedPlan(availableExercises, analysis, preferences)
    console.log('Plano de treino gerado:', workoutPlan)

    // Salvar o plano de treino no Supabase
    const { data: savedPlan, error: saveError } = await supabaseClient
      .from('workout_plans')
      .insert({
        ...workoutPlan,
        user_id: userId
      })
      .select()
      .single()

    if (saveError) {
      console.error('Erro ao salvar plano de treino:', saveError)
      throw new Error('Falha ao salvar plano de treino')
    }

    console.log('Plano de treino salvo:', savedPlan)

    return new Response(JSON.stringify(savedPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro na função Edge:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function analyzeUserPreferences(preferences: any, availableExercises: any[]) {
  console.log('Iniciando análise das preferências do usuário')
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em educação física e prescrição de exercícios.
                     Para cada exercício, você deve fornecer recomendações de peso/carga adequadas 
                     para diferentes níveis (iniciante, intermediário e avançado), levando em consideração
                     o perfil do usuário, objetivo e tipo de exercício.`
          },
          {
            role: 'user',
            content: `Analise os seguintes dados e forneça recomendações específicas
                     incluindo sugestões de peso/carga para cada nível:
                     
                     Idade: ${preferences.age}
                     Peso: ${preferences.weight}kg
                     Altura: ${preferences.height}cm
                     Gênero: ${preferences.gender}
                     Objetivo: ${preferences.goal}
                     Nível de atividade: ${preferences.activity_level}
                     Local de treino: ${preferences.training_location}
                     Tipos de exercício preferidos: ${preferences.preferred_exercise_types.join(', ')}
                     Equipamentos disponíveis: ${preferences.available_equipment.join(', ')}
                     ${preferences.health_conditions ? `Condições de saúde: ${preferences.health_conditions.join(', ')}` : 'Sem condições de saúde reportadas'}
                     
                     Exercícios disponíveis: ${availableExercises.map(e => e.name).join(', ')}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    })

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('Erro na análise de IA:', error)
    throw new Error('Falha ao analisar preferências do usuário')
  }
}

async function generatePersonalizedPlan(exercises: any[], analysis: string, preferences: any) {
  // Determinar nível do usuário baseado na atividade
  const userLevel = determineUserLevel(preferences.activity_level);
  
  // Gerar plano base
  const workoutPlan = {
    user_fitness_level: userLevel,
    goal: preferences.goal,
    start_date: new Date().toISOString(),
    end_date: getEndDate(30),
    workout_sessions: []
  };

  // Gerar recomendações de peso para cada exercício
  const weightRecommendations = await generateWeightRecommendations(exercises, preferences);

  // Gerar sessões de treino
  const sessions = generateWorkoutSessions(exercises, preferences);
  
  // Adicionar recomendações de peso aos exercícios
  workoutPlan.workout_sessions = sessions.map(session => ({
    ...session,
    exercises: session.exercises.map(exercise => ({
      ...exercise,
      weight_recommendation: weightRecommendations[exercise.name] || {
        beginner: "Peso corporal ou carga leve",
        intermediate: "Carga moderada",
        advanced: "Carga pesada"
      }
    }))
  }));

  return workoutPlan;
}

async function generateWeightRecommendations(exercises: any[], preferences: any) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Como especialista em educação física, forneça recomendações detalhadas 
                     de peso/carga para cada exercício, considerando diferentes níveis de experiência.
                     Forneça valores específicos quando possível (ex: "15-20kg") ou descrições claras
                     (ex: "40-50% do peso corporal").`
          },
          {
            role: 'user',
            content: `Forneça recomendações de peso/carga para os seguintes exercícios,
                     considerando o perfil do usuário:
                     
                     Perfil:
                     Idade: ${preferences.age}
                     Peso: ${preferences.weight}kg
                     Gênero: ${preferences.gender}
                     Nível: ${preferences.activity_level}
                     
                     Exercícios:
                     ${exercises.map(e => e.name).join('\n')}
                     
                     Para cada exercício, forneça recomendações para:
                     - Iniciante
                     - Intermediário
                     - Avançado`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const data = await response.json();
    const recommendations = parseWeightRecommendations(data.choices[0].message.content);
    return recommendations;
  } catch (error) {
    console.error('Erro ao gerar recomendações de peso:', error);
    return {};
  }
}

function parseWeightRecommendations(content: string) {
  // Implementação básica do parser - pode ser melhorada para uma análise mais robusta
  const recommendations: Record<string, any> = {};
  const exercises = content.split('\n\n');
  
  exercises.forEach(block => {
    const lines = block.split('\n');
    const exerciseName = lines[0].replace(':', '').trim();
    
    if (exerciseName) {
      recommendations[exerciseName] = {
        beginner: lines.find(l => l.toLowerCase().includes('iniciante'))?.split(':')[1]?.trim() || 'Peso corporal',
        intermediate: lines.find(l => l.toLowerCase().includes('intermediário'))?.split(':')[1]?.trim() || 'Carga moderada',
        advanced: lines.find(l => l.toLowerCase().includes('avançado'))?.split(':')[1]?.trim() || 'Carga pesada'
      };
    }
  });
  
  return recommendations;
}

function determineUserLevel(activityLevel: string) {
  switch (activityLevel.toLowerCase()) {
    case 'sedentary':
    case 'light':
      return 'beginner';
    case 'moderate':
      return 'intermediate';
    case 'intense':
      return 'advanced';
    default:
      return 'beginner';
  }
}

function generateWorkoutSessions(exercises: any[], preferences: any) {
  const numberOfDays = 3 // Definir para 3 dias por semana
  const sessions = []

  for (let day = 1; day <= numberOfDays; day++) {
    // Filtrar exercícios com base no tipo preferido
    const preferredExercises = exercises.filter(exercise =>
      preferences.preferred_exercise_types.includes(exercise.type)
    )

    // Selecionar aleatoriamente 3-4 exercícios para cada sessão
    const selectedExercises = []
    const numberOfExercises = Math.floor(Math.random() * 2) + 3 // 3 ou 4 exercícios
    for (let i = 0; i < numberOfExercises; i++) {
      if (preferredExercises.length > 0) {
        const randomIndex = Math.floor(Math.random() * preferredExercises.length)
        selectedExercises.push(preferredExercises[randomIndex])
        preferredExercises.splice(randomIndex, 1) // Remover para evitar duplicação
      }
    }

    // Criar detalhes da sessão
    sessions.push({
      day_number: day,
      warmup_description: '5 minutos de aquecimento leve, como polichinelos e alongamentos dinâmicos',
      cooldown_description: '5 minutos de alongamentos estáticos, focando nos músculos trabalhados',
      exercises: selectedExercises.map(exercise => ({
        name: exercise.name,
        sets: 3,
        reps: 10,
        rest_time_seconds: 60,
        gifUrl: exercise.gif_url,
        notes: exercise.description
      }))
    })
  }

  return sessions
}

function getEndDate(days: number) {
  const today = new Date()
  const endDate = new Date(today.setDate(today.getDate() + days))
  return endDate.toISOString()
}
